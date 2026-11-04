#!/usr/bin/env bash
# Verify the scalable-monolith runtime of a running production-profile Compose stack:
#   - the expected number of healthy app replicas sit behind web's nginx upstream,
#   - metrics are scraped internally but never served through nginx,
#   - one login works on every replica (sessions in PostgreSQL, Spring Session JDBC),
#   - nginx spreads requests over all replicas,
#   - scheduled jobs coordinate through ShedLock rows,
#   - logout ends the session for every replica.
# Usage: SERMS_VERIFY_EMAIL=... SERMS_VERIFY_PASSWORD=... scripts/verify-cluster.sh
# Optional: HOST_PORT (8789), SERMS_APP_REPLICAS (2), REQUESTS (40), SERMS_DB_USER, SERMS_DB_NAME.
set -euo pipefail
: "${SERMS_VERIFY_EMAIL:?Account to sign in with}"
: "${SERMS_VERIFY_PASSWORD:?Password of that account}"
BASE="http://127.0.0.1:${HOST_PORT:-8789}/api/v1"
EXPECTED=${SERMS_APP_REPLICAS:-2}
REQUESTS=${REQUESTS:-40}
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
pass() { echo "PASS $*"; }
fail() { echo "FAIL $*" >&2; exit 1; }

mapfile -t APPS < <(docker compose ps -q app)
(( ${#APPS[@]} == EXPECTED )) || fail "expected $EXPECTED app replicas, found ${#APPS[@]}"
for id in "${APPS[@]}"; do
  [[ "$(docker inspect --format '{{.State.Health.Status}}' "$id")" = healthy ]] || fail "replica $id is not healthy"
done
pass "$EXPECTED healthy app replicas"

code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/prometheus")
[[ "$code" = 404 ]] || fail "nginx exposes /api/v1/prometheus (HTTP $code)"
pass "metrics endpoint hidden from the edge (HTTP 404)"

metric() { # requests to /auth/me counted by one replica
  docker exec "$1" wget -qO- http://127.0.0.1:8081/api/v1/prometheus \
    | awk '/^http_server_requests_seconds_count\{/ && /uri="\/api\/v1\/auth\/me"/ && /status="200"/ {s+=$NF} END {printf "%d", s+0}'
}
declare -A BEFORE
for id in "${APPS[@]}"; do BEFORE[$id]=$(metric "$id"); done

cookie() { sed -n "s/^Set-Cookie: $1=\([^;]*\).*/\1/Ip" "$2" | tail -1; }
curl -s -D "$WORK/csrf" -o /dev/null "$BASE/auth/csrf"
XSRF=$(cookie XSRF-TOKEN "$WORK/csrf")
[[ -n "$XSRF" ]] || fail "no CSRF cookie"
BODY=$(printf '{"email":"%s","password":"%s"}' "$SERMS_VERIFY_EMAIL" "$SERMS_VERIFY_PASSWORD")
code=$(curl -s -D "$WORK/login" -o /dev/null -w '%{http_code}' -H 'Content-Type: application/json' \
  -H "Cookie: XSRF-TOKEN=$XSRF" -H "X-XSRF-TOKEN: $XSRF" --data "$BODY" "$BASE/auth/login")
[[ "$code" = 200 ]] || fail "login returned HTTP $code"
SESSION=$(cookie JSESSIONID "$WORK/login")
[[ -n "$SESSION" ]] || fail "login did not issue the session cookie (JSESSIONID)"
attrs=$(grep -i '^Set-Cookie: JSESSIONID=' "$WORK/login" | tail -1)
for a in HttpOnly Secure 'SameSite=Lax'; do
  grep -qi "; *$a" <<< "$attrs" || fail "session cookie lacks $a (contract auth-and-approval.md section 2)"
done
NEW_XSRF=$(cookie XSRF-TOKEN "$WORK/login"); [[ -n "$NEW_XSRF" ]] && XSRF=$NEW_XSRF
pass "login through nginx issued the session cookie (JSESSIONID, Spring Session)"

for _ in $(seq "$REQUESTS"); do
  code=$(curl -s -o /dev/null -w '%{http_code}' -H "Cookie: JSESSIONID=$SESSION" "$BASE/auth/me")
  [[ "$code" = 200 ]] || fail "authenticated request returned HTTP $code"
done
pass "$REQUESTS authenticated requests through the load balancer all returned 200"

for id in "${APPS[@]}"; do
  served=$(( $(metric "$id") - BEFORE[$id] ))
  (( served > 0 )) || fail "replica $id served none of the authenticated requests"
  echo "      replica ${id:0:12} served $served of $REQUESTS"
done
pass "nginx distributed one session's requests over every replica"

psql() { docker compose exec -T db psql -tA -U "${SERMS_DB_USER:?}" -d "${SERMS_DB_NAME:?}" -c "$1"; }
[[ "$(psql 'SELECT count(*) FROM serms.spring_session WHERE principal_name IS NOT NULL')" -ge 1 ]] \
  || fail "no signed-in session row in serms.spring_session"
pass "session stored in serms.spring_session"
locks=$(psql "SELECT string_agg(name, ',' ORDER BY name) FROM serms.shedlock")
[[ "$locks" == *serms-notification-delivery* ]] || fail "scheduled delivery did not take its ShedLock row"
pass "scheduled jobs coordinate through serms.shedlock ($locks)"

curl -s -D "$WORK/csrf2" -o /dev/null -H "Cookie: JSESSIONID=$SESSION" "$BASE/auth/csrf"
T=$(cookie XSRF-TOKEN "$WORK/csrf2"); [[ -n "$T" ]] && XSRF=$T
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "Cookie: JSESSIONID=$SESSION; XSRF-TOKEN=$XSRF" \
  -H "X-XSRF-TOKEN: $XSRF" "$BASE/auth/logout")
[[ "$code" = 204 ]] || fail "logout returned HTTP $code"
for _ in $(seq $(( EXPECTED * 4 ))); do
  code=$(curl -s -o /dev/null -w '%{http_code}' -H "Cookie: JSESSIONID=$SESSION" "$BASE/auth/me")
  [[ "$code" = 401 ]] || fail "session still valid after logout (HTTP $code)"
done
pass "logout ended the session on every replica"
echo "Cluster verification passed"
