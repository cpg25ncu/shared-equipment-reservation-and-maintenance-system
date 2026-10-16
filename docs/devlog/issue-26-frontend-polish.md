# Frontend visual polish after feature freeze (#26)

Owner: Liu Tongyao (@cpg25ncu) · Requirement: Proposal 7.4 · Branch: `feat/liu-tongyao-visual-polish` · Baseline: main `5668256`

## 2026-10-17 Role-based overview, shared components on every page, contrast and widths

### What was built

- **Role-based overview** on `/` (`frontend/src/features/home/DashboardCards.tsx`). Above the existing "Your pages" cards, each role now sees the figures it acts on first, each with a link to the page where it acts:
  - Borrower: equipment on loan (with overdue loans or the next return time), reservations waiting for approval, confirmed reservations and the next start time.
  - Approver: requests waiting for a decision, and how many have expired.
  - Storekeeper: confirmed reservations to hand over and how many can be checked out now, active loans and overdue ones, overdue loans (with the longest), faults waiting for a technician (with urgent and high counts).
  - Technician: their open cases, split into to start and in progress.
  - Administrator: overdue loans, faults waiting for a technician, user accounts.
  - Everyone: unread notifications.
  Every card reads one existing endpoint that the role may already call (checked against `scripts/lib/role-access.mjs`); an account with several roles sees each figure once. A failed figure shows its own retry without hiding the others.
- **Every feature page on the shared components and tokens of #16**: Equipment management, Find equipment, Reserve, My reservations, Loans and returns, Approvals (list, detail, decision form), Maintenance (workspace, open queue, assigned cases, report a fault, equipment lookup, case detail, history, actions, report), Notifications, and the "Page not found" page. Admin, Overdue and Reports already used them and are unchanged apart from colours.
- **Equipment management** (the review and ZAP finding): `PageHeader`, a sortable `DataTable` with status badges, a `Dialog` holding the register/edit form built from `Field` / `Input` / `Select` / `Textarea`, the existing `ConfirmDialog` for retirement, toasts for the outcome, field errors next to their fields.
- **`approval.css` and `maintenance.css` deleted**; their rules became utilities. 54 rules that no page used any more were removed from `styles/shared.css`.
- **Consistent states**: status badges from the central maps everywhere (maintenance pages printed raw codes such as `IN PROGRESS`; they now read "In progress", "Not repairable" as Proposal 5.6 and D-008 name them); skeletons instead of spinners inside pages; `EmptyState` and `ErrorState` for empty and failed lists; confirmation dialogs before cancelling a reservation and before marking a case not repairable (which retires the equipment); toasts for equipment, category, assignment and maintenance-action outcomes.
- **New shared pieces**: `DetailList` / `Detail` (label and value pairs), `Pager` (used by `DataTable` and by card lists), `SkeletonBlock`, `Notice` (a message that stays on the page), `rowClassName` and per-column `meta.className` on `DataTable`, status tones as Tailwind utilities (`bg-tone-ok`). Documented in `frontend/src/components/README.md` and shown in the `/dev/components` gallery.
- **Contrast**: muted text, table headers, eyebrows, footer, sidebar labels, pagination and the muted badge now meet WCAG AA (4.5:1) for small text; they measured 2.5 to 4.2 before.
- **Sign-in fix** (found while verifying, separate commit): after signing in, a slow CSRF refresh could pull the user back to the overview from a page they had already opened. `AuthProvider.login` now publishes the user after the refresh, and the sign-in page's redirect to the requested page is its only navigation.
- **Widths**: every table on the changed pages fits a 768 and a 1024 wide tablet without scrolling sideways (search, equipment management and approvals scrolled by 86 to 232 px, as on `main`); on a phone the menu is one scrollable row per menu instead of a stacked column.

### Design notes

