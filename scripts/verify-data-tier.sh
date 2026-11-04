#!/usr/bin/env bash
# Verify the data tier and edge of a running production-profile Compose stack:
#   - db streams to db-replica, and WAL archiving is on;
#   - report queries run on the replica, fall back to the primary while it is stopped, and return
#     to the replica afterwards;
#   - nginx rate-limits a public client's sign-in attempts with a 429 problem response, while
#     private (internal) traffic is not limited.
# Usage: SERMS_VERIFY_EMAIL=<admin> SERMS_VERIFY_PASSWORD=... SERMS_DB_USER=... SERMS_DB_NAME=... scripts/verify-data-tier.sh
set -euo pipefail
: "${SERMS_VERIFY_EMAIL:?}" "${SERMS_VERIFY_PASSWORD:?}" "${SERMS_DB_USER:?}" "${SERMS_DB_NAME:?}"
BASE="http://127.0.0.1:${HOST_PORT:-8789}/api/v1"
WORK=$(mktemp -d); trap 'rm -rf "$WORK"' EXIT
pass() { echo "PASS $*"; }
fail() { echo "FAIL $*" >&2; exit 1; }
sql() { docker compose exec -T "$1" psql -tA -U "$SERMS_DB_USER" -d "$SERMS_DB_NAME" -c "$2"; }
cookie() { sed -n "s/^Set-Cookie: $1=\([^;]*\).*/\1/Ip" "$2" | tail -1; }
in_use() { # 1 when every app replica routes reports to the read replica
  local all=1 id v
  for id in $(docker compose ps -q app); do
    v=$(docker exec "$id" wget -qO- http://127.0.0.1:8081/api/v1/prometheus | awk '/^serms_read_replica_in_use/ {print $NF}')
    [[ "$v" = 1.0 ]] || all=0
  done
  echo "$all"
}
wait_in_use() { for _ in $(seq 1 30); do [[ "$(in_use)" = "$1" ]] && return 0; sleep 2; done; return 1; }

[[ "$(sql db "SELECT count(*) FROM pg_stat_replication WHERE state = 'streaming'")" -ge 1 ]] || fail 'db-replica is not streaming'
[[ "$(sql db-replica 'SELECT pg_is_in_recovery()')" = t ]] || fail 'db-replica is not a hot standby'
[[ "$(sql db 'SHOW archive_mode')" = on ]] || fail 'WAL archiving is off'
before=$(sql db 'SELECT archived_count FROM pg_stat_archiver')
sql db 'SELECT pg_switch_wal()' >/dev/null
for _ in $(seq 1 20); do [[ "$(sql db 'SELECT archived_count FROM pg_stat_archiver')" -gt "$before" ]] && break; sleep 1; done
[[ "$(sql db 'SELECT archived_count FROM pg_stat_archiver')" -gt "$before" ]] || fail 'a switched WAL segment was not archived'
pass "streaming replica in recovery; WAL archiving on ($(sql db 'SELECT last_archived_wal FROM pg_stat_archiver'))"

# Sign in as an administrator (reports are admin-only); internal address, so never rate-limited.
curl -s -D "$WORK/c" -o /dev/null "$BASE/auth/csrf"; X=$(cookie XSRF-TOKEN "$WORK/c")
code=$(curl -s -D "$WORK/l" -o /dev/null -w '%{http_code}' -H 'Content-Type: application/json' \
  -H "Cookie: XSRF-TOKEN=$X" -H "X-XSRF-TOKEN: $X" \
  --data "$(printf '{"email":"%s","password":"%s"}' "$SERMS_VERIFY_EMAIL" "$SERMS_VERIFY_PASSWORD")" "$BASE/auth/login")
[[ "$code" = 200 ]] || fail "admin login returned $code"
SESSION=$(cookie JSESSIONID "$WORK/l")
FROM=$(date -u -d '-30 days' +%Y-%m-%dT%H:%M:%SZ); TO=$(date -u +%Y-%m-%dT%H:%M:%SZ)
report() { curl -s -o /dev/null -w '%{http_code}' -H "Cookie: JSESSIONID=$SESSION" "$BASE/reports?from=$FROM&to=$TO"; }

wait_in_use 1 || fail 'app replicas do not route reports to the read replica'
reads() { sql db-replica "SELECT tup_returned + tup_fetched FROM pg_stat_database WHERE datname = current_database()"; }
r0=$(reads); [[ "$(report)" = 200 ]] || fail 'report request failed'; r1=$(reads)
(( r1 > r0 )) || fail 'the report did not read from db-replica'
pass "report served from db-replica ($((r1 - r0)) tuples read on the standby)"

docker compose stop db-replica >/dev/null 2>&1
wait_in_use 0 || fail 'app replicas did not fall back to the primary'
[[ "$(report)" = 200 ]] || fail 'report failed while the replica was down'
pass 'replica stopped: reports fall back to the primary and still return 200'
docker compose start db-replica >/dev/null 2>&1
for _ in $(seq 1 60); do [[ "$(docker inspect --format '{{.State.Health.Status}}' "$(docker compose ps -q db-replica)")" = healthy ]] && break; sleep 2; done
wait_in_use 1 || fail 'reports did not return to the replica'
pass 'replica restarted: reports use it again'

# Rate limiting: a public client (X-Forwarded-For from the trusted Docker bridge) guessing passwords.
codes="$WORK/codes"; : > "$codes"
for _ in $(seq 1 35); do
  curl -s -o "$WORK/body" -w '%{http_code}\n' -H 'X-Forwarded-For: 203.0.113.77' -H 'Content-Type: application/json' \
    -H "Cookie: XSRF-TOKEN=$X" -H "X-XSRF-TOKEN: $X" --data '{"email":"nobody@example.invalid","password":"wrong-password"}' \
    "$BASE/auth/login" >> "$codes"
done
limited=$(grep -c '^429$' "$codes" || true); denied=$(grep -c '^401$' "$codes" || true)
(( limited > 0 && denied > 0 )) || fail "expected 401s then 429s, got: $(sort "$codes" | uniq -c | tr '\n' ' ')"
grep -q '"type":"/problems/rate-limited"' "$WORK/body" || fail '429 body is not the rate-limited problem'
pass "public client: $denied wrong-password 401s, then $limited x 429 /problems/rate-limited"
code=$(curl -s -o /dev/null -w '%{http_code}' -H 'X-Forwarded-For: 198.51.100.9' "$BASE/health")
[[ "$code" = 200 ]] || fail "another public client was blocked ($code)"
: > "$codes"
for _ in $(seq 1 35); do
  curl -s -o /dev/null -w '%{http_code}\n' -H 'Content-Type: application/json' -H "Cookie: XSRF-TOKEN=$X" -H "X-XSRF-TOKEN: $X" \
    --data '{"email":"nobody@example.invalid","password":"wrong-password"}' "$BASE/auth/login" >> "$codes"
done
! grep -q '^429$' "$codes" || fail 'internal traffic was rate-limited'
pass 'limits are per client: another public client and internal traffic are not limited'
echo 'Data tier and edge verification passed'
