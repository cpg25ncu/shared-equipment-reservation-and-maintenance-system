# SERMS acceptance close-out — 2026-10-17

Human task owner: Liu Tongyao (@cpg25ncu). Executor and sole writer: this Codex session.
Refs #24. Refs #18. Refs #8. Refs #9. Refs #27.
English record under D-003; agent-prepared technical evidence, with no human approval claimed.

## Scope, isolation and versions

The owner's pasted request authorizes independent worktrees, verification, specified Issue
bookkeeping, a successor to #86 when synchronization is required, and one documentation-only PR.
It explicitly excludes merges, production mutations, other agents' worktrees/branches,
`frontend/src` edits for #26, the loan-repository and header implementation work, Issues #17/#20
closure, Issue #10 changes and #27's body. Those boundaries are preserved.

The original checkout was detached at `74103d5c7b4f32dfb02d7514666d845a2b878db8`, with an
untracked proposal document; it was left untouched. App-managed worktrees:

| Purpose | Worktree below `C:/Users/14824/.codex/worktrees/` | Branch |
| --- | --- | --- |
| Current-main acceptance and documentation | `serms-acceptance-closeout-20261017/SWE5006_Group_Project` | `codex/acceptance-closeout-20261017` |
| #86 continuation and combined verification | `serms-issue24-final-pass-20261017/SWE5006_Group_Project` | `test/liu-tongyao-issue24-final-pass` |

Initial fetched main/rule baseline: `da099e065225fed902a8b69f3b9914a1513f2625`.
Original reviewed #86 HEAD: `1d876bd7eb2b845b8bac9f1228a4417ce43a0329`, base `eedd8c7`.
#86 was mergeable but behind strict up-to-date protection despite its 16 green checks.
Its original commit and Zhang Hanming's authorship are retained in [successor PR #90](https://github.com/cpg25ncu/shared-equipment-reservation-and-maintenance-system/pull/90).
The successor's additional changes repair only two browser harnesses and record the findings.
#86 was closed as superseded with an explicit preserved-authorship comment; it was not merged.

During execution, another session's #89 merged as `05e749cfa9590e03dc253e02e87935b54aaa9523`.
Both owned branches were synchronized. That advance changes only `web/nginx.conf`,
`scripts/verify-compose.mjs` and the header devlog. All `app/` and `frontend/` source/test inputs
are identical to the original tested main; this was checked with `git diff --exit-code`.
Subsequently #91 merged as `cbbb3033941347f9990221436ed51d657ddb10a7`, changing loan and equipment persistence. Both owned branches were synchronized again. Unlike the header-only advance, this affected actual business inputs, so a new native backend regression and a fresh real API/browser sequence were run on the new combination. The stopped earlier demo, its credentials, database and reports were preserved under ignored `.cache/acceptance-before-cbbb303/`; no rows were deleted. Final successor HEAD: `5eec1cf41fafe72825041c0b03997eec3051ffde`. The only additional change after `3cbf8c4` is transport-specific React bootstrap handling in the role harness and its devlog; backend/frontend/UC02 inputs are byte-identical.

Rules actually read: `AGENTS.md`, `.github/CONTRIBUTING.md`, `docs/testing.md`,
`docs/local-demo.md`, `docs/tech-stack.md`, `docs/contracts/README.md`,
`docs/contracts/equipment-and-reservation.md`, `docs/contracts/auth-and-approval.md`,
`docs/collaboration/ownership.md`, `docs/collaboration/agent-workflow.md`,
`docs/collaboration/decisions.md`, `docs/devlog/README.md`, `.github/pull_request_template.md`,
and `.agents/skills/{serms-worktree,serms-task,serms-verify,serms-review,serms-pr,serms-integrate}/SKILL.md`.
The latest #27 comments and every acted-on Issue's body/comments were read. When the live
#18/#8 bodies proved already checked, the owner explicitly clarified in this conversation:
preserve local-scope checks and close after passing; production acceptance remains separate.
No delegation, ownership reassignment, protection change or new contract decision was made.

