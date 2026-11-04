#!/usr/bin/env bash
# Point-in-time recovery into an ISOLATED new container (report AD-19, runbook-backup.md).
# It never stops, changes or reads from the live db volume; it reads one base backup and the WAL
# archive (read-only) and replays WAL up to the requested time. Switch-over is a separate,
# reviewed maintenance-window step.
#
# Usage:
#   scripts/pitr-restore.sh --base /backups/serms-base-<ts>.tar.gz --target-time '2026-11-04 10:15:00+00' \
#     [--wal-volume serms-wal-archive | --wal-dir /path/to/decrypted/wal] [--name serms-pitr-check] [--port 55433]
#     [--db-user <SERMS_DB_USER>]
#   --target-time latest replays all archived WAL.
set -euo pipefail
BASE= TARGET_TIME= WAL_VOLUME=${SERMS_WAL_ARCHIVE_VOLUME:-serms-wal-archive} WAL_DIR= NAME= PORT= DB_USER=${SERMS_DB_USER:-postgres}
IMAGE=${SERMS_PG_IMAGE:-postgres:18-alpine}
while (( $# )); do
  case "$1" in
    --base) BASE=$2; shift 2 ;;
    --target-time) TARGET_TIME=$2; shift 2 ;;
    --wal-volume) WAL_VOLUME=$2; shift 2 ;;
    --wal-dir) WAL_DIR=$2; shift 2 ;;
    --name) NAME=$2; shift 2 ;;
    --port) PORT=$2; shift 2 ;;
    --db-user) DB_USER=$2; shift 2 ;;
    *) echo "Unknown argument $1" >&2; exit 1 ;;
  esac
done
[[ -f "$BASE" ]] || { echo '--base must name a serms-base-*.tar.gz file' >&2; exit 1; }
[[ -n "$TARGET_TIME" ]] || { echo '--target-time is required (or latest)' >&2; exit 1; }
NAME=${NAME:-serms-pitr-$(date -u +%Y%m%dT%H%M%SZ)}
[[ "$NAME" =~ ^serms-pitr-[a-zA-Z0-9_.-]+$ ]] || { echo 'Name must start with serms-pitr-' >&2; exit 1; }
! docker inspect "$NAME" >/dev/null 2>&1 || { echo "Container $NAME already exists" >&2; exit 1; }
! docker volume inspect "$NAME" >/dev/null 2>&1 || { echo "Volume $NAME already exists" >&2; exit 1; }
PGDATA=/var/lib/postgresql/18/docker
if [[ -n "$WAL_DIR" ]]; then
  [[ -d "$WAL_DIR" ]] || { echo '--wal-dir must be a directory' >&2; exit 1; }
  WAL_MOUNT="$(cd "$WAL_DIR" && pwd):/wal-archive:ro"
else
  docker volume inspect "$WAL_VOLUME" >/dev/null
  WAL_MOUNT="$WAL_VOLUME:/wal-archive:ro"
fi

docker volume create "$NAME" >/dev/null
echo "Extracting $(basename "$BASE") into volume $NAME"
docker run --rm -i -v "$NAME:/var/lib/postgresql" --entrypoint sh "$IMAGE" -c "
  set -e; mkdir -p $PGDATA; tar -xz -C $PGDATA
  touch $PGDATA/recovery.signal
  {
    echo \"restore_command = 'cp /wal-archive/%f %p'\"
    echo \"archive_mode = off\"
    echo \"recovery_target_action = 'promote'\"
    if [ '$TARGET_TIME' != latest ]; then echo \"recovery_target_time = '$TARGET_TIME'\"; fi
  } >> $PGDATA/postgresql.auto.conf
  chown -R postgres:postgres /var/lib/postgresql; chmod 700 $PGDATA" < "$BASE"

PUBLISH=()
[[ -n "$PORT" ]] && PUBLISH=(-p "127.0.0.1:$PORT:5432")
docker run -d --name "$NAME" "${PUBLISH[@]}" -v "$NAME:/var/lib/postgresql" -v "$WAL_MOUNT" "$IMAGE" postgres >/dev/null
echo "Replaying WAL in $NAME up to: $TARGET_TIME"
for _ in $(seq 1 120); do
  state=$(docker exec "$NAME" psql -U "$DB_USER" -d postgres -tAc 'SELECT pg_is_in_recovery()' 2>/dev/null || true)
  if [[ "$state" = f ]]; then
    echo "Recovered and promoted: $NAME (volume $NAME). Inspect with: docker exec -it $NAME psql -U $DB_USER -d <db name>"
    docker logs "$NAME" 2>&1 | grep -E 'recovery stopping|last completed transaction|redo done' | tail -3 || true
    exit 0
  fi
  sleep 1
done
echo "Recovery did not finish; see: docker logs $NAME" >&2
exit 1
