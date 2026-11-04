#!/bin/sh
# Streaming read replica (report AD-18). On first start, clone the primary with pg_basebackup
# through a physical replication slot; afterwards start as a hot standby. Reports and nightly
# dumps read from here; the primary keeps serving all writes.
set -eu
: "${POSTGRES_USER:?}" "${POSTGRES_PASSWORD:?}" "${POSTGRES_DB:?}"
PRIMARY_HOST=${SERMS_PRIMARY_HOST:-db}
SLOT=${SERMS_REPLICATION_SLOT:-serms_replica}
export PGDATA=${PGDATA:-/var/lib/postgresql/18/docker}
export PGPASSWORD="$POSTGRES_PASSWORD"
mkdir -p "$PGDATA"
chown -R postgres:postgres /var/lib/postgresql
chmod 700 "$PGDATA"
if [ ! -s "$PGDATA/PG_VERSION" ]; then
  echo "replica: waiting for primary $PRIMARY_HOST"
  until pg_isready -h "$PRIMARY_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; do sleep 2; done
  # A slot left behind by a deleted replica volume is inactive; drop it so the clone can recreate it.
  psql -h "$PRIMARY_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -qtAc \
    "SELECT pg_drop_replication_slot(slot_name) FROM pg_replication_slots WHERE slot_name = '$SLOT' AND NOT active" >/dev/null
  echo "replica: cloning primary with pg_basebackup (slot $SLOT)"
  gosu postgres env PGPASSWORD="$PGPASSWORD" pg_basebackup -h "$PRIMARY_HOST" -U "$POSTGRES_USER" \
    -D "$PGDATA" -X stream -R -C -S "$SLOT" -c fast --progress
fi
exec gosu postgres postgres -D "$PGDATA" \
  -c hba_file=/etc/serms/postgres/pg_hba.conf \
  -c hot_standby=on \
  -c hot_standby_feedback=on \
  -c max_standby_streaming_delay=10min \
  -c archive_mode=off