Windows, JDK 25.0.4 targeting Java 17, Maven Wrapper 3.9.11, Node 24.20.0,
manifest-matching pnpm 11.19.0, native PostgreSQL 18.6 (plus test-owned PostgreSQL 18 Testcontainers in the existing equipment integration suite), Playwright 1.63.0/Chromium.
All real runs used the existing React/Spring/PostgreSQL implementation, loopback-only ports
55511/8121/5221, private generated credentials and synthetic data. No shared Docker container
was stopped/pruned and no image was pulled locally.

## Commands and actual results

Commands run from the appropriate owned root unless a directory is stated. JDK `bin` and
`D:/ProfessionalApplications/NodeJS` were first placed on PATH; the Oracle javapath launcher
was not used. Startup ran with `-KeepAlive` to preserve its owned services between shell calls.

```powershell
# app/ in each owned worktree
./mvnw.cmd -B -q clean package -DskipTests
# frontend/ in each owned worktree
pnpm install --frozen-lockfile
# owned repository root
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-local.ps1 `
  -PostgresBin 'D:\ProfessionalApplications\PostgreSQL18\bin' `
  -DatabasePort 55511 -BackendPort 8121 -WebPort 5221 -SkipBuild -KeepAlive
```

| Check | Actual input and result |
| --- | --- |
| Current-main `node scripts/smoke-local.mjs` | **passed**, 28 checks, main `da099e0` |
| Current-main `node scripts/check-uc01-uc04.mjs` | **passed**, 24 checks, main `da099e0` |
| Current-main `node scripts/check-uc01-uc04-browser.mjs` | Stock harness **failed** at 9/10; identical-main product plus disclosed one-line harness repair from `aa848c7` **passed**, 10/10 |
| Current-main `node scripts/check-admin-browser.mjs` | **passed**, desktop/mobile compound scenarios |
| Current-main `node scripts/check-admin-security-browser.mjs` | **passed**, desktop/mobile compound scenarios |
| `scripts/test-uc02.ps1 -PostgresBin <PG18> -IncludeLoanIntegration` | **passed**, 685 ordinary regression + 30 UC02 PostgreSQL + 38 UC03/UC05/equipment PostgreSQL; no failures/errors/skips; rerun on final `3cbf8c4` after #91 (the earlier pass on `517b306` is retained separately) |
| `scripts/check-coverage-gate.ps1` | **passed**, deliberate zero execution fails at 0.00/0.70; original bytes restored and unchanged gate passes; business line coverage **1308 / 1676 = 78.04%** on final HEAD (earlier `517b306`: 1308/1738 = 75.26%) |
| Frontend `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` | **passed**, 174 component tests; chart/chunk and JDK/agent warnings retained as nonfatal |
| `OPENAPI_FILE=../app/target/openapi.json pnpm check:api` | **passed**, actual backend export |
| `node --test scripts/role-access.test.mjs` | **passed**, nine policy tests |
| All 16 mocked E2E cases | **passed** on dedicated 5222 with two workers; ignored config copy changes only root/port/server reuse, original assertions/timeouts retained |
| Real five-role `node scripts/check-uc02-browser.mjs` | **passed**, 37 checks on `3cbf8c4` (same application/UC02 harness inputs at final HEAD); earlier `3e3f69b` pass retained separately; temporary dual role restored |
| Real `node scripts/check-role-browser.mjs` | **passed**, 66 groups; 16 routes/224 page observations, 27 read families/378 reads, 23 mutation families/210 denied writes, four cross-user denials; fingerprints unchanged; one recorded transport-only bootstrap retry |
| Real `node scripts/check-equipment-management-browser.mjs` | **passed**, 16 checks, CUSTODIAN/ADMIN at desktop/mobile |
| Real administrator checks after matrix/management | **passed**, two compound viewport scenarios per runner on final HEAD |
| Final `node scripts/check-uc01-uc04-browser.mjs` | **passed**, 10/10 on final HEAD |
| `node scripts/check-collaboration.mjs`, `git diff --check` | **passed**, collaboration checker (19 docs/seven skills), source/PNG hash checks and whitespace checks |
| Hosted #90 CI | **passed**, all 16 on `5eec1cf41fafe72825041c0b03997eec3051ffde` |