- **Overview as composition, not a new endpoint.** A summary endpoint would have been one request instead of up to five, but the task forbids API changes after the freeze and the existing endpoints already carry the counts (`totalElements`) or short lists. Each figure is its own small component calling one existing query hook (`useLoans`, `usePendingApprovals`, `useOpenCases` …), so the overview shares the React Query cache with the pages it links to, and hooks are never called conditionally: the role decides which components render.
- **"20+" instead of a guess.** Loans, the checkout queue and equipment management return plain lists of at most 20 rows without a total. A full page is shown as "20+" rather than as an exact count the client cannot know.
- **Sorting only where the whole list is on screen.** `DataTable` already refused to sort one page of a server-paged list (sorting a page would mislead). Equipment management now asks for blocks of 100, the API's maximum, so a team's whole inventory arrives at once and its headers sort; beyond 100 items it falls back to API paging. Where an API offers its own order (overdue duration, notification date) the page keeps a sort control.
- **Toast or notice.** Outcomes are toasts with one `id` per kind of action, so a repeated action replaces its toast instead of stacking two identical messages. Two outcomes stay on the page as a `Notice`: a fault report (it carries the new case's link) and a recorded handover. The handover is deliberate: the live UC02 script records a checkout and a return seconds apart with the same message, and a toast still showing from the first would let the check for the second pass before the return is saved.
- **Confirmation focus.** "Mark Unrepairable" used an inline confirmation whose focus started on the confirm button, so Enter retired the equipment. It now uses the shared `ConfirmDialog`, which starts on Cancel like every other destructive confirmation.
- **Columns that give way.** Tables keep secondary columns from 1280 px; below that, the same facts appear under the item name. The approvals list dropped its Status column instead: every row there waits for approval, so only "Expired" needed a badge, now shown under the time.
- **Accessible names kept.** Every label, button and link name that the browser scripts and Playwright specs select stayed the same, with three exceptions handled in this change (below). Overview links never repeat a menu label exactly, because several scripts click menu links by exact name without `.first()`.
- **Patterns.** Composite (`DashboardCards` assembles independent `Stat` components); Adapter (`statusLabel` adapts stored codes to the central display map).

### Problems and fixes

| Symptom | Root cause | Fix | How it was verified |
| --- | --- | --- | --- |
| Local demo would not start on its default ports | Docker Desktop (other projects) listens on 8081 and 8082 | Started this checkout's demo on 55437 / 8087 / 5179 through `.claude/launch.json` (untracked); nothing else was stopped | Health `UP`, smoke 28 of 28 |
| `bash -c` failed with "unexpected EOF" while splicing a page with a Python heredoc | The content held typographic quotes that the tool's shell wrapper did not survive | Wrote the new text to a scratch file and spliced it with a small script | Typecheck clean |
| 12 of 16 Playwright tests timed out at the login field on the first run | Cold Vite dependency optimisation with 12 parallel workers (recorded before in #16) | Rerun | 16 of 16 on the next two runs |
| Playwright: two "Register equipment" buttons (strict mode) | The empty inventory showed the same action as the page header | The empty state points to the header button instead | Equipment-management spec passes |
| Admin Playwright spec threw "Unhandled admin browser contract: /api/v1/overdue" | Its mocked API rejects unknown paths and the overview now reads overdue and open-case counts | The mock answers the overview reads empty and asserts that each belongs to the signed-in role | Admin spec passes on desktop and mobile |
| Tablet tables scrolled sideways by up to 232 px | Six to eight columns next to a 190 px sidebar in 528 px | Tighter cells below 1000 px; secondary columns from 1280 px only, with their facts under the item name | 0 px overflow at 768 and 1024 on every changed table (measured) |
| A live browser check lost the equipment page 1.7 s after creating a category and timed out looking for "Register equipment"; the next run passed | The trace showed the app itself moving to `/` while the server answered slowly. Nothing on that page navigates: the sign-in page did. `login()` set the user before awaiting the CSRF refresh, the page's "already signed in" redirect went to `/` at once, and its submit handler called `navigate()` again when the refresh finished, after the check had opened another page | Publish the user after the refresh; the redirect to the requested page is the only navigation. A first attempt that kept both navigations broke six Playwright tests: React Router 7 runs navigations as transitions, so the redirect to `/` committed after `navigate(from)` | New `auth.test.tsx` delays the refresh by 400 ms, opens a page straight after signing in and checks it stays: fails on the old code, passes now. Playwright 16 of 16 twice |
| Live role and UC02 checks failed now and then: a fresh page had not shown its form, alert or redirect within the script's 5 to 15 s | Not proven. No reload in the Vite log, no backend error, CPU idle afterwards; a local LLM server on the same machine used much CPU during the session. Isolated probes did not reproduce it (40 cold sign-ins: max 2.5 s; 78 page loads: median 138 ms, max 2.2 s) | None; reruns | The same scripts passed on rerun; see the verification record for every run |
| `main`'s `check-uc02-browser.mjs` fails at "desktop custodian role menu" | Its hard-coded menus predate "Manage equipment" (#17); unrelated to this change, which does not touch the menu | PR #86 replaces the list with the role-access matrix; its version was run instead | #86's UC02 check passed 35 of 35 on this branch |
| Unit tests could not find success messages | Outcomes moved to toasts, which a test sees only when it renders `<Toaster />` | The affected tests render it, as the components README asks | 180 of 180 |

### Verification

See [the verification record](../evidence/visual-polish-20261017/README.md).

### Deviations

- Admin users and audit tables still scroll sideways on a tablet (218 to 444 px). Hiding their columns would hide cells that the admin browser scripts read by role at phone width; they keep the #16 behaviour of scrolling inside their card.
- Three test benches changed with the pages: `frontend/e2e/maintenance.spec.ts` (region "Resolved" instead of "RESOLVED"), `frontend/e2e/equipment-management.spec.ts` (a table row instead of "Field camera (CAM-018)") and `scripts/check-uc01-uc04-browser.mjs` ("Yes, cancel" is now inside the confirmation dialog). `frontend/e2e/admin.spec.ts` answers the new overview reads.
- The sign-in fix is not visual polish. It was found by this task's verification, is frontend-only and has its own commit, so it can be reviewed or reverted on its own.
- The phone menu and the contrast change were not acceptance items; #16's devlog listed both as follow-ups for this task.

### Follow-ups

- PR #86 adds `scripts/check-equipment-management-browser.mjs`, which selects equipment records as `article` cards and expects the text `RETIRED`. Records are now table rows and show "Retired". Whichever merges second updates that script: `getByRole('row')` instead of `getByRole('article')`, and `Retired`.
- Backend, not this task: notification texts from the server format dates in the JVM default locale, so on this Windows machine they read "17 10月 2026". Production containers may differ; worth checking before the demo.
- Admin tables at tablet width (above).

### Authorship

Design, implementation, tests, screenshots and this entry were produced by an AI agent (Claude Code) under Liu Tongyao's instruction, who owns the task. No teammate review is claimed.
