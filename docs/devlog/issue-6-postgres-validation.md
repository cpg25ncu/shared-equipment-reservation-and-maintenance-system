# PostgreSQL 18 and local demo validation (#6)

Owner: Zhou Fanhao (@zfh-usedname) · Branch: `test/zhoufanhao-issue6-postgres-validation` · Baseline: `0be0a29af011862824c6aaab642512241764bcd9`

## 2026-10-15: isolated database and demo checks

### What was validated and changed

The current V001–V006 Flyway sequence and database regression suite ran against disposable PostgreSQL 18.6 databases. Five `EquipmentMasterDataPostgresTest` cases include the V004-to-V005 upgrade with existing equipment, category and constraint behavior. The complete backend run passed 590 unit/database tests and 30 UC03/UC05 integration tests with zero failures or skips. The local demo started on dedicated ports from this worktree, applied Flyway using the real Spring Boot configuration, and passed 28 smoke checks for six account roles, equipment search, reservation, approval, checkout/return, maintenance, notifications and logout.

The demo seed now sets every V005 equipment field on initial insert and never updates an existing equipment row on a repeat run. The isolation checker compares all equipment rows, including versions and nullable fields, roles, categories, workflow counts and password fingerprints across reseeding and failed guard attempts. It also checks the six Identity role assignments and eight distinct equipment serial numbers. Four data checks passed.

### Problems and fixes

| Symptom | Root cause | Fix | Verification |
| --- | --- | --- | --- |
| A repeated demo seed changed equipment versions and could refill an intentionally cleared optional field. | Follow-up `UPDATE` statements ran after every `ON CONFLICT DO NOTHING` insertion. | Supply V005 fields in the original insert and remove the updates. | Full-row data snapshot remained identical across repeated seeding; `scripts/check-local-data.ps1` passed four checks. |
| A UC05 overdue assertion failed in the shared integration database. | It assumed its loan was the first row even when other tests had created overdue loans. | Match the target loan in the response without depending on row position. | The serial regression run passed all ten `Uc05PostgresIT` cases. |
| An initial verification run failed while the demo build used the same `app/target` directory. | Two Maven processes wrote to one worktree concurrently. | Finish the demo build, then rerun verification serially. | The final isolated run ended with `BUILD SUCCESS`. |

### Commands and evidence

- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-local.ps1 -PostgresBin 'C:\Program Files\PostgreSQL\18\bin' -DatabasePort 55463 -BackendPort 8086 -WebPort 5186` — real local Flyway startup; preserved logs in `.cache/local-demo/`.
- `node scripts/smoke-local.mjs` — 28 checks passed; `.cache/local-demo/smoke-summary.json`.
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check-local-data.ps1` — four checks passed; `.cache/local-demo/data-check-summary.json`.
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-issue6-fresh-seed.ps1 -PostgresBin 'C:\Program Files\PostgreSQL\18\bin'` — clean V001–V006 Flyway startup, eight V005 equipment rows with unique serial numbers, unchanged full-row data after repeat seeding and backend restart; `.cache/issue6-fresh-dd12b45a2a/`.
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-zhoufanhao.ps1 -PostgresBin 'C:\Program Files\PostgreSQL\18\bin'` — 590 backend and 30 UC03/UC05 integration cases passed; `.cache/issue6-db-test-rerun.log`, `app/target/surefire-reports/`, and `app/target/failsafe-reports/`.

The commands used Windows 11, PostgreSQL 18.6, Java 25 targeting release 17, and an isolated local Node 24.22.0 runtime. Input was the baseline revision plus this branch's uncommitted seed, checker and UC05 test changes. The PostgreSQL clusters, ports and logs belong to this worktree. No hosted CI, cloud database or independent member review is claimed.

### Upgrade and recovery assumptions

Flyway migrations are append-only; this branch does not edit V001–V006. Apply them to a backed-up database with no manual schema drift and verify Flyway history and smoke tests after startup. Take a PostgreSQL backup before upgrading; on failure, restore the backup to a fresh database, fix the cause and rerun the application rather than changing a previously merged migration. The local demo seed is guarded for the database named `serms_local_demo` and refuses unrelated records. Existing demo databases seeded by an older script may retain their old nullable V005 values; use a fresh isolated demo database for a complete V005 fixture, rather than overwriting later local edits. No production or cloud upgrade was tested.