The 685 ordinary cases include unit/API, test-only H2 and configured database cases; they are
not described as 685 PostgreSQL-only tests. The mocked browser suite is separate from actual
same-origin browser/API/database evidence. Safe observations, input hashes and screenshot hashes
are in [verification.json](../evidence/acceptance-20261017/verification.json).

The live order followed the #86 evidence runbook: five-role workflow → role matrix → equipment
management → admin creation/audit → admin security. A final UC01/UC04 run exercises the repaired
assertion. The first two runners' six-account guard was preserved; administrator fixtures were
created only afterward. Failures retained history and cancelled only their own unissued fixtures.
Tracked historical screenshots overwritten by the UC01 runner were restored.

## Per-Issue acceptance

| Issue | Verified mapping and disposition |
| --- | --- |
| #24 | Existing coverage gate and #8 bookkeeping retained. Fresh 37-check workflow plus full matrix/management/admin evidence covers the two remaining mandatory final-pass criteria. Four mandatory items are now checked; Issue remains open for integration/owner handling. Optional shared Testcontainers-base refactor remains unchecked/not run. #90 is the owner-merge candidate; no merge is performed. |
| #18 | All seven existing checks preserved under the owner's clarified local scope; **closed** with one agent evidence comment. User API/roles/400-403-409, encoder/reset, disable/re-enable/two-session invalidation, self/last-admin protection including concurrency, transactional secret-free audit/rollback, filtered paged audit viewer and ADMIN-only pages are covered by merged #72 code/tests plus fresh main admin runs. First-admin bootstrap remains #41/#43, Liu's contribution. |
| #8 | All six existing checks preserved; **closed** under the clarified local scope. Separate approve/reject and dual-role self-denial; full browser handover/repair; exact menus vs backend; desktop/mobile normal/empty states with error cases clearly distinguished as component/mocked tests; quality checks; repeatable real-stack scripts/evidence. |
| #9 | Two UC01 items newly checked; **closed**, all five now checked. Main API verifies search/reserve/cancel, overlap 409, retired 404 and open-fault 409; both browser viewports complete UC01 and the repaired harness completes 10/10. Existing UC04/workflow checks preserved. |
| #5 | All six checks already ticked and main evidence present; **closed** as explicitly authorized owner bookkeeping. Delivery: #11 (`f077ce7`), #14 (`b3def12`) and Boot 4 integration. Fresh build/start/smoke/browser/shutdown support local run. |
| #7 | All five checks already ticked and main evidence present; **closed** as authorized bookkeeping, preserving Wang Yuanmeng's work in #12 (`0345a50`); #39 (`f9596c1`) supplies supporting operations evidence. No new full overdue-browser run is claimed. |
| #19 | All six implementation checks already ticked; **closed** as authorized bookkeeping. #12 delivers scanner/listeners/readable text/overdue view/reminder cancellation/isolation and the documented NotificationChannel deviation; #39 operations evidence remains separate. Both merge SHAs are ancestors of main. |
| #17 / #20 | **left open and unmodified**; signed-in production checks remain with the owner. |
| #10 / #26 / #27 body | **unmodified** by this session; deployment/visual work remains with its assigned session/owner. |

UC01 approval review: `ReservationService.submit` selects `PENDING_APPROVAL` or `CONFIRMED`,
persists and emits `ReservationSubmitted`; it does not implement approval decisions.
`ApprovalService.decide` invokes the existing `ApprovalPolicyChain`, transitions through
`ReservationApprovalPort`, records the decision and emits `ReservationDecided` transactionally.
The API run submitted a pending request and confirmed it through the existing UC02 decision API.
There is no duplicated UC02 decision logic in the reviewed UC01 service.

## Problems, causes and repairs

