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
