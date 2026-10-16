# Final local quality verification — 2026-10-16

Human owner: Zhang Hanming (`Hanming1008`). Executor: Codex agent. Refs #24.
This is actual local technical evidence, not an independently performed human check, approving
review, production test, Issue closure or team Done.

## Inputs and environment

Branch `codex/hanming-final-acceptance-20261016`, starting HEAD/fetched main
`eedd8c7c2909536e9c7f4084a0a1280adcaa6cf0`, **plus the uncommitted verification-script changes**
listed by hashes in [verification.json](verification.json). Product Java/React code, migrations,
contracts and coverage thresholds are unchanged. Main's only change since the already built
`92cca31` is a development-log Markdown file; the retained isolated runtime JAR is built from
that identical product source. This is not a claim of a future delivered commit's CI result.

Windows; JDK 25.0.4 (target Java 17), Maven Wrapper 3.9.11, PostgreSQL 18.6,
Node 24.19.0, pnpm 11.25.0 (manifest pins 11.19.0), Playwright 1.63.0 / Chromium.
The React/Vite → Spring → PostgreSQL demo uses loopback ports 5199 / 8099 / 55493, owned only
by this checkout. It preserves earlier UC01 synthetic history. No production credentials,
external notifications, mock APIs, fake clocks or transaction-history resets are used for the
real browser checks. The separate mocked E2E suite below is labelled explicitly.

## Actual results

| Check | Result |
| --- | --- |
| Complete ordinary backend regression | **685 passed**, zero failures/errors/skips |
| UC02 real PostgreSQL integration | **30 passed**, zero failures/errors/skips |
| Business coverage | **1,307 covered / 430 missed lines = 75.24%**; aggregate production service/domain scope, minimum 70%; 158 classes analyzed |
| Actual gate negative/restore exercise | Zero-execution data rejected specifically at 0.00 vs 0.70; original execution bytes restored identically; same gate passed |
| Frontend lint / typecheck / component tests | Passed; **174 tests / 15 files**; existing chart-size warnings retained |
| Actual generated backend API types / production frontend build | Passed; nonfatal annotation/chunk warnings retained |
| Mocked Playwright contracts | **16 passed**, desktop/mobile; not substituted for live database evidence |
| Explicit policy Node tests | **9 passed**, including current equipment-management menus and all mutation families |
| Real five-role workflow | **37 checks passed**, desktop/mobile, 16:26:44–16:30:09 SGT |
| Real complete-page role matrix | **66 groups passed**; 16 routes / **224 page observations**, 27 read families / **378 API observations**, 23 mutation families / **210 denied writes**, **4 cross-user denials**; 16:30:34–16:33:21 SGT |
| Real equipment-management workflow | **16 checks passed** across CUSTODIAN/ADMIN × desktop/mobile; 16:34:04–16:34:20 SGT |
| Real administrator create/name/audit workflow | **2 compound viewport scenarios passed**; 16:34:21–16:34:31 SGT |
| Real administrator cross-session security | **2 compound viewport scenarios passed**; 16:34:33–16:34:52 SGT |

The 685 ordinary tests include their configured real database cases as well as unit/API and
test-only H2 benches; they are not described as 685 PostgreSQL-only tests. The UC03/UC05 and
equipment failsafe profile was not separately rerun in this #24 delivery; the main-flow browser
observations do not substitute for those integration suites.

The five-role flow covers actual reservation, required rejection comment, rejection releasing
allocation, independent approval, persisted notification delivery/read, physical checkout,
damaged return requiring a note, automatically linked maintenance, assignment/diagnosis/repair,
restored availability, administrator reports, and both forged self-decision choices with no
status/version/decision/audit/notification side effects. Its temporary dual-role fixture was
restored before the role matrix.

The role matrix covers anonymous, all five single-role accounts and a second borrower, at
1440×1000 and 390×844. It checks actual menus, direct route content/denial/login states, backend
roles/ownership, missing CSRF vs forbidden responses, real logout, overdue sorting/empty states,
and viewport fit. Before/after fingerprints of users, roles, equipment, **categories**,
reservations, decisions, loans, maintenance, audit and notification read state remain unchanged.

Equipment management uses actual UI category creation, registration (serial number, approval
flag and item duration), versioned update, ordinary category rename cascading to an existing
item, explicit retirement confirmation, retained retired history and exclusion from search.
Administrator scenarios create synthetic accounts, rename/search them, read audit, sign in as
the created user and verify denied administrator access. Security scenarios use two independent
old cookie sessions per target: roles, disable/activate and password resets revoke the old
sessions; disabled/old-password login is denied, reactivation does not resurrect old sessions,
new credentials work, security version reaches 4 and five committed actions each have one audit.

