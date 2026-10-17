# Deployed acceptance — 2026-10-17

Owner: Liu Tongyao (@cpg25ncu). Prepared and executed by a Codex agent under the owner's instruction. No independent member sign-off is claimed. Refs #10.

Production SHA and fetched main baseline: `2993b78eef24c15a96a1ba77536488c5eb0bc4e8`. [Deploy run, attempt 2](https://github.com/cpg25ncu/shared-equipment-reservation-and-maintenance-system/actions/runs/39010686818/attempts/2) logged the matching Released SHA at 14:53:27 SGT. The browser run began at 15:02:32 SGT and finished at 17/10/2026, 19:14:19 SGT.

See the [development log](../../devlog/issue-10-server-release.md#2026-10-17-deployed-acceptance-and-second-passive-zap-baseline) for scenarios, results, limitations and the ZAP comparison. [Observed data](acceptance-summary.json) binds reservation, loan, maintenance, equipment and audit identifiers to this run. Reservation snapshots retain their observed booking/decision states; the final loans are both RETURNED.

## Method and privacy

- Real production React pages, session/CSRF client and backend persistence, driven by Chromium from the existing frontend Playwright package; one browser context at a time, with role sessions closed sequentially. No request interception, mocked APIs, fake clock, SQL, SSH, demo-data SQL or server commands.
- Account creation, equipment registration, reservation/approval/handover/repair, inbox, reports and audit checks used the UI. The sole denied-action probe was a real same-origin browser fetch with the borrower's session and valid CSRF header; start maintenance returned 403 and the technician subsequently observed the case still ASSIGNED.
- The owner launched `node .cache/prod-acceptance/runner.mjs` in the terminal containing the two administrator environment variables. The runner and scenario scripts stay in the primary checkout's ignored `.cache/prod-acceptance/`. Administrator credentials never entered tool arguments, files, logs or screenshots. Generated initial test passwords remain only in the ignored `accounts.json` and process memory. No tracing, video, saved cookie jar or storage-state file was enabled. Screenshots mask password inputs and any occurrence of the administrator email.
- All new test data uses ACC-1018. Both loans were returned, the maintenance case resolved, future test bookings cancelled or rejected, and both equipment items retired. All five new accounts remain ACTIVE with exactly one role; the two earlier acceptance accounts were left unchanged. The ACC-1018 category and append-only history remain. Hardware damage and repair notes describe simulated acceptance fixtures.

## Screenshots

- [01-five-single-role-accounts.png](01-five-single-role-accounts.png)
- [02-two-equipment-fixtures.png](02-two-equipment-fixtures.png)
- [03-borrower-search.png](03-borrower-search.png)
- [04-immediate-confirmation.png](04-immediate-confirmation.png)
- [05-cancelled-reservation.png](05-cancelled-reservation.png)
- [06-pending-approval.png](06-pending-approval.png)
- [07-overlap-409.png](07-overlap-409.png)
- [08-approver-pending-queue.png](08-approver-pending-queue.png)
- [09-approved-decision.png](09-approved-decision.png)
- [10-rejected-with-reason.png](10-rejected-with-reason.png)
- [11-rejected-slot-reused.png](11-rejected-slot-reused.png)
- [12-decisions-and-mark-read.png](12-decisions-and-mark-read.png)
- [13-checkout-queue-search.png](13-checkout-queue-search.png)
- [14-actual-checkout.png](14-actual-checkout.png)
- [15-damaged-return-open-case.png](15-damaged-return-open-case.png)
- [16-assigned-technician.png](16-assigned-technician.png)
- [17-borrower-maintenance-denied.png](17-borrower-maintenance-denied.png)
- [18-maintenance-resolved-history.png](18-maintenance-resolved-history.png)
- [19-equipment-available-after-repair.png](19-equipment-available-after-repair.png)
- [20-reservable-after-repair.png](20-reservable-after-repair.png)
- [21-reports-page.png](21-reports-page.png)
- [23-storekeeper-overdue-projection.png](23-storekeeper-overdue-projection.png)
- [24-borrower-overdue-and-loan-events.png](24-borrower-overdue-and-loan-events.png)
- [25-good-late-return.png](25-good-late-return.png)
- [26-fixtures-retired.png](26-fixtures-retired.png)
- [27-audit-equipment-retire.png](27-audit-equipment-retire.png)
- [27-audit-loan-return.png](27-audit-loan-return.png)
- [27-audit-maintenance-resolve.png](27-audit-maintenance-resolve.png)
- [27-audit-reservation-decide.png](27-audit-reservation-decide.png)

## Verification limits

UC01-UC05 and the requested administrator checks passed within the stated scenario. This is a scoped deployed acceptance run, not the full local/CI regression, a concurrency/load test, an authenticated security scan, a human equipment inspection, a member approval or team Done. The first scheduled backup on 2026-10-18 02:15 SGT was not checked; no server access was used.
