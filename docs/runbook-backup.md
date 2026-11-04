# PostgreSQL backup and isolated restore

This runbook applies to the inventoried PostgreSQL 18 Compose service. The release owner must first verify the host, active Compose project, database container, existing volume, and backup location in `docs/server-release.md`. Production execution is gated by issue #10.

## Daily backup

Set `SERMS_DB_NAME`, `SERMS_DB_USER`, and `SERMS_BACKUP_DIR` in the server-only `/opt/agfp/.env`. The backup directory must exist, be outside the checkout, and be writable only by the backup operator. Run `APP_DIR=/opt/agfp /opt/agfp/scripts/backup.sh` from a daily scheduler. The script dumps from the healthy `db-replica` (falling back to `db`; `SERMS_BACKUP_SOURCE=primary|replica` forces one) with `pg_dump -Fc`, verifies the archive with `pg_restore --list`, publishes it atomically, and removes only matching nightly dumps older than seven days after a successful new dump. Alert on any nonzero exit or missing daily dump. Keep backup access separate from the web service; do not commit dumps or credentials.

A cron example for the confirmed operator is `15 2 * * * APP_DIR=/opt/agfp /opt/agfp/scripts/backup.sh >> /var/log/serms-backup.log 2>&1`. Confirm timezone, log ownership and monitoring during handover before installing it. The script does not install a cron job itself.

## Read replica, WAL archive, point-in-time recovery and off-host copies

[D-015](collaboration/decisions.md#d-015-read-replica-pitr-off-host-backups-and-edge-rate-limits) adds four layers on top of the daily logical dump. All of them are defined in `compose.yaml` and `postgres/`.

| Layer | What runs | Recovery point / purpose |
| --- | --- | --- |
| Streaming replica | `db-replica` clones `db` with `pg_basebackup` through slot `serms_replica` (`postgres/replica-entrypoint.sh`), then streams as a hot standby. Report queries and `backup.sh` read from it; the app falls back to the primary while it is down or more than 300 s behind | Read scaling, and a warm copy seconds behind the primary |
| Continuous WAL archive | Primary `archive_mode=on`. `postgres/archive-wal.sh` copies each finished segment to the `serms-wal-archive` volume; `archive_timeout=300` closes a segment at least every 5 minutes | RPO ≤ 5 min |
| Daily base backup | `scripts/base-backup.sh`: `pg_basebackup -F tar -z`, keeps 7, then `pg_archivecleanup` before the oldest kept backup | Any point within the last 7 days |
| Off-host encrypted copy | `scripts/offsite-backup.sh`: AES-256 (OpenSSL, PBKDF2 200k) mirror of dumps, base backups and WAL, rsync'd to `SERMS_OFFSITE_TARGET` (mounted path or `user@host:/path`). The newest dump is decrypted and checked with SHA-256 and `pg_restore --list` on every run | Survives loss of the host |

Server `.env` additions:

- `SERMS_OFFSITE_TARGET` (off-host destination);
- `SERMS_OFFSITE_KEY_FILE` (passphrase file, mode 600, outside the checkout, kept in the team password manager as well);
- optional `SERMS_BASE_BACKUP_KEEP`.

Scheduler (operator crontab, UTC):

```cron
15 2 * * * APP_DIR=/opt/agfp /opt/agfp/scripts/backup.sh >> /var/log/serms-backup.log 2>&1
35 2 * * * APP_DIR=/opt/agfp /opt/agfp/scripts/base-backup.sh >> /var/log/serms-backup.log 2>&1
*/15 * * * * APP_DIR=/opt/agfp /opt/agfp/scripts/offsite-backup.sh >> /var/log/serms-offsite.log 2>&1
```

Point-in-time recovery always goes into an isolated container first. Use `--base` and `--wal-dir` with the decrypted off-host copy when the host is lost:

```sh
scripts/pitr-restore.sh --base "$SERMS_BACKUP_DIR/serms-base-<ts>.tar.gz" \
  --target-time '2026-11-04 09:05:35+00' --name serms-pitr-incident --db-user "$SERMS_DB_USER"
```

Verify the restored data, then follow the switchover in `docs/server-release.md`.

`scripts/rehearse-recovery.sh` runs the whole drill on a running stack: dump, base backup, marker rows around a target time, off-host copy, then a restore from the off-host copy only. The restore must contain the rows before the target and none after it. CI runs the drill in `release-images`. The 2026-11-04 result is in the [data-tier evidence](evidence/data-tier-20261104/README.md).

## Scratch restore rehearsal

Do this without touching the live database or its volume:

1. Select a recent `.dump`; verify it with PostgreSQL 18 `pg_restore --list` (for example, stream it to `docker exec -i SCRATCH_CONTAINER pg_restore --list`). Do not use an older host `pg_restore` against a PostgreSQL 18 archive.
2. Create an isolated PostgreSQL 18 container or scratch database with no application connection. Use a new database name and local-only credentials.
3. Run PostgreSQL 18 `pg_restore --no-owner --no-acl -U SCRATCH_USER -d SCRATCH_DB` in that scratch environment, streaming the custom archive to the container through stdin.
4. Query schema objects and representative row counts; compare with the source snapshot. Record date, archive identifier, PostgreSQL versions, restore command exit code and counts, excluding credentials and user data.
5. Remove only the scratch container/database after evidence is recorded. Never restore into the production database or delete its volume as a rehearsal.

A successful `pg_restore --list` is an archive check, not a restore rehearsal. The release recovery procedure and switchover remain in `docs/server-release.md`.

## 50-user load check

This is a manual k6 run on isolated local data. No GitHub Actions workflow invokes it, and it is not a merge or release check.

`SERMS_K6_BASE_URL` points to an isolated local deployment. `SERMS_K6_USERS_FILE` points to an untracked JSON array of at least 50 distinct `{email,password,equipmentId,assetTag,startAt,endAt}` fixtures. Each VU logs in, searches availability, and submits a reservation. Use distinct equipment or disjoint intervals to avoid intentional booking conflicts. Run `k6 run --summary-export=/private/tmp/serms-k6-summary.json scripts/load-k6.js` from the repository root with those environment variables set. Capture checks, overall and per-operation p95 latency, and error rate in the issue log. The project target is under 2 seconds; a k6 threshold failure is a performance finding even when all business requests succeed. Never run the reserve load against production or commit the fixture file.

OWASP ZAP baseline is a separate manual, anonymous passive check after deployment under issue #10, outside the pipeline. The [2026-10-16 production baseline](evidence/zap-baseline-20261016/zap-baseline.md) recorded 0 FAIL / 7 WARN / 60 PASS; the **latest [2026-10-17 baseline](evidence/zap-baseline-20261017/README.md)** on deployed SHA `2993b78` recorded 0 FAIL / 5 WARN / 62 PASS. Both are historical evidence, not automatic post-deployment scans or authenticated/active scans. Its target and findings must be reviewed with the release owner; no deployment is implied by this runbook.