## Changes and issues encountered

1. The complete-workflow harness had stale duplicate menus after #81. It now imports expected
   menus from the existing **explicit policy inventory**, not from rendered UI or navigation
   implementation. Node expectations explicitly include Manage equipment for CUSTODIAN/ADMIN.
2. Extended role-denied probes to equipment update/retirement and category creation/rename, not
   merely registration, and added categories to the no-side-effect SQL snapshot.
3. Added `scripts/check-equipment-management-browser.mjs`, reusing local-demo identity/session
   facilities. All writes go through the actual UI; raw traces stay private.
4. Native `test-uc02.ps1` stopped at `pg_ctl` startup on Windows because captured output handles
   were inherited by the long-running server/launcher descendants. The interrupted invocation
   was not counted as passing. Only its verified owned launcher/cluster were stopped, with logs
   retained. A separate native harness first passed 685 + 30 and the gate exercise. Then the
   formal script was repaired using hidden `Start-Process`, separate output, timeout, process
   refresh and an actual `pg_ctl status` check, matching the repository's existing native pattern.
   The **formal repaired script was independently rerun in full**: 685 + 30 passed (16:39:01 SGT),
   then the negative/restore exercise passed (16:39:17 SGT). Docker behavior is unchanged and
   was not locally executed.
5. A sandbox pnpm symlink permission failure prevented an initial API/build command from
   starting; an immediate retry was deferred while backend `clean` had removed its generated
   OpenAPI file. Neither is called a product failure or pass. With the completed real export
   and normal local permissions, final build/API checks passed at 16:39:45 / 16:39:47 SGT.

## Reproduction and private evidence

From the repository root, use Java 17+ and an isolated PostgreSQL 18 runtime:

```powershell
pwsh -NoProfile -File scripts/test-uc02.ps1 -PostgresBin '<PostgreSQL 18 bin>'
pwsh -NoProfile -File scripts/check-coverage-gate.ps1
node --test scripts/role-access.test.mjs
```

For browser verification, follow [local startup](../../local-demo.md) on a dedicated fresh
six-account demo. Preserve existing data and use another isolated worktree/cluster when needed;
do not weaken the six-account guard or delete accounts/history to obtain passes. Execute in order:

```powershell
node scripts/check-uc02-browser.mjs
node scripts/check-role-browser.mjs
node scripts/check-equipment-management-browser.mjs
node scripts/check-admin-browser.mjs
node scripts/check-admin-security-browser.mjs
pwsh -NoProfile -File scripts/stop-local.ps1
```

The matrix must finish before management/admin writes; admin tests add users and therefore run
after the six-account-guarded workflow and matrix. In `frontend/`, run lint/typecheck/test/build,
check API types against `../app/target/openapi.json`, and run mocked `pnpm test:e2e` separately.

Private logs, original summaries and raw session traces are retained in ignored `.cache/` and
`app/target/`, including `quality-five-role-run.log`, `quality-role-matrix-run.log`,
`quality-backend-retest.log`, `quality-coverage-gate-retest.log` and `coverage-gate/negative.log`.
Do **not** upload raw traces, access.json, password files or database clusters. The JSON here
contains only safe result observations and 310 source fingerprints; all six exported PNGs were
visually inspected before copying. No remote attachment/publication is claimed.

## Reviewed synthetic screenshots

- [Actual approval](desktop-approved.png), [mobile linked repair](mobile-resolved.png).
- [No implicit ADMIN approval](mobile-admin-no-implicit-approval.png).
- [Mobile equipment retirement](mobile-equipment-retired.png).
- [Mobile audit](mobile-audit.png), [mobile account security](mobile-security.png).

## Remaining acceptance

The final standard workflows and current-page permissions now have local evidence. At the time
these results were recorded, the delivery was uncommitted and had **not** been pushed, reviewed,
CI-verified or merged. Later publication and CI status are tracked on the PR and Issue #24;
the recorded input HEAD plus source hashes remain the actual tested inputs. No Issue checkboxes
or state were changed by the verification itself. Human confirmation and authenticated production
acceptance remain separate. The optional shared Testcontainers-base refactor is not delivered.

The known dot-segment category-name defect from PR #81 and PowerShell 7 Flyway-target cleanup
defect from PR #82 remain separately recorded in their PR comments; this verification work does
not repair them or declare the entire application defect-free. This local Vite run also does not
stand in for the outstanding PR #83 nginx/header review or PR #84 lookup-specific review.
