#!/usr/bin/env bash
# Encrypted off-host copy of every backup needed for recovery (report AD-19, runbook-backup.md):
# nightly logical dumps, base backups and the WAL archive. Files are encrypted on this host with
# AES-256 (OpenSSL, PBKDF2) into an encrypted mirror, then rsync'd to SERMS_OFFSITE_TARGET
# (a mounted path or user@host:/path over SSH). After each run the newest dump is decrypted back
# from the mirror, checked against its SHA-256 and listed with pg_restore.
#
# Required: SERMS_BACKUP_DIR, SERMS_OFFSITE_TARGET, SERMS_OFFSITE_KEY_FILE (passphrase file outside
# the checkout, mode 600). Optional: SERMS_DB_USER (pg_restore check), APP_DIR.
set -euo pipefail
umask 077
APP_DIR=${APP_DIR:-/opt/agfp}
cd "$APP_DIR"
env_value() {
  if [[ -f .env ]]; then sed -n "s/^$1=//p" .env | tail -1 | tr -d '\r'; fi
}
BACKUP_DIR=${SERMS_BACKUP_DIR:-$(env_value SERMS_BACKUP_DIR)}
TARGET=${SERMS_OFFSITE_TARGET:-$(env_value SERMS_OFFSITE_TARGET)}
KEY=${SERMS_OFFSITE_KEY_FILE:-$(env_value SERMS_OFFSITE_KEY_FILE)}
[[ "$BACKUP_DIR" = /* && -d "$BACKUP_DIR" ]] || { echo 'SERMS_BACKUP_DIR must be an existing absolute directory' >&2; exit 1; }
[[ -n "$TARGET" ]] || { echo 'SERMS_OFFSITE_TARGET is required' >&2; exit 1; }
[[ -f "$KEY" && ! -L "$KEY" ]] || { echo 'SERMS_OFFSITE_KEY_FILE must be a regular file' >&2; exit 1; }
[[ "$KEY" != "$APP_DIR"/* ]] || { echo 'The key file must be outside the checkout' >&2; exit 1; }
[[ "$(stat -c %a "$KEY")" = 600 || "$(stat -c %a "$KEY")" = 400 ]] || { echo 'The key file must be mode 600 or 400' >&2; exit 1; }
MIRROR="$BACKUP_DIR/offsite-mirror"
mkdir -p "$MIRROR/wal"
enc() { openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass "file:$KEY" "$@"; }
dec() { openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass "file:$KEY" "$@"; }

added=0
# 1. Dumps and base backups present locally (their own scripts apply local retention).
for f in "$BACKUP_DIR"/serms-nightly-*.dump "$BACKUP_DIR"/serms-base-*.tar.gz "$BACKUP_DIR"/serms-base-*.tar.gz.wal; do
  [[ -f "$f" ]] || continue
  out="$MIRROR/$(basename "$f").enc"
  [[ -f "$out" ]] && continue
  enc -in "$f" -out "$out.tmp" && mv "$out.tmp" "$out"
  printf '%s  %s\n' "$(sha256sum < "$f" | cut -d' ' -f1)" "$(basename "$f")" >> "$MIRROR/SHA256SUMS"
  added=$((added + 1))
done
# Mirror local retention: drop encrypted copies whose source was rotated away.
for out in "$MIRROR"/serms-*.enc; do
  [[ -f "$out" ]] || continue
  [[ -f "$BACKUP_DIR/$(basename "$out" .enc)" ]] || rm -f "$out"
done

# 2. WAL archive segments from the primary's /wal-archive volume.
DB=${SERMS_DB_CONTAINER:-$(docker compose ps -q db)}
if [[ -n "$DB" && "$DB" != *$'\n'* ]]; then
  mapfile -t SEGMENTS < <(docker exec "$DB" sh -c 'ls -1 /wal-archive 2>/dev/null' | grep -E '^[0-9A-F]{24}(\.[0-9A-F]{8}\.backup|\.partial)?$|^[0-9A-F]{8}\.history$' || true)
  for seg in "${SEGMENTS[@]}"; do
    out="$MIRROR/wal/$seg.enc"
    [[ -f "$out" ]] && continue
    docker exec "$DB" cat "/wal-archive/$seg" | enc -out "$out.tmp" && mv "$out.tmp" "$out"
    added=$((added + 1))
  done
  # Segments cleaned by base-backup.sh (pg_archivecleanup) leave the mirror too.
  for out in "$MIRROR"/wal/*.enc; do
    [[ -f "$out" ]] || continue
    seg=$(basename "$out" .enc)
    printf '%s\n' "${SEGMENTS[@]}" | grep -qx "$seg" || rm -f "$out"
  done
fi

# 3. Ship the encrypted mirror; the target holds the same retention window.
case "$TARGET" in
  *:*) rsync -a --delete -e "ssh -o BatchMode=yes" "$MIRROR/" "$TARGET/" ;;
  *) mkdir -p "$TARGET"; rsync -a --delete "$MIRROR/" "$TARGET/" ;;
esac

# 4. Verify the newest dump round-trips through encryption.
NEWEST=$(find "$MIRROR" -maxdepth 1 -name 'serms-nightly-*.dump.enc' | sort | tail -1)
if [[ -n "$NEWEST" ]]; then
  CHECK=$(mktemp); trap 'rm -f "$CHECK"' EXIT
  dec -in "$NEWEST" -out "$CHECK"
  name=$(basename "$NEWEST" .enc)
  grep -q "^$(sha256sum < "$CHECK" | cut -d' ' -f1)  $name\$" "$MIRROR/SHA256SUMS" || { echo "Checksum mismatch for $name" >&2; exit 1; }
  if [[ -n "$DB" && "$DB" != *$'\n'* ]]; then docker exec -i "$DB" pg_restore --list < "$CHECK" >/dev/null; fi
  echo "Verified decrypt + checksum + pg_restore --list: $name"
fi
echo "Off-host copy complete: $added new encrypted file(s) -> $TARGET"
