# Prepare server handover and release after local acceptance (#10)

Owner: Shi Wenqi (@YukiOvOb), server side; Liu Tongyao (@cpg25ncu), repository side of the response headers · Requirement: Proposal 8.3, backlog R-P8 · Branch: `docs/shi-wenqi-issue10-server-release` · Baseline: `main` `45e4e1a`

The release design, gates and recovery procedure are in [Server handover and release](../server-release.md); this log records what happened on the server. No host addresses, backup paths or secret values are recorded here.

## 2026-10-15 First releases

### What was built

- The server moved from the static welcome page to the three-service runtime (`web`, `app`, `db`) under Compose project `agfp`, with PostgreSQL 18 in the external volume `serms-pg18`. The first administrator was created by the startup bootstrap (#41) and the three bootstrap settings were then removed from `.env`.
- 18:13 SGT: a manual release of `2d19ef9` before the gated workflow was enabled.
- 20:55 SGT: [Deploy #25](https://github.com/cpg25ncu/shared-equipment-reservation-and-maintenance-system/actions/runs/38736487211), attempt 4, released `main` `0be0a29` through `release-gate` (all twelve checks) and `scripts/deploy.sh`. From then on every code merge to `main` deploys after the release gate and the `production` environment approval; manual releases stopped.

### Problems and fixes

| Symptom | Root cause | Fix | How it was verified |
| --- | --- | --- | --- |
| The 18:13 manual release ran on a SHA with 9 of the 12 release checks | Documentation-only pushes skipped the security workflows, so three checks never ran on that SHA | Accepted after the fact: the code of `2d19ef9` is identical to `350085a`, where all twelve passed; #74 stopped documentation pushes from skipping the checks | Comparison recorded on this Issue by the repository owner |
| Deploy #25 attempts 1-3 stopped with `ssh: host key fingerprint mismatch` | The Go SSH client in `appleboy/ssh-action` prefers the ECDSA host key, while the Secret held the fingerprint of another key type | The owner set `DEPLOY_HOST_FINGERPRINT` to the key the client is offered (20:52 SGT) | Attempt 4 passed the handshake and released `0be0a29`; no server command ran in the failed attempts |

### Deviations

- The repository owner decided at 20:45 SGT to enable the gated release **without** the isolated restore rehearsal that `server-release.md` lists as a prerequisite. The pre-release `pg_dump` and `pg_restore --list` in `deploy.sh` still ran. The rehearsal was done later, on 2026-10-17 (below).

## 2026-10-17 Inventory, hardening, backups and restore rehearsal

### What was built

- **Inventory.** The observed server state is recorded in the [inventory table](../server-release.md#private-handover-inventory): checkout detached at the released `cef0e10`, Compose v5.3.0, three healthy services, only `web` published on loopback port 8789, PostgreSQL 18.6, Flyway V007, `.env` mode 600 with six variable names and no leftover bootstrap settings, and the image of the old static site kept as `agfp:pre-serms-20261015`.
- **`server_tokens off`.** Enabled in the host nginx `http` block, so responses carry `Server: nginx` instead of `nginx/1.18.0 (Ubuntu)` (ZAP rule 10036 in the [2026-10-16 baseline](../evidence/zap-baseline-20261016/zap-baseline.md)). A copy of the previous configuration is kept on the server.
- **Daily backups.** Until now only the pre-release dumps of `deploy.sh` existed; there was no scheduled backup. A root cron entry now runs `scripts/backup.sh` every day at 02:15 SGT (18:15 UTC on the server clock); the script keeps seven days of nightly dumps. One run was started by hand to check it.
- **Restore rehearsal.** The latest nightly dump was restored into a throwaway PostgreSQL 18 container with no network, following the [backup runbook](../runbook-backup.md#scratch-restore-rehearsal), and the container was removed afterwards. The live database and its volume were not touched.

### Problems and fixes

| Symptom | Root cause | Fix | How it was verified |
| --- | --- | --- | --- |
| First attempt to add the cron entry left an empty root crontab | The command ran under `set -e`; `crontab -l` exits non-zero when no crontab exists, which ended the subshell before the new line was written | Installed the single entry directly (root had no crontab before, so nothing was lost) | `crontab -l` shows the entry; the `cron` service is active |

### Verification

| Check | Result |
| --- | --- |
| `nginx -t`, then `systemctl reload nginx` | Syntax OK; graceful reload |
| `curl -sI https://serms.midas.cyou/` from the server and from outside | `HTTP/1.1 200 OK`, `Server: nginx` |
| `/api/v1/health` after the reload | 200 |
| `APP_DIR=/opt/agfp scripts/backup.sh` | Exit 0, `Backup verified`; `pg_restore --list` lists 15 table-data entries |
| Restore into a scratch PostgreSQL 18.6 container (`pg_restore --no-owner --no-acl`) | Exit 0 |
| Flyway version and row counts, restored vs live (`app_user`, `equipment`, `reservation`, `loan`, `maintenance_case`, `audit_log`) | Identical: V007, 1 / 0 / 0 / 0 / 0 / 1 |

The row counts show that production held only the bootstrap administrator and its audit row on 2026-10-17. The signed-in checks of #17 and #20 and the deployed acceptance therefore create the first business records through the application; `scripts/demo-data.sql` is not used on production.

## 2026-10-17 Administrator recovery and the #17 / #20 production check

### What was done

- **Administrator recovery.** Nobody held the password of the administrator created by the bootstrap on 2026-10-15, so nobody could sign in to production. A one-off script on the server disabled that account (`session_version` + 1 and a `USER_DEACTIVATED` audit row with a break-glass summary, in one transaction) and then started the `app` service once with the three first-administrator settings, so the existing #41 bootstrap created a new `ADMIN`; the service was then recreated without the settings. The password was typed by the member in the terminal and passed only through the shell environment. The old account stays `DISABLED` and keeps its history. This writes account status directly in the database, which the [administrator contract](../contracts/admin-console.md#confirmed-identitysession-continuation--2026-10-15) otherwise reserves to the administration service; it was the only way back in without changing code during the freeze.
- **Signed-in check of #17 and #20** on production (`main` `cef0e10`), following the steps posted on #17. Test data uses the `ACC-1017` prefix; the item ends retired.

### Problems and fixes

| Symptom | Root cause | Fix | How it was verified |
| --- | --- | --- | --- |
| The API was unavailable for about four minutes (about 11:53-11:57 SGT); `app` stayed unhealthy | The first run of the recovery script passed a value that is not an email address to the bootstrap, whose validation stops the start by design; the script itself did not check the address first | Recreated `app` without the bootstrap settings, which restored service; the script now rejects an invalid address before changing anything and restores `app` if the bootstrap start fails | `/api/v1/health` 200; second run created the administrator; the container environment holds no bootstrap settings |

### Verification

| Step (#17 comment of 2026-10-17 02:10) | Result |
| --- | --- |
| 1.1 Create category `Acceptance 1017` | Passed |
| 1.2 Category `A/B` refused with the documented message | Passed |
| 1.3 Register `ACC-1017-CAM` (serial, `PT48H`, no approval) | Passed; AVAILABLE |
| 1.4 Duplicate asset tag refused ("This asset tag is already registered.") | Passed |
| 1.5 Edit location to Media Lab ("Equipment updated.") | Passed |
| 1.6 Rename category to `Acceptance kit 1017`; the item follows | Passed |
| 1.7 Find equipment finds `Acceptance camera` | Passed |
| 1.8 Audit log shows category create, register, update and rename by the administrator | Passed |
| 2 Two test accounts (Storekeeper only; Borrower only) | Passed; created with addresses chosen by the member instead of the `acc-…@serms.test` ones in the steps |
| 3 Borrower reserves 12:20-14:20 SGT | Passed; CONFIRMED at once |
| 4.1 Checkout queue search by the first 8 characters of the reservation ID, by borrower name in lower case and by `acc-1017` | Passed, all three find the reservation |
| 4.2 Search `zzzz` shows the empty state; Clear search | Passed |
| 4.3 Checkout; the same three searches find the active loan | Passed |
| 4.4 Retire while on loan refused ("Return the active loan before retiring this equipment.") | Passed |
| 4.5 Return in Good condition | Passed; RETURNED, not overdue |
| 4.6 Retire after the return | Passed; RETIRED, Edit/Retire gone, no longer in Find equipment |

Observations, not failures: My reservations does not show the reservation ID (the storekeeper's Loans and returns page does), so step 3's "note the first 8 characters" needs the storekeeper view; and the `EQUIPMENT_UPDATE` audit summary lists asset tag and category but not the changed location.

### Follow-ups

- Deployed acceptance of the five use cases on the code-freeze SHA by 2026-10-22. Owner: Shi Wenqi, with the repository owner.
- Confirm the first scheduled backup on 2026-10-18 in the server's backup log. Owner: Shi Wenqi.

### Authorship

Server work and this entry: Shi Wenqi. Commands were prepared and run with an AI coding agent under the member's instruction; results above are the observed outputs. No hours are recorded.
