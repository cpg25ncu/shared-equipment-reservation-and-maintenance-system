# UC03 checkout lookup (#20)

Owner: Zhou Fanhao (@zfh-usedname) · Requirement: Proposal 5.5 / R3.1 · Branch: `feat/zhoufanhao-issue20-uc03-lookup` · Baseline: `0be0a29af011862824c6aaab642512241764bcd9`

## 2026-10-15 Checkout and active-loan search

### What was built

The checkout queue and loan list accept an optional `q` filter for reservation ID, borrower display name or email, and equipment asset tag. `CheckoutCandidate` and `LoanView` expose the asset tag. The custodian page offers a shared search box, equipment codes, reservation numbers, and distinct empty results. Existing checkout and return rules are unchanged.

### Design notes

The query keeps role authorization and borrower ownership predicates in the same SQL read as the search predicate. SQL wildcard characters in user input are escaped before a parameterized `ILIKE` match. Search state is included in TanStack Query keys so filtered results cannot reuse an unfiltered cache entry. Serial-number search remains optional until equipment management is integrated.

### Problems and fixes

| Symptom | Root cause | Fix | How it was verified |
| --- | --- | --- | --- |
| A new PostgreSQL test lost its authentication after a MockMvc request. | MockMvc restored the test thread's security context. | Reauthenticate before subsequent direct service calls. | `LoanPostgresIT`: 21 passed. |
| The complete UC03/UC05 suite expected its new overdue loan to be the first row. | The tests share an isolated database and earlier tests leave other active loans. | Check for the target loan in the response instead of assuming the first row. | `Uc05PostgresIT`: 10 passed within the full run. |
| Two frontend assertions timed out after the asset tag was added to the equipment label. | They expected the old exact text. | Assert the new visible label. | Loan component suite: 9 passed. |

### Verification

On Windows 11 with PostgreSQL 18.6, Java 25 compiling for release 17, and Node 24.22.0, `scripts/test-zhoufanhao.ps1 -PostgresBin 'C:\Program Files\PostgreSQL\18\bin'` passed: 590 backend tests and 31 UC03/UC05 PostgreSQL integration tests, with zero failures or skips. The database regression and historical upgrade checks also completed in the same script. `pnpm check:api`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, and the loan component suite passed. The generated OpenAPI types were committed with the API changes. These checks used isolated local databases and do not claim CI, member review, or deployment acceptance.

### Deviations

The optional serial-number search was not added; asset-tag lookup meets the Issue acceptance criteria without depending on #17.

### Follow-ups

The UC03 owner should review the contract update and complete member acceptance. The integration owner should verify the combined branch after merge.

### Authorship

The code, tests, and this log entry were generated and verified by Codex under the user's instruction. No member review or effort hours are claimed.

## 2026-10-16 Takeover, sync and secured service entry points

Owner from 2026-10-16: Liu Tongyao (@cpg25ncu), on the repository owner's re-split recorded on #27 (past the D-012 deadline of Thu 23:00 SGT, no push since draft #78 opened). Branch: `feature/liu-tongyao-issue20-uc03-lookup`, cut from Zhou Fanhao's #78 head `135af4e`, so the work above keeps its commits and authorship. As UC03 executor the owner also agreed to the #21 damaged-return defaults (`PHYSICAL_DAMAGE` / `HIGH`).

### What was changed

- Merged `main` `871ba3e` and the #81 branch (#17), which edits the same generated `frontend/src/api/schema.d.ts`; both merges were clean, and `pnpm check:api` against the regenerated `openapi.json` confirmed the merged schema is exactly what the generator produces.
- Removed the overloads `LoanService.list(boolean,int,int)` and `checkoutQueue(int,int)`, which `LoanPostgresIT` used. They had no `@PreAuthorize` / `@Transactional` and called the annotated methods on `this`, so Spring's proxies were bypassed and those tests did not exercise the role checks (finding 2 of the [agent review of #78](https://github.com/cpg25ncu/shared-equipment-reservation-and-maintenance-system/pull/78)). The tests now call the secured methods with `q = null`.

The optional items of #20 (serial-number search, moving the SQL into `loan/repository`) were not done.

### Verification

Windows 11, JDK 25.0.4 (target 17), PostgreSQL 18.6 throw-away cluster, Node.js 24.20.0, pnpm 11.19.0.

