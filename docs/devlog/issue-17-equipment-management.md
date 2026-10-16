# Equipment and category management (#17)

Owner: Zhou Fanhao (@zfh-usedname) · Branch: `feat/zhoufanhao-issue17-equipment-management` · Baseline: `0be0a29af011862824c6aaab642512241764bcd9`

## 2026-10-15: management API and page

### What was built

The CUSTODIAN and ADMIN management API provides equipment list, registration, update, retirement, and category list/create/rename operations under `/api/v1/equipment/manage`. It validates all editable V005 fields, checks the account's current active role, returns field-level 400/409 problems, and uses optimistic equipment versions for updates and retirement. The category rename follows V005's foreign key and retains existing equipment associations. Normal equipment status changes remain with loan and maintenance; retirement rejects an active loan. Register, update, retire and category writes create audit entries in the same transaction.

The management page exposes the same operations with a category selector, editable condition and maximum duration, field errors, role-gated navigation, and retirement confirmation. The OpenAPI TypeScript schema and equipment contract were updated with the API. The UC01 executor [confirmed the additive contract on issue #17](https://github.com/cpg25ncu/shared-equipment-reservation-and-maintenance-system/issues/17#issuecomment-6194512815), with a request to document the behavior of reservations that already exist when an item is retired. This confirms compatibility only, not review or acceptance of the full PR.

### Design decisions

The API uses the existing V005 equipment columns and category table, with no migration change. Serial number and maximum duration remain optional; null duration uses the global reservation limit. A retired item stays in the management list and the existing UC01 search exclusion continues to apply. The service locks an equipment row while checking version and active-loan retirement rules, and database unique constraints settle concurrent duplicate registration. Category records do not have UUID keys, so audit references use a stable name-derived UUID. Management mutations invalidate both management and UC01 equipment query caches.

### Problems and fixes

| Symptom | Root cause | Fix | Verification |
| --- | --- | --- | --- |
| The first isolated integration run lacked the application test database. | Existing unit tests in the full Maven verify need `SERMS_APP_TEST_JDBC_URL` in addition to the new management database. | Create both databases and set both test connection groups in the runner. | Full unit suite and management PostgreSQL integration passed. |
| One MockMvc test returned 400 rather than the expected 403. | The forbidden POST sent an invalid body, so request validation ran before method authorization. | Send a valid body to test the authorization boundary. | All six `EquipmentManagementPostgresIT` cases passed. |
| Navigation tests expected management to remain unavailable. | The feature enables its route and menu item. | Update the reserved-page and ADMIN menu assertions. | Full frontend suite passed 140 tests. |
| The complete UC03/UC05 run failed in an overdue assertion. | The shared integration database had more than one overdue loan, so the test's first-row assumption was false. | Match the loan in the response without assuming its position. | Complete UC03/UC05 rerun passed 30 integration cases. |
| The first hosted frontend check failed its route inventory. | The independent role-access matrix still classified `/manage/equipment` as future work. | Add the implemented page, menu position, management reads and denied registration write to the explicit matrix. | `node --test scripts/role-access.test.mjs`: eight passed; latest-HEAD CI must rerun. |

### Verification

On Windows 11 with PostgreSQL 18.6, Java 25 targeting release 17, and Node 24.22.0, `scripts/test-issue17-equipment.ps1 -PostgresBin 'C:\Program Files\PostgreSQL\18\bin'` passed 590 unit/database tests and six management PostgreSQL integration cases, with zero failures or skips. Reports are under `app/target/surefire-reports/` and `app/target/failsafe-reports/`; the full command output is in ignored `.cache/issue17-db-test-final.log`. `pnpm check:api`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm test` passed; the component run had 140 passing tests. `pnpm exec playwright test e2e/equipment-management.spec.ts` passed one mocked API browser path in desktop and mobile projects. These checks were on the pre-sync branch head. All 16 hosted CI checks passed on `6e6c9a8`; the new synchronized head requires its own checks. Member review and deployment have not occurred.

The complete `scripts/test-zhoufanhao.ps1 -PostgresBin 'C:\Program Files\PostgreSQL\18\bin'` rerun also passed 590 backend and 30 UC03/UC05 PostgreSQL integration cases after the overdue assertion fix. Its output is in ignored `.cache/issue17-regression-final.log`.

Existing V004-to-V005 upgrade-with-data checks in `EquipmentMasterDataPostgresTest` ran as part of the full suite (five passing cases). The dedicated management cases cover duplicate fields, concurrent registration, role and input rejection, category rename, audit rollback, and retirement. V005/V006 migration files were not edited.

### Deviations and follow-up

The V005 migration, UC01 read fields and demo seed work were transferred to issue #40 and are already in the baseline. The UC01 executor confirmed the management contract, and section 2.4 now states that existing `PENDING` and `CONFIRMED` reservations remain after retirement while checkout rejects handover. The integration owner should run combined-branch checks after merge. This code and entry were prepared and verified by Codex under the user's instruction; no human review or effort hours are claimed.

### Main synchronization after UC01 confirmation

The integration branch was synchronized with upstream `main` at `871ba3e` after the UC01 reply. Merge conflicts in the generated API schema, navigation assertion, and role-access matrix combined the new equipment page with the newly merged admin pages. The API schema was regenerated from the synchronized backend rather than hand-edited.

On the synchronized, uncommitted merge inputs, `scripts/test-issue17-equipment.ps1 -PostgresBin 'C:\Program Files\PostgreSQL\18\bin'` passed 685 backend tests and six management PostgreSQL integration cases; `scripts/test-zhoufanhao.ps1` passed 685 backend and 30 UC03/UC05 integration cases. Both had zero failures or skips. Logs are preserved in `.cache/issue17-main-sync-management.log` and `.cache/issue17-main-sync-regression.log`. `pnpm gen:api`, `pnpm check:api`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test` (172 passing tests), `pnpm test:e2e` (16 desktop/mobile paths), and `node --test scripts/role-access.test.mjs` (eight passing tests) also passed. The new merge commit and its hosted checks must be verified separately.

## 2026-10-16 Takeover, CI inclusion and category names

Owner from 2026-10-16: Liu Tongyao (@cpg25ncu), on the repository owner's re-split recorded on #27 (the Issue was past its D-012 deadline with no activity since Thu 23:04 SGT). Branch: `feature/liu-tongyao-issue17-equipment-management`, cut from Zhou Fanhao's #80 head `32cf32b`, so the work above keeps its commits and authorship. Baseline: `main` `871ba3e`.

### What was built

- `EquipmentManagementPostgresIT` is now part of the `uc03-postgres-it` failsafe profile, so the hosted "Zhou Fanhao UC03 integration" and "Notification and default PostgreSQL tests" jobs run it against Testcontainers PostgreSQL 18.
- Category create and rename refuse names containing `/`, `\`, `%` or `;` with 400 and field `name`; contract section 2.4 states the rule. One new integration case covers it.

### Problems and fixes

| Symptom | Root cause | Fix | How it was verified |
| --- | --- | --- | --- |
| The agent review of #80 found the six real-PostgreSQL cases in none of the 11 hosted runs on `32cf32b`; all checks were still green. | Failsafe runs only in profiles, and no profile included the new class (`uc03` lists Loan and Uc05, `uc02` Approval, the maintenance job narrows `uc04` with `-Dit.test`). | Add the class to the `uc03-postgres-it` includes. | Hosted job logs on the new head must show `EquipmentManagementPostgresIT` with seven tests. |
| A category such as `Audio/Video` could be created but, by inference from the firewall defaults, never renamed. | Rename takes the current name as a path variable; Spring Security's `StrictHttpFirewall` rejects encoded `/`, `\`, `%` and `;`. | Validate category names on create and rename. | New case `categoryNamesThatCannotBeRenamedThroughThePathAreRejected`. |
| The new case first failed with `AuthenticationCredentialsNotFound`. | MockMvc clears the test security context after `perform`, so the following direct service call had no principal. | Authenticate again before calling the service, as `invalidFieldsAndRevokedRoleAreRejected` already does. | Rerun below. |

### Verification

Windows 11, JDK 25.0.4 targeting 17, PostgreSQL 18.6 in a throw-away cluster: `./mvnw -B -Puc03-postgres-it -Dit.test=EquipmentManagementPostgresIT clean verify` with `SERMS_EQUIPMENT_TEST_*` and `SERMS_APP_TEST_*` pointing at fresh databases passed 685 unit/database tests and 7 of 7 management integration cases, and the business coverage check was met. Before the change, the agent ran the six original cases on `32cf32b` the same way (6 of 6 passed). Frontend checks were not rerun: no frontend or API-schema file changed. Hosted checks, the deployed check of `/manage/equipment` and team acceptance are separate.

## 2026-10-17 Cross-check follow-up: "." and ".." category names

Zhang Hanming's agent-assisted cross-check of #81 ([comment](https://github.com/cpg25ncu/shared-equipment-reservation-and-maintenance-system/pull/81#issuecomment-6210867283)) found a gap in the 2026-10-16 category-name rule.

| Symptom | Root cause | Fix | How it was verified |
| --- | --- | --- | --- |
| In a real Chromium session, a category named `.` or `..` was created (201) but could not be renamed (404); the old name stayed. | Browsers resolve `.` and `..` URL path segments before sending, so `PATCH .../categories/..` reaches a different path. The 2026-10-16 check covered only encoded characters. | Create and rename also refuse an exact trimmed `.` or `..` (400, field `name`); contract 2.4 says so. | `EquipmentManagementPostgresIT`: the rejected-name case now includes `.`, `..` and ` .. `, plus a rename to `..`; `./mvnw -Puc03-postgres-it -Dit.test=EquipmentManagementPostgresIT clean verify` on PostgreSQL 18.6 passed 685 unit/database tests and 7/7 integration cases. Hanming's report also confirmed that normal renames work. |

## 2026-10-17 Equipment management repository extraction (Refs #17, Refs #20)

Primary human owner: Liu Tongyao (@cpg25ncu). Agent-prepared by Codex under the owner's
bounded repository-layer task. Same independent branch/worktree as the loan extraction:
`refactor/liu-tongyao-loan-repository`,
`C:/Users/14824/.codex/worktrees/serms-loan-repository/SWE5006_Group_Project`.
Base/rule baseline: main `da099e065225fed902a8b69f3b9914a1513f2625`.
Sole writer: this Codex session. No merge is authorized for this task.

### What moved and decisions

`EquipmentManagementRepository` owns all management JdbcTemplate queries/updates, SQL columns,
row mapping, categories, equipment locks, active-loan/account projections and audit persistence.
`EquipmentManagementService` still decides validation, allowed actions, retirement conflicts,
normalization, duplicate-field errors, audit action/entity names and version-conflict handling.
Every original service transaction and `@PreAuthorize` annotation remains unchanged; the repository
has no transaction boundary. `EquipmentSearchRepository` was not modified.

The internal repository `EquipmentRow` is a data projection. The service maps it to the original
public `ManagedEquipment` record, preserving controller/API/OpenAPI type identity and field/null/
duration values without a repository dependency on the service or API layer. Lists remain mutable
ArrayLists, as with the former JDBC result. SQL, argument ordering and the equipment `FOR UPDATE`
lock stay in the original service call sequence and transaction. Category-name and retired-item
rules, rollback and optimistic versions are unchanged. No tests required wiring edits.

### Remaining cross-module reads

| Table read by EquipmentManagementRepository | Purpose and reason retained |
| --- | --- |
| `serms.app_user` | ACTIVE management-account predicate. IdentityService.findById is a configurable-schema profile projection rather than this same exact check; AdminAccess is ADMIN-only and would deny custodians. |
| `serms.user_role`, `serms.role` | Current CUSTODIAN/ADMIN membership in the same existence query; no equivalent public management-account predicate is exposed. |
| `serms.loan`, `serms.reservation` | Any ACTIVE loan linked to this equipment before retirement. LoanService exposes caller-scoped loan lists/details, not an equipment-level existence method; substituting it would change visibility and authorization. |

`serms.equipment` and `serms.equipment_category` are this module's own tables. The existing
`serms.audit_log` INSERT is preserved (no read). There is no access to another module's
repository. Retaining these queries when no same-check public service exists is explicitly
within the owner's current task instruction; no established contract rule is edited.

### Verification, problems and acceptance

The exact rules read, tested inputs, environment, six isolated database/env mappings, commands,
report locations and the corrected UC04 fixture failure are recorded in
[the dated UC03 section](issue-20-uc03-lookup.md#2026-10-17-repository-layer-extraction-refs-20).
Both services and both new repositories were tested together on the base plus their uncommitted
source content, retained by SHA-256 and checked after committing.

- `mvnw.cmd -B -Puc03-postgres-it clean verify`: 685 ordinary regression + 38 integration tests,
  including all 7 EquipmentManagementPostgresIT cases; zero failures/errors/skips.
- Workflow-equivalent UC04: 30/30; UC02: 30/30, zero failures/errors/skips.
- Unchanged service/domain coverage gate: 1,630 / 1,675 = 97.31%, minimum 70%; actual zero-coverage
  rejection and byte-identical restore/recheck passed. Moving SQL changes the lines in service
  scope naturally; no coverage configuration or threshold was changed.
- Real local demo at 55509/8111/5211: smoke 28/28 and UC01/UC04 API 24/24; clean package/actual
  JAVA_HOME JVM; the demo and both verification clusters were stopped.
- Unique SQL literals, service transaction/security annotations and diff whitespace were checked.
  Tests, API/schema, frontend, migrations, workflows, shared acceptance scripts and other agents'
  worktrees were not edited. No tracked evidence needed restoration.

No new product defect or rule conflict was found during extraction. The initial UC04 environment
failure was repaired only in the private harness and successfully rechecked; it is not concealed
as an initial pass. No behavior deviation is intended. Full hosted checks must be green on the
PR head; those exact-head results are recorded on the PR. Member review, main integration,
deployment and team acceptance remain separate. The owner requested review from @cpg25ncu and
@Hanming1008; GitHub does not permit an author to be their own requested reviewer. Keep the PR
unmerged and do not change Issue state. No human approval, hours or team Done is claimed.
