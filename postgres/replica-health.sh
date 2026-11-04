#!/bin/sh
# db-replica health: accepting connections and still in recovery (a hot standby, not promoted).
set -eu
pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null
state=$(psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc 'SELECT pg_is_in_recovery()')
[ "$state" = t ]
