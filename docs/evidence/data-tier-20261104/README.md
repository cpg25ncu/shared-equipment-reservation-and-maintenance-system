# Data Tier and Edge Evidence (2026-11-04)

Evidence for [D-015](../../collaboration/decisions.md#d-015-read-replica-pitr-off-host-backups-and-edge-rate-limits): the streaming read replica with report routing, WAL archiving with point-in-time recovery, encrypted off-host backups, and edge rate limits. The environment is the one described in the [scaling evidence](../scaling-20261104/README.md) (4 vCPU sandbox, Docker 29.9.2, PostgreSQL 18.6, nginx 1.30.6), on branch `claude/bold-franklin-barevs`.

## Upgrade path

The new `compose.yaml` was started on the PostgreSQL volume created by the previous configuration, as production will be:

- the primary restarted with `postgres/pg_hba.conf`, replication and `archive_mode=on`, keeping its data;
- `db-replica` cloned it through slot `serms_replica` and reported `walreceiver | streaming`;
- the standby held the same 2451 user rows as the primary;
- both app replicas logged `Read replica healthy (lag 0.0 s)` and exported `serms_read_replica_in_use 1`.

## `scripts/verify-data-tier.sh`

Output: [verify-data-tier.txt](verify-data-tier.txt).

| Check | Result |
| --- | --- |
| Replica streaming, hot standby, WAL archiving | PASS; a switched segment was archived |
| Report served from the standby | PASS: one `/api/v1/reports` call read 6664 tuples on `db-replica` |
| Replica stopped | PASS: every app replica switched to the primary; reports still 200 |
| Replica restarted | PASS: reports routed to the standby again |
| Public client guessing passwords | PASS: 21 × 401 (burst 20 + 1), then 14 × 429 `/problems/rate-limited` |
| Isolation | PASS: another public client and internal traffic were not limited |

## `scripts/rehearse-recovery.sh`

Output: [rehearse-recovery.txt](rehearse-recovery.txt). Steps of the drill:

1. Nightly dump, taken from `db-replica`, and a base backup.
2. 25 rows before and 25 rows after a recorded target time.
3. Encrypted off-host copy: 7 files, including base backup and WAL. The newest dump was decrypted, checksummed and listed with `pg_restore`.
4. Restore from the off-host copy alone into the isolated container `serms-pitr-rehearsal-…`.

PostgreSQL logged `recovery stopping before commit of transaction 28609, time 09:05:37.69`, two seconds after the target. The restored database held **25/0** drill rows (before/after the target) and all 2451 users. Recovery of this small database took seconds. RPO is bounded by `archive_timeout=300`, so at most 5 minutes.

## Regression with the data tier enabled

| Check | Result |
| --- | --- |
| `app/` `mvn -B clean verify` (clean environment) | 693 tests, 0 failures; business coverage 77.87% |
| `ReadReplicaPostgresTest` (part of the above) | 3/3: streaming, report routing on the standby, fallback to the primary |
| UC02 / UC03+UC05+equipment / UC04 PostgreSQL ITs | 30/30, 41/41, 30/30 |
| `check:api` | No drift |
| `verify-compose.mjs`, `verify-cluster.sh` | PASS on the new stack |
| Rolling update under traffic ([verify-rolling-update.txt](verify-rolling-update.txt)) | 534/534 requests 200, 42 s |
| `scripts/test-deploy.sh` | 8/8 boundary cases |

## k6 on the full stack (50 users, two app replicas, replica and rate limits on)

Raw summaries are in [k6/](k6/), with the warm-up run excluded. Every run passed 200/200 checks with no failed requests.

| Run | p95 all | Login | Search | Reserve |
| --- | --- | --- | --- | --- |
| a | 1.14 s | 1.24 s | 0.40 s | 0.38 s |
| b | 1.16 s | 1.32 s | 0.15 s | 0.21 s |
| c | 1.06 s | 1.15 s | 0.23 s | 0.24 s |
| Average | **1.12 s** | 1.24 s | 0.26 s | **0.27 s** |

Load-test replicas used non-Secure cookies because k6 runs over plain HTTP (see the scaling evidence). k6 traffic arrives from a private address, so the edge limits do not apply to it, by design.
