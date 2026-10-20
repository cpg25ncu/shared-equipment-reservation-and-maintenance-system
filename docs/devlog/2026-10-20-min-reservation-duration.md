# Minimum Reservation Duration Removed (2026-10-20)

Owner: Liu Tongyao (@cpg25ncu) · Requirement: Proposal rule 10 / 5.3, [UC01 contract](../contracts/equipment-and-reservation.md#6-reservation-policies-configurable-strategy-pattern) §6 · Branch: `feature/liu-tongyao-uc01-min-duration` · Baseline: `9c5f550`

## 2026-10-20 Minimum duration 30 minutes → 0

### What was built

The shortest reservation was 30 minutes. For the demonstration recording, every loan had to run at least 30 minutes before it could fall due, so overdue detection and late return could not be shown in one take. The owner asked for the minimum to start from 0 minutes and confirmed three points before any change: only the minimum duration changes (not the start-in-past rule), the change is permanent, and the agent merges once CI is green, with the production deployment approved by the owner. Recorded in the [decision record](../collaboration/decisions.md#minimum-reservation-duration-removed-2026-10-20).

- Backend: `ReservationLimits.minDuration` default `30m` → `0m` (`serms.reservation.min-duration`).
- Frontend: `features/reservation/rules.ts` `MIN_MINUTES` 30 → 0, so the instant check no longer blocks short bookings before the server sees them.
- Any end after the start now passes the duration rule. The inputs have minute precision, so the shortest booking is one minute.

### Design notes

The rule is a Strategy (`DurationPolicy` in `ReservationRules`) whose limits come from configuration, so only the default value changed. The policy, its `too-short` code and the existing tests that build it with an explicit 30-minute minimum stay, which keeps a configured minimum working if the team sets one again. The minimum is defined in two places: the server default and the frontend mirror. The server is authoritative. Production does not pass `SERMS_RESERVATION_MIN_DURATION` through `compose.yaml`, so a server-only setting would have left the frontend rejecting short bookings; both had to change.

Rules deliberately left as they are, and what they mean for a short demo booking:

- The start may not be in the past, so the earliest start is the next whole minute.
- Checkout is only allowed between start and end (`LoanService.checkout`). A one-minute booking leaves one minute to hand the item over; three to five minutes is more practical when recording.
- Overdue and reminder scanners run every 60 s (`serms.notifications.scan-ms`), so an overdue state appears one to two minutes after the end.

### Problems and fixes

| Symptom | Root cause | Fix | How it was verified |
| --- | --- | --- | --- |
| A PowerShell text replacement in the new worktree changed nothing | `[IO.File]::ReadAllText` with a relative path resolves against the process directory (the primary checkout), not the `Set-Location` directory | Edits redone with absolute paths through the editor tool | `git status` of the primary checkout clean apart from the owner's untracked file; worktree diff checked |

### Verification

Local, Windows 11, Java 25.0.4, Node 24.20.0, pnpm 11.19.0, on the branch working tree based on `9c5f550`:

| Check | Result |
| --- | --- |
| `./mvnw -B -q test -Dtest=ReservationPolicyTest,ReservationServiceTest,ReservationApiTest,ReservationServiceSecurityTest` | passed, 41 tests (new `ReservationPolicyTest#defaultLimitsSetNoMinimumLength` binds the real defaults through Spring's `Binder`) |
| `pnpm lint`, `pnpm typecheck`, `pnpm test` | passed; 17 files, 183 tests |
| Local demo (`scripts/start-local.ps1`, real PostgreSQL 18, ports 55437/8086/5178), borrower books 16:33-16:34 SGT through the reserve page | passed: `POST /api/v1/reservations` 201 `CONFIRMED`, no "must last at least" message, no page errors; [screenshot](../evidence/min-duration-20261020/one-minute-reservation.png) |

The PostgreSQL-backed backend suites (`ReservationPostgresTest` and others) were not run locally; they run in CI on the PR.

### Deviations

The contract §6 default changes from 30 minutes to none; the owner, as UC01 executor under D-004, confirmed it in conversation. No other contract value changes.

### Follow-ups

- After the release, check on production that a one-minute reservation is accepted.

### Authorship

Agent-written (Claude Code) on the owner's instruction; the owner made the decision and approves the production deployment.
