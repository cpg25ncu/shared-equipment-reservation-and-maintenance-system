#!/bin/sh
# PostgreSQL archive_command: copy one finished WAL segment to /wal-archive atomically.
# Never overwrite an archived segment; PostgreSQL retries while this exits non-zero.
set -eu
src=$1; name=$2; dest=/wal-archive/$name
if [ -f "$dest" ]; then
  cmp -s "$src" "$dest" && exit 0
  echo "archive-wal: $name already archived with different content" >&2
  exit 1
fi
cp "$src" "$dest.tmp"
sync "$dest.tmp" 2>/dev/null || true
mv "$dest.tmp" "$dest"
