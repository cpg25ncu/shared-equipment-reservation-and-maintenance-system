# Server Handover and Release (Issue #10)

Owner/executor: Liu Tongyao. Shi Wenqi retains original contribution provenance. Prepared from main `940bf42cd1b6b507d24179e8aa4065af14f72a0e` on 2026-10-13 (Asia/Singapore).

The user confirmed in this session that SSH access, trusted host identity and backup/recovery information have **not** been handed over. This PR prepares deployment; it does not authorize or claim a production run. Complete local Issues #5–#9 and member acceptance before enabling release. The old static deployment must be inventoried before switching it to the three-service runtime.

Update 2026-10-17 (Shi Wenqi): access has been handed over, the gated `Deploy` workflow has released `main` since 2026-10-15, and the inventory below records the observed server state. The history of the handover is in the [#10 development log](devlog/issue-10-server-release.md).

## Deployment Entry Points

Production packaging uses the root [Dockerfile](../Dockerfile) and [compose.yaml](../compose.yaml): `web` (nginx), `app` (Spring Boot) and `db` (PostgreSQL 18). Only the web container is published, on the host's `127.0.0.1:8789`; host nginx provides the public HTTPS reverse proxy.

The [Deploy workflow](../.github/workflows/deploy.yml) runs on non-documentation pushes to `main` and on manual dispatch. Documentation-only pushes matching its `paths-ignore` filters do not start it. The release gate requires `SERMS_PRODUCTION_READY=true` and successful checks on the exact current `main` SHA; the `production` environment then requires reviewer approval before SSH execution. Merge permissions remain defined in [CONTRIBUTING](../.github/CONTRIBUTING.md#prs-and-team-acceptance).

The server checkout is `/opt/agfp`. Runtime secrets stay in its server-only `.env` (mode 600), using [.env.example](../.env.example) as the template; never commit them. Deployment access credentials use the workflow's GitHub Secrets. Follow the inventory, bootstrap, gates and recovery procedures below, with the [backup runbook](runbook-backup.md) for scheduled backups and restore rehearsal.

## Private Handover Inventory

Record observations and timestamps privately. Publish only non-secret evidence; never copy passwords, keys, tokens, cookies, raw environment files or expanded Compose configuration into Issues/logs.

| Item | Required observation | Current state |
| --- | --- | --- |
| Access | User-owned SSH configuration; verified host-key SHA256 fingerprint via a trusted channel | Handed over to Shi Wenqi (key-based SSH). The `DEPLOY_HOST_FINGERPRINT` Secret was corrected to the key the Deploy client is offered on 2026-10-15; see the [#10 log](devlog/issue-10-server-release.md) |
| Git checkout | Actual path, remote, revision, branch, tracked modifications and ignored files | `/opt/agfp`, detached at the released `main` SHA (`cef0e10` on 2026-10-17); no tracked modifications; only the untracked `.deploy.lock` of the release script |
| Runtime | Docker/Compose versions, actual Compose project, containers, image digests and listening ports | Docker Compose v5.3.0, project `agfp`: `web`, `app` (images `serms-web:<sha>` / `serms-app:<sha>` built on the server) and `db` (`postgres:18-alpine`), all healthy; only `web` is published, on `127.0.0.1:8789`. The host also runs one unrelated project |
| Routing | nginx site, domain, certificate renewal, upstream address and HTTPS behavior | Host nginx 1.18.0 terminates TLS for `serms.midas.cyou` and proxies to `127.0.0.1:8789`; `http://` redirects to `https://`. Let's Encrypt certificate renewed by the packaged certbot timer, valid until 2026-12-08. `server_tokens off` since 2026-10-17 |
| Data | Database major version/name/user, exact named volume, PGDATA/mount, schema/Flyway history, size | PostgreSQL 18.6 in the external volume `serms-pg18`; Flyway at V007. On 2026-10-17 the database held only the bootstrap administrator and no business records |
| Environment | Required variable **names**, presence and file owner/mode; retain actual values privately | `.env` is mode 600, owner root, with `HOST_PORT`, `SERMS_DB_NAME`, `SERMS_DB_USER`, `SERMS_DB_PASSWORD`, `SERMS_DB_VOLUME`, `SERMS_BACKUP_DIR`; the three first-administrator settings have been removed |
| Recovery | Backup path/schedule/retention, last successful dump, restore rehearsal on a separate database, previous application image/revision | Backup directory outside the checkout. Daily `scripts/backup.sh` at 02:15 SGT (root cron, server clock UTC) since 2026-10-17, seven-day retention by the script; every release adds a pre-release dump with a `.release` record. Isolated restore rehearsal passed on 2026-10-17. Images of the previous releases stay on the host for rollback |
| Old static site | How the pre-SERMS deployment can be restored | Its image is kept as `agfp:pre-serms-20261015`; it is not running |
| Accounts | Existing real accounts and roles, agreed migration/provisioning process | The 2026-10-15 bootstrap administrator is `DISABLED` after its password was lost; its replacement was created by the same bootstrap (#41) on 2026-10-17 (see the [#10 log](devlog/issue-10-server-release.md)). Further accounts are created in the administration console. Local demo SQL is prohibited in production |

Useful read-only commands after access is handed over: `git status --short --branch`, `git remote -v`, `git rev-parse HEAD`, `docker compose version`, `docker ps`, `docker volume ls`, `ss -lnt`, and selected nginx certificate/routing checks. Do not publish `docker inspect` environment arrays or `docker compose config` output containing secrets.

## Candidate Packaging and First Transition

Root Dockerfile builds the existing backend/JDBC adapter and React frontend into separate non-root `app` and `web` targets. Compose adds PostgreSQL 18, exposes only web on loopback, forwards `/api/` to Spring, and serves SPA routes. Production uses the existing `serms-postgres` profile and Secure session/CSRF cookies.

PostgreSQL 18 stores data below `/var/lib/postgresql/18/docker`; its volume mount is `/var/lib/postgresql`, following the [official image documentation](https://github.com/docker-library/docs/blob/master/postgres/README.md). Do not attach an older major-version data directory directly. Confirm an upgrade/restore plan with the database owner where required.

Compose declares the database volume **external**, requiring `SERMS_DB_VOLUME`; a missing volume fails instead of silently initializing a replacement. Inventory and confirm the real volume first. If the existing deployment has only the static page, initial PostgreSQL creation/migration and real-account provisioning are a separately reviewed first transition. The automated release deliberately refuses to proceed without the confirmed running PostgreSQL 18 service and a backup.

During that transition, prepare the candidate Compose file outside the tracked checkout from the allowed main SHA, pass the existing server-only `.env` explicitly, and start **only** its `db` service with project `agfp`. Confirm it mounts the inventoried volume at `/var/lib/postgresql`. A native/older PostgreSQL server requires a verified dump/restore into the agreed 18 volume; do not switch to a new empty database just to make health pass. The release script finds the prestarted DB by Compose labels even while the tracked checkout still contains the static Compose file.

## First Administrator (#41)

A fresh production database has no accounts, and `scripts/demo-data.sql` must never run there. The application creates the first administrator from three one-off settings; there is no public endpoint.

1. Only if the inventory shows no active `ADMIN`: add `SERMS_BOOTSTRAP_ADMIN_EMAIL`, `SERMS_BOOTSTRAP_ADMIN_DISPLAY_NAME` and `SERMS_BOOTSTRAP_ADMIN_PASSWORD` to the server-only `.env` (mode 600). The password needs at least 12 characters and at most 72 bytes; choose it privately and never put it in Issues, logs or chat.
2. Start the application once. With no active administrator it creates an `ACTIVE` user with the `ADMIN` role, stores only the password hash, writes a `USER_BOOTSTRAP_ADMIN` row to `serms.audit_log` and logs the email address. If an active administrator already exists it changes nothing and logs that. An invalid value, or an email that belongs to another account, stops the start with a message that does not contain the password.
3. Delete the three lines from `.env` and restart, then sign in and change nothing else until the deployed acceptance below.

Leaving the settings in place is harmless for later starts (an administrator exists), but the password would remain in the file, so remove them.

## Main-SHA and Handover Gates

1. Keep repository variable `SERMS_PRODUCTION_READY` absent/false until access, inventory, isolated restore rehearsal, local acceptance and release coordination are complete. This is a release prerequisite; branch protection and collaborator permissions are unchanged.
2. Configure existing deployment Secrets privately and add `DEPLOY_HOST_FINGERPRINT` from trusted handover, never from an unverified first network connection. The [SSH action documents fingerprint verification](https://github.com/appleboy/ssh-action/blob/master/README.md).
3. Merge reviewed code through the protected main process. The workflow rejects non-main execution before checkout/secrets. It allows only push/manual events and a full SHA equal to **current** main.
4. `verify-release.mjs` waits for all eight existing required checks, collaboration-docs, maintenance-postgres, release-config and release-images on that exact SHA, produced by GitHub Actions. Missing/running/skipped/cancelled/failed checks block SSH; newer reruns supersede prior successes. No arbitrary user-entered branch/SHA is deployed.
5. Hosted deployment concurrency is serialized. The server script also takes a nonblocking file lock, rejects tracked server changes, confirms main again, and preserves `.env`, data, previous image tags and history.
6. Before changing application code, dump the confirmed running DB into the existing backup directory outside the checkout, require a nonempty dump and successful `pg_restore --list`, and record previous SHA/target SHA/backup path privately. This validates archive structure, **not** a restore rehearsal.
7. Build before replacing containers. Compose waits for actual backend/database readiness; the web health check reaches `/api/v1/health`, replacing the synthetic static health response.

Required server commands: Git, Bash, flock, Docker with Compose v2 supporting `--wait`, curl, and the PostgreSQL tools inside the running DB image. `.env` entries used by the script must be plain, unquoted `KEY=value`. No auto-generated placeholder environment, orphan removal, image prune, database downgrade or volume deletion is performed.

## Recovery and Acceptance

If build fails, existing running containers remain in place. If startup/readiness fails, retain logs privately and stop acceptance. Do not blindly rerun mutations or restore over live data. The backup `.release` record binds the previous revision, target and dump. Compare schema compatibility before restoring the previous app/web images: existing Flyway migrations are immutable and forward migrations may be incompatible with old code. Reverting application images alone does not revert the database.

A database restore requires the reviewed maintenance-window procedure: restrict application writes, preserve a fresh failure-state backup, restore the verified archive into an **isolated** replacement first, verify role/schema/record counts and key flows, then use the explicitly agreed switchover. Existing production volumes remain preserved. Never use `docker compose down -v` or remove volumes to recover. Maintain the established daily backup schedule and seven-day retention; this PR's pre-release dump complements it and does not prove that schedule exists.

On the deployed SHA, record image revision labels/digests, database migration version, public HTTPS health, React direct-route loading, real login/logout/CSRF and each role's UC01–UC05 workflow (including blocked booking, cancellation, approval, handover and repair). Verify that session and CSRF cookies stay Secure. Keep local checks, hosted CI, member checks, merge, server execution and team Done as separate evidence. Issue #10 remains open until actual handover and deployed workflow acceptance.
