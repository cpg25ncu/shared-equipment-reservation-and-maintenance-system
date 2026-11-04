#!/usr/bin/env bash
# Exercise release failure boundaries with fake executables; never contact a server.
set -euo pipefail
SOURCE_DIR=$(cd "$(dirname "$0")" && pwd)
TEST_DIR=$(mktemp -d)
trap 'rm -rf "$TEST_DIR"' EXIT
mkdir -p "$TEST_DIR/bin" "$TEST_DIR/app/scripts" "$TEST_DIR/backups"
# deploy.sh runs the rolling update from the checked-out release revision.
cp "$SOURCE_DIR/rolling-update.sh" "$TEST_DIR/app/scripts/"
export TEST_LOG="$TEST_DIR/commands" TEST_MODE=success
export SERMS_LB_REFRESH_SECONDS=0 SERMS_DRAIN_PAUSE_SECONDS=0
export TEST_SHA=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
cat > "$TEST_DIR/app/.env" <<EOF
HOST_PORT=8789
SERMS_DB_NAME=serms
SERMS_DB_USER=serms
SERMS_DB_VOLUME=confirmed-volume
SERMS_BACKUP_DIR=$TEST_DIR/backups
EOF
cat > "$TEST_DIR/bin/git" <<'EOF'
#!/usr/bin/env bash
echo "git $*" >> "$TEST_LOG"
case "$*" in
  'rev-parse origin/main') echo "$TEST_SHA" ;;
  'rev-parse HEAD') echo bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb ;;
  'diff --quiet') test "$TEST_MODE" != dirty ;;
esac
EOF
cat > "$TEST_DIR/bin/docker" <<'EOF'
#!/usr/bin/env bash
echo "docker $*" >> "$TEST_LOG"
case "$1 $2" in
  'ps -q') echo db-container ;;
  'inspect --format')
    if [[ "$3" == *State.Health* ]]; then :
    elif [[ "$3" = '{{.Config.Image}}' ]]; then echo postgres:18-alpine
    elif [[ "$TEST_MODE" = wrong-volume ]]; then echo other-volume
    else echo confirmed-volume; fi ;;
  'exec db-container')
    if [[ "$3" = pg_dump ]]; then
      test "$TEST_MODE" != backup-failure || exit 1
      echo archive
    fi ;;
  'exec -i') cat >/dev/null ;;
  'compose build') test "$TEST_MODE" != build-failure || exit 1 ;;
  'compose ps')
    # First call: the running release; after scaling up: old plus new replicas.
    if [[ -f "$TEST_LOG.scaled" ]]; then printf 'old-app-1\nold-app-2\nnew-app-3\nnew-app-4\n'
    else printf 'old-app-1\nold-app-2\n'; fi ;;
  'compose up') [[ "$*" == *--scale* ]] && touch "$TEST_LOG.scaled" ;;
esac
if [[ "$1" = inspect && "$3" == *State.Health* ]]; then
  if [[ "$TEST_MODE" = replica-unhealthy && "$4" = new-app-4 ]]; then echo unhealthy; else echo healthy; fi
fi
EOF
cat > "$TEST_DIR/bin/curl" <<'EOF'
#!/usr/bin/env bash
echo 'curl health' >> "$TEST_LOG"
if [[ "$TEST_MODE" = unhealthy ]]; then echo '{"status":"DOWN"}'; else echo '{"status":"UP"}'; fi
EOF
cat > "$TEST_DIR/bin/flock" <<'EOF'
#!/usr/bin/env bash
echo 'flock release' >> "$TEST_LOG"
test "$TEST_MODE" != busy-lock
EOF
chmod +x "$TEST_DIR/bin/"*
export PATH="$TEST_DIR/bin:$PATH"
for TEST_MODE in ${ONLY_MODES:-busy-lock dirty wrong-volume backup-failure build-failure replica-unhealthy unhealthy success}; do
  export TEST_MODE
  : > "$TEST_LOG"; rm -f "$TEST_LOG.scaled"
  if APP_DIR="$TEST_DIR/app" RELEASE_SHA="$TEST_SHA" bash "$SOURCE_DIR/deploy.sh" > "$TEST_DIR/result" 2>&1; then
    test "$TEST_MODE" = success
  else
    if [[ "$TEST_MODE" = success ]]; then cat "$TEST_DIR/result"; fi
    test "$TEST_MODE" != success
  fi
  case "$TEST_MODE" in
    busy-lock|dirty|wrong-volume|backup-failure) ! grep -q 'git checkout' "$TEST_LOG" ;;
    build-failure) ! grep -q 'compose up' "$TEST_LOG" ;;
    replica-unhealthy)
      # The previous release keeps serving; only the new replicas are removed.
      ! grep -q 'stop -t 30 old-app' "$TEST_LOG"
      grep -q 'rm new-app-3 new-app-4' "$TEST_LOG"
      ! grep -q 'up -d --no-deps --wait --wait-timeout 120 web' "$TEST_LOG" ;;
    success)
      grep -q 'compose up -d --wait' "$TEST_LOG"
      grep -q 'compose up -d --no-deps --no-recreate --scale app=4 app' "$TEST_LOG"
      # Old replicas stop only after the new ones were checked healthy.
      first_new_check=$(grep -n 'State.Health.*new-app' "$TEST_LOG" | head -1 | cut -d: -f1)
      old_stop=$(grep -n 'stop -t 30 old-app-1' "$TEST_LOG" | cut -d: -f1)
      grep -q 'stop -t 30 old-app-2' "$TEST_LOG"
      [[ -n "$first_new_check" && -n "$old_stop" && "$first_new_check" -lt "$old_stop" ]]
      ! grep -q 'stop -t 30 new-app' "$TEST_LOG" ;;
  esac
  test -f "$TEST_DIR/app/.env"
  ! grep -Eq 'down|prune|remove-orphans|volume rm' "$TEST_LOG"
  echo "PASS deployment boundary: $TEST_MODE"
done