### Follow-up and authorship

The integration owner should run the combined branch after merge. Human member acceptance, latest-HEAD CI and deployment remain separate checks. This code and entry were prepared and verified by Codex under the user's instruction; no human review or effort hours are claimed.

## 2026-10-16 Takeover: V001-V007 and a real upgrade path

Owner from 2026-10-16: Liu Tongyao (@cpg25ncu), on the repository owner's re-split recorded on #27 (past the D-012 deadline of Fri 01:06 SGT, no push since draft #79 opened). Branch: `feature/liu-tongyao-issue6-postgres-validation`, cut from Zhou Fanhao's #79 head `c29690d` with `main` `871ba3e` merged in, so the work above keeps its commits and authorship.

### What was changed

`scripts/test-issue6-fresh-seed.ps1` now runs two phases on one throw-away PostgreSQL 18 cluster with the application JAR and its real Flyway configuration:

1. **Fresh start:** an empty database migrates V001-V007; the demo seed creates eight V005 equipment rows with unique serial numbers; all six accounts start at `session_version` 0; a repeated seed and a real backend restart leave every row unchanged.
2. **Upgrade with data:** a new database is migrated only to V006 (`SPRING_FLYWAY_TARGET=6`) and seeded; the next start applies only V007. Users, roles, equipment and categories are unchanged apart from the new column, every account has `session_version` 0, and seeding again changes nothing.

The row snapshot leaves out `session_version`, so the same query compares the V006 and V007 states; the column is checked separately.

### Problems and fixes

| Symptom | Root cause | Fix | How it was verified |
| --- | --- | --- | --- |
| The new phase 2 stopped at `dropdb`: "database is being accessed by other users" (10 sessions). | `java.exe` on `PATH` is Oracle's `javapath` launcher, which starts the JVM as a child process. `Stop-Process` ended only the launcher, so the backend kept running with its 10 pooled connections. The original restart check was therefore not a real restart: the health check was answered by the backend that was still running. | Start the JDK's own `java.exe` from `JAVA_HOME`. After stopping, require that the health endpoint no longer answers, and use `dropdb --force`. | A process listing showed the leftover `jdk-25.0.4\bin\java.exe` from the failed run. After the fix, both phases passed and no Java process was left behind. |
| Flyway history values could be compared as `6:006` or `6:6`. | `version` is text. | Compare `max(version::int)`. | `7:7` after the fresh start; `6:6`, then `7:7`, on the upgrade path. |

### Verification

Windows 11, JDK 25.0.4 (target 17), PostgreSQL 18.6, Node.js 24.20.0, pnpm 11.19.0; branch head before commit = `b2be06e` plus the script change.

| Check | Result | Evidence |
| --- | --- | --- |
| `scripts/test-issue6-fresh-seed.ps1 -PostgresBin <PostgreSQL 18 bin>` | Passed both phases | `.cache/issue6-fresh-958efba837/`: `backend-fresh.log` applies 7 migrations to an empty schema; `backend-fresh-restart.log` "up to date"; `backend-upgrade-v006.log` applies 6; `backend-upgrade-v007.log` applies only 007 |
| `scripts/start-local.ps1 -SkipBuild` on ports 55471 / 8091 / 5191, then `scripts/check-local-data.ps1` | Passed, 4 of 4 | `.cache/local-demo/data-check-summary.json`; demo database Flyway history `001`-`007`, six accounts at `session_version` 0 |
| `node scripts/smoke-local.mjs` against that demo | Passed, 28 of 28 | `.cache/local-demo/smoke-summary.json` |
| Database and UC03/UC05 regression on PostgreSQL 18 | Left to the hosted jobs on the PR head ("Sprint 1 database", "Zhou Fanhao UC03 integration", "Notification and default PostgreSQL tests") | Not run locally in this session |

No production or cloud upgrade was run. The production database already went through V007 when #72 was deployed on 2026-10-15; this branch changes no migration.
