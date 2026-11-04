#!/usr/bin/env bash
# Rolling update of the stateless app replicas behind web's nginx upstream (report AD-02, 5.3).
# Run from the Compose project directory after `docker compose build`. Usage:
#   SERMS_APP_REPLICAS=2 scripts/rolling-update.sh
set -euo pipefail
REPLICAS=${SERMS_APP_REPLICAS:-2}
HEALTH_TIMEOUT=${SERMS_HEALTH_TIMEOUT:-240}
# Rolling update of the stateless app replicas (report AD-02, Section 5.3). New replicas start
# next to the old ones with the new image; nginx's upstream picks them up through Docker DNS.
# Old replicas are stopped only after every new one is healthy. Migrations are expand-only,
# so old and new replicas can share the schema during the switch.
[[ "$REPLICAS" =~ ^[1-9][0-9]?$ ]]
mapfile -t OLD_APPS < <(docker compose ps -q app)
docker compose up -d --no-deps --no-recreate --scale "app=$(( ${#OLD_APPS[@]} + REPLICAS ))" app
mapfile -t ALL_APPS < <(docker compose ps -q app)
NEW_APPS=()
for id in "${ALL_APPS[@]}"; do
  [[ " ${OLD_APPS[*]} " == *" $id "* ]] || NEW_APPS+=("$id")
done
[[ ${#NEW_APPS[@]} -eq $REPLICAS ]]
app_health() { docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$1"; }
DEADLINE=$(( SECONDS + HEALTH_TIMEOUT ))
until (( SECONDS > DEADLINE )); do
  pending=0; failed=0
  for id in "${NEW_APPS[@]}"; do
    case "$(app_health "$id")" in
      healthy) ;;
      unhealthy) failed=1 ;;
      *) pending=1 ;;
    esac
  done
  (( failed == 0 && pending == 0 )) && break
  (( failed == 1 )) && break
  sleep 3
done
for id in "${NEW_APPS[@]}"; do
  if [[ "$(app_health "$id")" != healthy ]]; then
    echo "New app replica $id is not healthy; keeping the previous release running"
    docker stop -t 30 "${NEW_APPS[@]}" >/dev/null
    docker rm "${NEW_APPS[@]}" >/dev/null
    exit 1
  fi
done
# Let nginx's resolver (valid=2s in web/nginx.conf) learn the new replicas before any old one
# stops; otherwise a request could only be retried on old replicas that are shutting down.
LB_REFRESH=${SERMS_LB_REFRESH_SECONDS:-4}
sleep "$LB_REFRESH"
# Drain old replicas one at a time. Spring Boot's graceful shutdown finishes in-flight requests;
# nginx retries idempotent requests that hit a closing replica on another one.
# After a replica stops, wait one resolver period so nginx forgets its address before the next
# one stops; at least one live replica is therefore always in nginx's pool.
for id in "${OLD_APPS[@]}"; do
  docker stop -t 30 "$id" >/dev/null
  sleep "${SERMS_DRAIN_PAUSE_SECONDS:-$LB_REFRESH}"
  docker rm "$id" >/dev/null
done
echo "Rolling update finished: ${#NEW_APPS[@]} new app replicas serving, ${#OLD_APPS[@]} old replicas removed"
