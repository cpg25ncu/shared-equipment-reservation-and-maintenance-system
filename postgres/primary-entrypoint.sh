#!/bin/sh
# Primary database wrapper: prepares the WAL archive volume, then hands over to the official
# docker-entrypoint.sh with the SERMS settings from compose.yaml (report AD-19).
set -eu
mkdir -p /wal-archive
chown postgres:postgres /wal-archive
chmod 700 /wal-archive
exec docker-entrypoint.sh "$@"
