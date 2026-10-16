# Frontend Visual Polish — Verification (Issue #26)

Recorded on 2026-10-17 (Asia/Singapore) by an AI agent working for Liu Tongyao. Code under test: `7d19c9c` (branch `feat/liu-tongyao-visual-polish`), which is `main` `cbbb303` plus this change; the work started from `5668256`. Environment: Windows 11, Node 24.20.0, pnpm 11.19.0, Java 25, PostgreSQL 18.6, Playwright 1.63.0 Chromium. The local demo ran from this working tree on ports 55437 / 8087 / 5179 (Docker Desktop holds 8081 and 8082), with a backend built from the merged tree. Agent checks are supporting evidence, not a member check.

## Results

| Check | Command or method | Result |
| --- | --- | --- |
| Formatting, lint, types | `prettier --check` on changed files, `pnpm lint`, `pnpm typecheck` | Passed |
| Component tests | `pnpm test` | Passed: 181 tests in 17 files (174 before; new: six overview role tests, one sign-in regression test) |
| Production build | `pnpm build` | Passed. Main script 743.6 kB (227.0 kB gzip) against 728.5 kB (221.8 kB gzip) on `main` `cbbb303`; the "larger than 500 kB" warning is the same on `main` |
| Mocked browser suite | `pnpm test:e2e` (desktop 1440, mobile 390) | Passed 16 of 16 on the final head, twice. Two earlier runs failed every test at the login field after about a minute (cold dev server, as recorded in #16) and passed on rerun |
| Role matrix | `node --test scripts/role-access.test.mjs` | Passed 8 of 8 |
| Real API smoke | `node scripts/smoke-local.mjs` | Passed 28 of 28 |
| Real browser, UC01/UC04 | `node scripts/check-uc01-uc04-browser.mjs` | Passed 10 of 10 (desktop and mobile); cancellation now confirms in the dialog |
| Real browser, UC02 | `main`'s `check-uc02-browser.mjs` | Failed at "desktop custodian role menu" before any changed page: its hard-coded menus predate "Manage equipment" (#17). Not caused by this change |
| Real browser, UC02 | PR #86's `check-uc02-browser.mjs` (role menus from the matrix) | Passed 35 of 35: rejection, approval, notification, checkout, damaged return, linked repair, report page, dual-role self-decision block |
| Real browser, five roles | `main`'s `check-role-browser.mjs` | Passed 66 of 66: every route for every role on desktop and mobile, deny states, no `main [role="alert"]` on allowed pages including the overview, no page overflow, business data unchanged |
| Real browser, five roles | PR #86's `check-role-browser.mjs` (same logic, more inputs hashed) | Passed 66 of 66 |
| Real browser, equipment management | PR #86's `check-equipment-management-browser.mjs` with two lines changed: `getByRole('row')` for `getByRole('article')`, `'Retired'` for `'RETIRED'` | Passed 16 of 16 (custodian and administrator, desktop and mobile): category create and rename, register, versioned update, confirmed retirement |
| Production CSP | `frontend/dist` served with the exact `location /` headers of `web/nginx.conf` on `main` (CSP, X-Frame-Options, nosniff, Referrer-Policy, HSTS, Permissions-Policy, COOP, CORP), `/api` proxied to the demo; five roles, 34 page loads and 5 dialogs (register equipment, retire, handover, cancel reservation, edit display name) | **0 violations**; no console errors except the expected 401 of `/auth/me` before sign-in. [`csp-check.json`](csp-check.json) |
| Widths | Scroll width of each table container and of the page, at 768, 1024 and 1440 | Search, reservations, notifications, approvals and equipment management: 0 px at all three widths. The first version of this branch, before the column changes, scrolled by 113 px (search) and 214 px (equipment management) at 768 and 86 px (approvals) at 1024; the baseline screenshots show the same sideways scroll. No page overflows at 390, 768 or 1440. Admin users and audit still scroll inside their card at tablet widths (unchanged pages) |
| Contrast | WCAG relative-luminance ratio of each text colour on its background | Muted text 5.37:1 on cards, 4.99:1 on the page (was 4.15 / 3.85); table headers 5.16 (3.10); muted badge 4.73 (2.66); footer 4.99 (2.63); eyebrow 5.03 (3.77) |
| Screenshots | 24 captures (17 at 1440, 7 at 768) for five roles, before and after; see below | No overflow and no alerts in either set ([`before/shots.json`](before/shots.json), [`after/shots.json`](after/shots.json)) |

## Notes

- **Order of runs.** All live checks above ran in one sequence on `7d19c9c` after the backend was rebuilt from the merged tree and the demo restarted. Earlier runs on `798fd2a` and `eeb7809` are described in the devlog, including three runs of the role check that stalled on a page load and one equipment-management run that exposed the sign-in bug fixed in `7d19c9c`.
- **Screenshots and data.** The "before" set was taken on `5668256` right after one smoke run and a few reservations, a loan and two cases created through the API. The "after" set was taken on the same database at the end, after the live checks had added their own records, so lists are longer (for example the QA-* items in equipment management, which also shows paging) and figures differ.
- **Live UC01/UC04 screenshots.** `check-uc01-uc04-browser.mjs` writes into `docs/evidence/uc01-uc04/`, another delivery's evidence. Those files were restored; two of this run's captures are kept in [`live/`](live/).
- **PR #86.** Its scripts were copied in uncommitted for these runs and removed afterwards.

## Screenshots

`before/` and `after/` hold the same file names. JPEG, full page.

| File | Shows |
| --- | --- |
| `desktop-<role>-overview.jpg` | Overview for borrower, approver, storekeeper (custodian), technician (maintainer) and administrator |
| `desktop-borrower-equipment.jpg`, `tablet-borrower-equipment.jpg` | Find equipment |
| `desktop-borrower-equipment-detail-reserve.jpg` | Reserve page |
| `desktop-borrower-reservations.jpg` | My reservations |
| `desktop-borrower-loans.jpg`, `desktop-custodian-loans.jpg`, `tablet-custodian-loans.jpg` | Loans and returns, borrower and storekeeper views |
| `desktop-borrower-notifications.jpg` | Notifications |
| `desktop-approver-approvals.jpg`, `tablet-approver-approvals.jpg`, `desktop-approver-approvals-detail.jpg` | Approval queue and request details |
| `desktop-custodian-manage-equipment.jpg`, `tablet-custodian-manage-equipment.jpg` | Equipment management |
| `desktop-custodian-maintenance.jpg`, `tablet-custodian-maintenance.jpg` | Maintenance workspace for a storekeeper |
| `desktop-maintainer-maintenance-cases-detail.jpg` | Case details and actions for the assigned technician |
| `desktop-admin-maintenance-report.jpg` | Maintenance report |
| `tablet-borrower-overview.jpg`, `tablet-custodian-overview.jpg` | Overview at tablet width |
| `live/uc01-uc04-desktop-repair.png`, `live/uc01-uc04-mobile-fault.png` | Captures from the live UC01/UC04 run |