| Check | Result |
| --- | --- |
| `./mvnw -B -Puc03-postgres-it clean verify` with fresh `serms_test_app`, `_uc03`, `_uc05`, `_equipment` databases, after the overload removal | Passed: 685 unit/database tests; 38 integration cases (`LoanPostgresIT` 21, `Uc05PostgresIT` 10, `EquipmentManagementPostgresIT` 7); business coverage met |
| `OPENAPI_FILE=../app/target/openapi.json pnpm check:api` | Passed |
| `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` | Passed; 173 component tests |
| `pnpm test:e2e` (mocked API) | Passed, 16 paths |
| `node --test scripts/role-access.test.mjs` | Passed, 8 tests |

Hosted checks, the member check by Zhang Hanming and the deployed check are separate.

## 2026-10-17 Repository-layer extraction (Refs #20)

Primary human owner: Liu Tongyao (@cpg25ncu). Agent-prepared by Codex under the
owner's conversation request for two independent PRs before the code freeze. This
refactor PR must remain unmerged. Sole writer: this Codex session.

### Scope, baseline and rules read

Branch: `refactor/liu-tongyao-loan-repository`; worktree:
`C:/Users/14824/.codex/worktrees/serms-loan-repository/SWE5006_Group_Project`.
Base/rule baseline: main `da099e065225fed902a8b69f3b9914a1513f2625`.
Allowed source paths are the loan/equipment management services and their repositories;
the only documentation edits are this log and [the equipment log](issue-17-equipment-management.md).
No tests needed constructor changes. No frontend, migration, contract rule, workflow,
shared browser/policy script, testing index, agile/collaboration file or other checkout changed.
The response-header PR is separate and is not a dependency.

Read: `AGENTS.md`, `.github/CONTRIBUTING.md`, `docs/tech-stack.md` section 2.2,
`docs/testing.md`, `docs/contracts/README.md`, authentication/approval, equipment/reservation
and checkout/return contracts, ownership/agent-workflow guides, devlog/PR templates,
latest Issue #27 comments and the `serms-task`, `serms-worktree`, `serms-verify`,
`serms-pr` skills. The owner expressly permits retaining cross-module SQL inside these
repositories when no equivalent public service check exists; this is a bounded task
instruction, not a change to existing contract or collaboration rules.

### What moved and decisions

`LoanRepository` now owns every JdbcTemplate read/update, row mapping, list/search SQL,
equipment/reservation/loan locks, account-role queries and audit persistence formerly in
`LoanService`. The service retains validation, the original method-security and transaction
annotations, ownership rules, time/identifier decisions, state transitions and synchronous
event publication. Search validation and literal wildcard escaping still occur in the service;
the repository receives the prepared pattern. The repeated equipment-ID query is implemented
once and still called at both original points. The query text/result projections, predicates,
sorting, pagination, version checks, lock modes and call order are preserved.

Repositories have no transaction annotation and do not start a new transaction. Checkout and
return retain Equipment -> Reservation -> Loan -> MaintenanceCase locking in their existing
service transaction, including active-account `FOR SHARE OF u,ur` checks. Failure events,
loan changes, equipment state, maintenance and audits continue to roll back together.
The normal damaged-return path still calls the existing public `MaintenanceService.reportFault`.

### Remaining cross-module reads

| Table read by LoanRepository | Purpose and reason retained |
| --- | --- |
| `serms.reservation` | Equipment reference, reservation row locks, loan view/queue joins and active-loan lookup. Reservation/approval public services do not expose the same raw lookup and locking semantics. |
| `serms.equipment` | State `FOR UPDATE`, equipment names and asset tags. Public catalogue methods filter availability/retirement and do not supply this physical-handover lock. |
| `serms.app_user` | Borrower labels/email and ACTIVE account predicates; writes retain shared user locks. IdentityService.findById is a configurable-schema profile projection, not this same predicate/lock check. |
| `serms.user_role` | Membership checks and `FOR SHARE` membership locks; no equivalent public Identity locking method exists. |
| `serms.role` | Role codes joined to current account membership; no equivalent public active-role check exists. |
| `serms.maintenance_case` | Any OPEN/ASSIGNED/IN_PROGRESS case for equipment. Maintenance list/detail services apply different caller/visibility rules, not this existence predicate. |

Existing cross-module writes are also preserved, not newly introduced: reservation fulfillment,
equipment state updates, the retired-equipment damaged-return case (the public report service
rejects retired equipment), and `serms.audit_log` inserts. `audit_log` is not read here.
There is no access to another module's repository class. AdminAccess requires ADMIN alone,
so substituting it for custodian/borrower checks would change authorization.

### Actual verification

