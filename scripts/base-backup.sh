#!/usr/bin/env bash
# Daily physical base backup for point-in-time recovery (report AD-19, runbook-backup.md).
# Together with the continuous WAL archive (/wal-archive in the db container) it allows restoring
# the database to any moment after the oldest retained base backup (scripts/pitr-restore.sh).
# Keeps SERMS_BASE_BACKUP_KEEP base backups (default 7) and removes WAL older than the oldest one.
set -euo pipefail
umask 077

APP_DIR=${APP_DIR:-/opt/agfp}
[[ -d "$APP_DIR" ]] || { echo 'APP_DIR does not exist' >&2; exit 1; }
cd "$APP_DIR"
env_value() {
  if [[ -f .env ]]; then sed -n "s/^$1=//p" .env | tail -1 | tr -d '\r'; fi
}
DB_USER=${SERMS_DB_USER:-$(env_value SERMS_DB_USER)}
BACKUP_DIR=${SERMS_BACKUP_DIR:-$(env_value SERMS_BACKUP_DIR)}
KEEP=${SERMS_BASE_BACKUP_KEEP:-7}
[[ "$DB_USER" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ && "$KEEP" =~ ^[1-9][0-9]*$ ]] || {
  echo 'Invalid database user or retention' >&2; exit 1;
}
[[ "$BACKUP_DIR" = /* && -d "$BACKUP_DIR" && ! -L "$BACKUP_DIR" ]] || {
  echo 'Backup directory must be an existing absolute directory' >&2; exit 1;
}
[[ "$BACKUP_DIR" != "$APP_DIR" && "$BACKUP_DIR" != "$APP_DIR/"* ]] || {
  echo 'Backup directory must be outside the checkout' >&2; exit 1;
}
CONTAINER=${SERMS_DB_CONTAINER:-$(docker compose ps -q db)}
[[ -n "$CONTAINER" && "$CONTAINER" != *$'\n'* ]] || { echo 'Exactly one running db container is required' >&2; exit 1; }
[[ "$(docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -tAc 'SHOW archive_mode')" = on ]] || {
  echo 'WAL archiving is off on the primary; start it with the compose.yaml db command' >&2; exit 1;
}

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
TEMP=$(mktemp "$BACKUP_DIR/.serms-base-XXXXXX")
trap 'rm -f "$TEMP"' EXIT
# WAL is not copied into the tar (-X none): pg_basebackup waits until the backup's WAL is archived.
docker exec "$CONTAINER" pg_basebackup -U "$DB_USER" -D - -F tar -X none -z -c fast -l "serms-base-$STAMP" > "$TEMP"
[[ -s "$TEMP" ]] || { echo 'Base backup is empty' >&2; exit 1; }
gzip -t "$TEMP"
LABEL=$(tar -xzOf "$TEMP" backup_label)
START_WAL=$(sed -n 's/^START WAL LOCATION: .*(file \([0-9A-F]\{24\}\)).*/\1/p' <<< "$LABEL")
[[ -n "$START_WAL" ]] || { echo 'backup_label has no START WAL LOCATION' >&2; exit 1; }
TARGET="$BACKUP_DIR/serms-base-$STAMP.tar.gz"
[[ ! -e "$TARGET" ]] || { echo 'Base backup timestamp already exists' >&2; exit 1; }
mv "$TEMP" "$TARGET"
printf '%s\n' "$START_WAL" > "$TARGET.wal"
trap - EXIT

# Retention: newest $KEEP base backups; WAL before the oldest kept backup is no longer needed.
mapfile -t BASES < <(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'serms-base-*.tar.gz' | sort)
if (( ${#BASES[@]} > KEEP )); then
  for old in "${BASES[@]:0:${#BASES[@]}-KEEP}"; do rm -f "$old" "$old.wal"; done
  BASES=("${BASES[@]: -KEEP}")
fi
OLDEST_WAL=$(cat "${BASES[0]}.wal")
docker exec "$CONTAINER" pg_archivecleanup /wal-archive "$OLDEST_WAL"
printf 'Base backup verified: %s (starts at WAL %s); %d kept; WAL archive cleaned before %s\n' \
  "$TARGET" "$START_WAL" "${#BASES[@]}" "$OLDEST_WAL"
