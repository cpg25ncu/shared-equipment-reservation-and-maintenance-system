#!/usr/bin/env bash
# Zero-downtime check: keep signed-in traffic flowing through nginx while
# scripts/rolling-update.sh replaces every app replica with RELEASE_SHA's image, then require that
# every request succeeded and that all replicas now run the new image.
# Usage: RELEASE_SHA=<new tag> SERMS_VERIFY_EMAIL=... SERMS_VERIFY_PASSWORD=... scripts/verify-rolling-update.sh
set -euo pipefail
: "${RELEASE_SHA:?Image tag the replicas are rolled to}"
: "${SERMS_VERIFY_EMAIL:?}"; : "${SERMS_VERIFY_PASSWORD:?}"
BASE="http://127.0.0.1:${HOST_PORT:-8789}/api/v1"
WORK=$(mktemp -d); STOP="$WORK/stop"; LOG="$WORK/status"
cookie() { sed -n "s/^Set-Cookie: $1=\([^;]*\).*/\1/Ip" "$2" | tail -1; }
curl -s -D "$WORK/c" -o /dev/null "$BASE/auth/csrf"; XSRF=$(cookie XSRF-TOKEN "$WORK/c")
curl -s -D "$WORK/l" -o /dev/null -H 'Content-Type: application/json' -H "Cookie: XSRF-TOKEN=$XSRF" \
  -H "X-XSRF-TOKEN: $XSRF" --data "$(printf '{"email":"%s","password":"%s"}' "$SERMS_VERIFY_EMAIL" "$SERMS_VERIFY_PASSWORD")" \
  "$BASE/auth/login"
SESSION=$(cookie JSESSIONID "$WORK/l"); [[ -n "$SESSION" ]] || { echo 'FAIL login'; exit 1; }
( while [[ ! -f "$STOP" ]]; do
    curl -s -m 5 -o /dev/null -w '%{http_code}\n' -H "Cookie: JSESSIONID=$SESSION" "$BASE/auth/me" >> "$LOG"
    sleep 0.05
  done ) &
PROBE=$!
trap 'touch "$STOP"; wait "$PROBE" 2>/dev/null || true; rm -rf "$WORK"' EXIT
sleep 3
SECONDS=0
bash "$(dirname "$0")/rolling-update.sh"
took=$SECONDS
sleep 3; touch "$STOP"; wait "$PROBE" || true
total=$(wc -l < "$LOG"); ok=$(grep -c '^200$' "$LOG" || true)
echo "Rolling update took ${took}s; $ok of $total signed-in requests returned 200"
(( total > 0 && ok == total )) || { sort "$LOG" | uniq -c; echo 'FAIL requests failed during the rolling update'; exit 1; }
for id in $(docker compose ps -q app); do
  image=$(docker inspect --format '{{.Config.Image}}' "$id")
  [[ "$image" = "serms-app:$RELEASE_SHA" ]] || { echo "FAIL replica $id still runs $image"; exit 1; }
done
echo "PASS zero failed requests; every replica runs serms-app:$RELEASE_SHA"