Windows, PowerShell 7, PostgreSQL 18.6 (`D:/ProfessionalApplications/PostgreSQL18/bin`),
JDK 25.0.4 from `JAVA_HOME/bin/java.exe` targeting Java 17, Maven Wrapper 3.9.11,
Node.js 24.20.0, pnpm 11.19.0. Tests used main baseline plus the four changed Java sources
now included in the PR; committing only adds logs/metadata. Exact tested source SHA-256s are
retained privately in `.cache/refactor-source-inputs.json`; correspondence is checked after
committing. The PR identifies the delivered HEAD and hosted results separately.

A throw-away loopback cluster used free port 55501. Fresh database/env-prefix pairs:
`serms_test_app` / `SERMS_APP_TEST_*`, `serms_test_uc03` / `SERMS_UC03_TEST_*`,
`serms_test_uc05` / `SERMS_UC05_TEST_*`, `serms_test_equipment` / `SERMS_EQUIPMENT_TEST_*`,
`serms_test_uc02` / `SERMS_UC02_TEST_*`, `serms_uc04_test` / `SERMS_UC04_TEST_*`.
Each prefix supplies JDBC_URL, DB_USER and DB_PASSWORD. UC04's fresh database was migrated
with all existing `V*.sql` in filename order using `psql -v ON_ERROR_STOP=1 -f`, as its workflow does.
UC02/UC04 used a second fresh cluster after correcting the fixture setup below; the already
successful full UC03 regression was not needlessly repeated.

| Command (app/ unless stated) | Actual result |
| --- | --- |
| `mvnw.cmd -B -Puc03-postgres-it clean verify` | 685 ordinary regression tests + LoanPostgresIT 21, Uc05PostgresIT 10, EquipmentManagementPostgresIT 7; zero failures/errors/skips |
| `mvnw.cmd -B -Puc04-postgres-it -Dit.test=MaintenancePostgresIT test-compile failsafe:integration-test failsafe:verify` | 30 passed, zero failures/errors/skips on the corrected fresh fixture |
| `mvnw.cmd -B -Puc02-postgres-it test-compile failsafe:integration-test failsafe:verify` | 30 passed, zero failures/errors/skips |
| Unchanged business coverage gate during verify | 1,630 covered / 1,675 total lines = 97.31%; the original nonempty aggregate service/domain >=70% rule passed; app/pom.xml unchanged |
| Root `pwsh -File scripts/check-coverage-gate.ps1` | Zero execution rejected by the unchanged gate; original bytes restored identically and gate passed |
| Root `pwsh -File scripts/start-local.ps1 -PostgresBin D:/ProfessionalApplications/PostgreSQL18/bin -JavaHome $env:JAVA_HOME -DatabasePort 55509 -BackendPort 8111 -WebPort 5211 -SkipBuild` | Fresh native demo started using the clean verify/package output and actual JAVA_HOME JVM |
| Root `node scripts/smoke-local.mjs` | 28/28 passed on the real demo |
| Root `node scripts/check-uc01-uc04.mjs` | 24/24 passed on the real demo |
| Root `pwsh -File scripts/stop-local.ps1` | Only this worktree's demo stopped; data/evidence preserved |
| SQL inventory / annotation / diff checks | Unique SQL literals and service transaction/security annotations match the base; no service JDBC or repository transaction boundary; whitespace check passed |
| Hosted checks, member review, production | Hosted results are recorded on the exact-head PR; member review and production verification remain separate |

Private logs/reports: `.cache/refactor-verification-5a4d69e0/` (685 + 38 and coverage),
`.cache/refactor-verification-5a864d98/` (UC04, UC02, negative/restore),
`.cache/demo-refactor-*.log` and `.cache/local-demo/*-summary.json`.
Both owned verification clusters and the demo were stopped. The demo scripts changed no
tracked evidence. Offline frozen-lockfile installation only produced ignored dependencies;
no frontend source or lockfile changed. No Docker command/image pull or production mutation ran.

### Problems, deviations and follow-up

| Symptom | Cause | Resolution and verification |
| --- | --- | --- |
| First UC04 invocation failed all fixture initializers before business execution. | The private throw-away cluster used trust authentication and supplied an empty password; UC04 intentionally requires a nonempty DB_PASSWORD env value. | Supply a generated test-only value to the private harness, create a second fresh cluster and rerun UC04: 30/30 passed, then UC02 30/30. Product/tests/guards were unchanged; the failed log is retained. |

No behavior/API/SQL-result, lock, authorization, contract or migration change is intended.
The existing regression tests were not edited, skipped or weakened. No source changes were
needed after the full regression. Recovery is a scoped revert through a separate PR. Owner/member
checks, any later combination with changed main, and deployed acceptance remain outstanding;
no Issue checkbox, merge, human approval, effort hours or team Done is claimed.