| Symptom | Cause and response | Verification |
| --- | --- | --- |
| Sandbox Git/network/write failures | Main Git metadata/app worktrees are outside writable sandbox roots; retried the required commands with normal escalation | Fetch/build/isolated worktree operations succeeded; no alternate-tool permission bypass |
| #18/#8 described as unticked, live bodies already checked | Earlier acceptance bookkeeping had occurred | Preserved live bodies; owner explicitly confirmed local-scope closure |
| #86 behind main despite green CI | Strict current-base protection and newer main commits | New owner-authorized branch retains `1d876bd`; main synchronized without pushing to Zhang's branch |
| Stock UC01/UC04 mobile final assertion matches seven Available labels | Global locator races filtered search refresh | Scope to the repaired `DEMO-LIG-01` row; main product then 10/10; same fix in #90 |
| Stock main five-role runner rejects Manage equipment menu | Stale duplicated expected menu | Existing #86 independent policy inventory fixes it; all five roles then verified |
| Combined checkout button stays disabled | Node wait crossed the time boundary before the browser clock; trace queue request 17:26:59.347Z vs reservation start 17:27:00Z | Wait on browser's real `Date.now()` before navigation; no fake clock/forced click; both actual handovers passed |
| Five-role final availability has same broad locator | Search refresh could expose unrelated Available badges | Scope to the actual synthetic fixture asset; 37 live checks passed |
| First mocked E2E command did not start | Colon in generated Windows log filename | Windows-safe filename; report this attempt as not run, not passed |
| Default 12-worker mocked E2E: 12 login timeouts, four passes | Local high-concurrency/cold Vite run; isolated port/two-worker rerun avoids shared resources | Same 16 cases passed, original assertions/timeouts preserved; exact failure not relabelled as a product defect |
| Matrix attempts lose denied-route UI/login in blank frames | Logs show report-triggered Vite reloads and a trace has ERR_NETWORK_CHANGED. A later sequential attempt also lost an empty login bootstrap, so concurrency alone is not a proven cause. The role harness permits at most two retries only for an empty React root with an observed net::ERR_NETWORK_CHANGED; policy/API/write assertions are outside that retry and unchanged | Earlier owned-runtime restart passed the unchanged matrix on 7e7a776. A later run after #91 lost a final login bootstrap; the final 5eec1cf guarded only transport-interrupted empty-root bootstrap, recorded one such retry, and passed all 66 groups without retrying or relaxing policy/API/write assertions. |

## CI, handover and remaining acceptance

[PR #90](https://github.com/cpg25ncu/shared-equipment-reservation-and-maintenance-system/pull/90) is Ready for Review, mergeable and synchronized with main cbbb303 at verification. All 16 exact-head checks are successful; [CI snapshot](../evidence/acceptance-20261017/ci-pr90.json) retains the job links. Latest main fetch: 2026-10-17 01:45:39 +08:00. The documentation PR has its own later CI; its result is not substituted for the code/test PR. #86 is superseded/closed, with original 1d876bd ancestry retained.

This is local technical/agent evidence and specified owner bookkeeping, not an independent
team-member check or human approving review. Production business workflows were not exercised;
no real production account was reset/disabled and no production transaction was created.
Local Compose/production nginx acceptance was not run; the hosted release checks remain their
own evidence. The optional shared Testcontainers refactor was not implemented. Merges,
production deployment and team Done were not performed or claimed.

Both current-main and final-combination demo services were stopped with scripts/stop-local.ps1. Native test clusters were stopped by their test script; existing test-owned Testcontainers followed their normal lifecycle. No shared container was manually stopped/pruned. Historical screenshots were restored; the successor worktree is clean.
Ignored `.cache/` retains databases, generated credentials, raw traces and logs locally; none is
staged or published. Worktrees and branches are retained for owner review. The repository owner's
requested review and any GitHub limitation are recorded on the documentation PR.

## Authorship

Zhang Hanming's #46/#72/#86 implementation and original evidence remain his contributions.
Wang Yuanmeng's #12/#39 and other contributors' merged work retain their authorship. Liu
Tongyao owns this acceptance task; Codex performed the new reruns, isolated continuation,
test-only repairs, issue bookkeeping and this record. No hours, human executions or approvals
were invented.
