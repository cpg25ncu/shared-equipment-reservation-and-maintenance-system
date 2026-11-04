#!/usr/bin/env bash
# Disaster-recovery rehearsal on a running production-profile Compose stack (report AD-19):
#   1. nightly logical dump (from the replica) and a physical base backup;
#   2. two batches of drill rows, with a recovery target time between them;
#   3. encrypted off-host copy (dumps, base backup, WAL) to a separate target;
#   4. restore ONLY from the off-host copy: decrypt, then point-in-time recovery into an isolated
#      container, and require batch 1 present and batch 2 absent.
# Drill rows live in their own schema (serms_drill) and are dropped afterwards; the live database
# is never stopped, restored or modified otherwise.
# Usage: SERMS_DB_USER=... SERMS_DB_NAME=... scripts/rehearse-recovery.sh [work-dir]
set -euo pipefail
: "${SERMS_DB_USER:?}" "${SERMS_DB_NAME:?}"
ROOT=$(cd "$(dirname "$0")/.." && pwd)
WORK=${1:-$(mktemp -d /tmp/serms-recovery-XXXXXX)}
mkdir -p "$WORK"; chmod 700 "$WORK"
[[ "$WORK" != "$ROOT" && "$WORK" != "$ROOT/"* ]] || { echo 'Work directory must be outside the checkout' >&2; exit 1; }
NAME=serms-pitr-rehearsal-$(date -u +%Y%m%d%H%M%S)
cleanup() {
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  docker volume rm "$NAME" >/dev/null 2>&1 || true
  docker compose exec -T db psql -q -U "$SERMS_DB_USER" -d "$SERMS_DB_NAME" -c 'DROP SCHEMA IF EXISTS serms_drill CASCADE' >/dev/null 2>&1 || true
}
trap cleanup EXIT
sql() { docker compose exec -T db psql -tA -v ON_ERROR_STOP=1 -U "$SERMS_DB_USER" -d "$SERMS_DB_NAME" -c "$1"; }
mkdir -p "$WORK/backups" "$WORK/offsite" "$WORK/restore/wal"
head -c 48 /dev/urandom | base64 > "$WORK/offsite.key"; chmod 600 "$WORK/offsite.key"
export APP_DIR="$ROOT" SERMS_BACKUP_DIR="$WORK/backups" SERMS_OFFSITE_TARGET="$WORK/offsite" SERMS_OFFSITE_KEY_FILE="$WORK/offsite.key"

echo '== 1. backups'
bash "$ROOT/scripts/backup.sh"
bash "$ROOT/scripts/base-backup.sh"

echo '== 2. drill rows around a recovery target'
sql 'CREATE SCHEMA serms_drill; CREATE TABLE serms_drill.marker(batch int, at timestamptz DEFAULT clock_timestamp())' >/dev/null
sql 'INSERT INTO serms_drill.marker(batch) SELECT 1 FROM generate_series(1, 25)' >/dev/null
sleep 2
TARGET=$(sql "SELECT to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS.US') || '+00'")
sleep 2
sql 'INSERT INTO serms_drill.marker(batch) SELECT 2 FROM generate_series(1, 25)' >/dev/null
SEGMENT=$(sql 'SELECT pg_walfile_name(pg_switch_wal())')
for _ in $(seq 1 30); do
  [[ "$(sql 'SELECT last_archived_wal FROM pg_stat_archiver')" > "$SEGMENT" || "$(sql 'SELECT last_archived_wal FROM pg_stat_archiver')" = "$SEGMENT" ]] && break
  sleep 1
done
echo "target time $TARGET; batch 2 written after it; WAL archived through $SEGMENT"

echo '== 3. encrypted off-host copy'
bash "$ROOT/scripts/offsite-backup.sh"

echo '== 4. restore from the off-host copy only'
dec() { openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass "file:$WORK/offsite.key" "$@"; }
BASE_ENC=$(find "$WORK/offsite" -maxdepth 1 -name 'serms-base-*.tar.gz.enc' | sort | tail -1)
dec -in "$BASE_ENC" -out "$WORK/restore/base.tar.gz"
for f in "$WORK/offsite/wal/"*.enc; do dec -in "$f" -out "$WORK/restore/wal/$(basename "$f" .enc)"; done
chmod -R a+rX "$WORK/restore"
bash "$ROOT/scripts/pitr-restore.sh" --base "$WORK/restore/base.tar.gz" --wal-dir "$WORK/restore/wal" \
  --target-time "$TARGET" --name "$NAME" --db-user "$SERMS_DB_USER"
counts=$(docker exec "$NAME" psql -tA -U "$SERMS_DB_USER" -d "$SERMS_DB_NAME" -c \
  "SELECT count(*) FILTER (WHERE batch = 1) || '/' || count(*) FILTER (WHERE batch = 2) FROM serms_drill.marker")
users=$(docker exec "$NAME" psql -tA -U "$SERMS_DB_USER" -d "$SERMS_DB_NAME" -c 'SELECT count(*) FROM serms.app_user')
[[ "$counts" = 25/0 ]] || { echo "FAIL expected 25 batch-1 rows and 0 batch-2 rows, got $counts" >&2; exit 1; }
echo "PASS point-in-time restore from the encrypted off-host copy: batch1/batch2 = $counts at $TARGET; $users users restored"
