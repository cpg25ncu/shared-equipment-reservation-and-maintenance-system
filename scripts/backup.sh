#!/usr/bin/env bash
# Daily custom-format dump of the inventoried PostgreSQL 18 service.
set -euo pipefail
umask 077

APP_DIR=${APP_DIR:-/opt/agfp}
[[ -d "$APP_DIR" ]] || { echo 'APP_DIR does not exist' >&2; exit 1; }
cd "$APP_DIR"
env_value() {
  if [[ -f .env ]]; then sed -n "s/^$1=//p" .env | tail -1 | tr -d '\r'; fi
}
DB_NAME=${SERMS_DB_NAME:-$(env_value SERMS_DB_NAME)}
DB_USER=${SERMS_DB_USER:-$(env_value SERMS_DB_USER)}
BACKUP_DIR=${SERMS_BACKUP_DIR:-$(env_value SERMS_BACKUP_DIR)}
[[ "$DB_NAME" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ && "$DB_USER" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]] || {
  echo 'Invalid database name or user' >&2; exit 1;
}
[[ "$BACKUP_DIR" = /* && -d "$BACKUP_DIR" && ! -L "$BACKUP_DIR" ]] || {
  echo 'Backup directory must be an existing absolute directory' >&2; exit 1;
}
[[ "$BACKUP_DIR" != "$APP_DIR" && "$BACKUP_DIR" != "$APP_DIR/"* ]] || {
  echo 'Backup directory must be outside the checkout' >&2; exit 1;
}
# Source (report AD-18): the hot-standby replica when it is healthy, so the dump does not load the
# primary; otherwise the primary. SERMS_BACKUP_SOURCE=primary|replica forces one of them.
SOURCE=${SERMS_BACKUP_SOURCE:-auto}
pick() { docker compose ps -q "$1" 2>/dev/null; }
healthy() { [[ -n "$1" && "$1" != *$'\n'* && "$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$1")" = healthy ]]; }
if [[ -n "${SERMS_DB_CONTAINER:-}" ]]; then
  CONTAINER=$SERMS_DB_CONTAINER
else
  case "$SOURCE" in
    replica) CONTAINER=$(pick db-replica) ;;
    primary) CONTAINER=$(pick db) ;;
    auto) CONTAINER=$(pick db-replica); healthy "$CONTAINER" || CONTAINER=$(pick db) ;;
    *) echo 'SERMS_BACKUP_SOURCE must be auto, primary or replica' >&2; exit 1 ;;
  esac
fi
[[ -n "$CONTAINER" && "$CONTAINER" != *$'\n'* ]] || {
  echo 'Exactly one running database container is required' >&2; exit 1;
}
echo "Dumping from $(docker inspect --format '{{index .Config.Labels "com.docker.compose.service"}}' "$CONTAINER" 2>/dev/null || echo "$CONTAINER")"
[[ "$(docker inspect --format '{{.Config.Image}}' "$CONTAINER")" = postgres:18-alpine ]] || {
  echo 'Expected the inventoried PostgreSQL 18 image' >&2; exit 1;
}
TEMP=$(mktemp "$BACKUP_DIR/.serms-nightly-XXXXXX")
trap 'rm -f "$TEMP"' EXIT
docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$TEMP"
[[ -s "$TEMP" ]] || { echo 'Backup is empty' >&2; exit 1; }
docker exec -i "$CONTAINER" pg_restore --list < "$TEMP" >/dev/null
TARGET="$BACKUP_DIR/serms-nightly-$(date -u +%Y%m%dT%H%M%SZ).dump"
[[ ! -e "$TARGET" ]] || { echo 'Backup timestamp already exists' >&2; exit 1; }
mv "$TEMP" "$TARGET"
trap - EXIT
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'serms-nightly-*.dump' -mmin +10080 -delete
printf 'Backup verified: %s\n' "$TARGET"
