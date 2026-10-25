# Task T6: UC05 design diagrams and presentation renders

Owner: Liu Tongyao (@cpg25ncu). Requirement: conversation Task T6, presentation UC04/UC03/reservation assets and UC05 design.

## 2026-10-25 scope and isolation

- Objective: render seven existing diagrams without changing their sources, add two UC05 design diagrams from actual code, export nine presentation PNGs, and open one draft docs-only PR.
- Allowed repository paths: `docs/diagrams/uc05-design-class.mmd`, `docs/diagrams/uc05-design-sequence.mmd`, and this log. Exported PNGs and temporary render tooling remain outside the clone.
- Exclusions: all existing Mermaid sources, shared indexes, application code, workflows, settings, production, merging, and other sessions' files.
- Dependencies: existing diagrams and notification implementation at fetched `origin/main` `df9033f0cafd58258bf86594bdc9f7795e9748e2`; no dependency PR.
- Workspace: `D:\ChatGPT\Designing_Moder_Software_Systems\.cache\serms-t6`, a fresh task-specific clone. The managed worktree tool returned `Not a git repository` for this chat's folder, so the explicitly approved clone fallback was used. The primary checkout was only read for initial guidance; no Git operation or edit ran there.
- Branch: `codex/liu-tongyao-t6-uc05-diagrams`. Sole writer: this Task T6 Codex session, assisting the named human owner; no delegation.
- Initial HEAD, fetched main baseline, and rule baseline: `df9033f0cafd58258bf86594bdc9f7795e9748e2`, cloned on 2026-10-25 (Asia/Singapore).
- Authorized scope: local reading, isolated diagram work, verification, PNG export, scoped commit/push and one draft PR with the exact requested title. No Issue was supplied.
- Rules read: `AGENTS.md`, `.github/CONTRIBUTING.md`, `docs/collaboration/agent-workflow.md`, `docs/collaboration/ownership.md`, `docs/collaboration/decisions.md` (including D-003/D-011), `docs/tech-stack.md`, `docs/contracts/README.md`, `docs/notification-interface-alignment.md`, `docs/testing.md`, `docs/devlog/README.md`, and `.github/pull_request_template.md`.
- Skills read/applied: `.agents/skills/serms-worktree/SKILL.md`, `.agents/skills/serms-task/SKILL.md`, `.agents/skills/serms-verify/SKILL.md`, and `.agents/skills/serms-pr/SKILL.md`.

## Design and code correspondence

The class view uses the existing BCE stereotypes: `boundary` for APIs, `control` for orchestration, `entity` for the persisted notification, and `interface`, `record`, and `enumeration` where applicable. Mermaid's fixed block layout keeps all 22 requested types readable; attributes and operations are omitted from this view. Service stereotypes apply at the layer heading, with the guard marked as an interface; the two read services share one compartment. Arrows summarize package dependencies and the source comments retain individual class dependencies. This is a compact presentation abstraction rather than a complete UML association inventory. The four business listeners are reservation, loan, maintenance, and approval listeners; utility/text/configuration classes are outside the view. The sequence uses short participant labels, concrete type identifiers in the source, selected real calls, and comments for the detailed repository/transaction path.

Repository facts override two ordering implications in the brief:

1. `LoanReminderScanner.scheduledScan()` invokes `scan()` with a default **fixed delay** of 60 seconds, not a strict wall-clock period. It acquires Equipment then Loan locks and uses `ReminderPolicy.classify()` and `LoanNotificationRequestFactory.forLoan()`. It does **not** invoke `LoanReminderGuard`. `NotificationDeliveryService.deliver()` calls `LoanReminderGuard.check()` before locking the notification, retaining Equipment -> Loan -> notification lock order. The PostgreSQL implementation is `integration/notifications/.../PostgresLoanReminderGuard.java`.
2. Delivery first changes the entity state, then calls `NotificationRepository.flush()` and `NotificationDeliveryStore.recordAttempt()` in the same transaction. In-app delivery is visibility in the inbox; there is no external transport. `UNAVAILABLE` uses `Notification.fail()` with defaults of three attempts and a 60-second retry delay; stale/returned reminders are cancelled. An unexpected transaction failure rolls back and is recovered on a later poll; it is not falsely counted as a persisted bounded attempt.

`NotificationWorker.deliverPending()` defaults to a 30-second fixed delay and fetches up to 100 eligible IDs. The scanner uses period `once`; `NotificationRequest.dedupKey()` hashes recipient, type, source, period, loan ID, and expected due time. `NotificationRequestStore.requestOnce()` uses a unique key and `ON CONFLICT DO NOTHING` in the producer transaction.

The inbox uses the actual controller methods `list`, `unread`, and `read`, backed by `page`, `unread`, and `markReadForUser`. Its repository filters delivered notifications by the authenticated recipient. `OverdueLoanService.list()` reads the UC03 SQL projection directly through `JdbcTemplate`, rather than a notification repository.

The existing UC04 class/sequence sources contain historical comments describing the maintenance notification listener as draft-only. The actual baseline includes the listener. Those sources are intentionally rendered verbatim as instructed; the new UC05 class view represents the implemented listener.

## Export and verification

Written repository files:

- [UC05 BCE design class view](../diagrams/uc05-design-class.mmd).
- [UC05 design sequence](../diagrams/uc05-design-sequence.mmd).
- This dated task log; no shared index or existing diagram was edited.

All nine PNGs are exported to `D:\ChatGPT\Designing_Moder_Software_Systems\Presentation\assets\new\`. They are not committed. Natural aspect ratios are retained; slide targets are used for fitting/readability checks rather than distorting or cropping source content. The renders use a white background, Arial/Helvetica, and NUS blue `#023E7C`; no orange highlight was needed.

| PNG filename | Actual pixels | Target size (in) | Smallest fitted text at 96 dpi | Result |
| --- | --- | --- | --- | --- |
| `N6a_uc04_design_class.png` | 10215 x 4179 | 4.3 x 4.6 | 1.0 px | Rendered unchanged; very dense |
| `N6g_uc04_analysis_class.png` | 2909 x 5266 | 4.3 x 4.6 | 2.0 px | Rendered unchanged; very dense |
| `N6b_uc04_analysis_sequence.png` | 3101 x 3474 | 4.3 x 4.6 | 3.1 px | Rendered unchanged; dense |
| `N6c_uc04_design_sequence.png` | 4923 x 11087 | 4.3 x 4.6 | 1.0 px | Rendered unchanged; very dense |
| `N6d_uc04_states.png` | 2400 x 4632 | 4.3 x 2.2 | 1.7 px | Rendered unchanged; very dense |
| `N6e_uc03_states.png` | 2400 x 1544 | 4.3 x 2.2 | 5.3 px | Rendered unchanged; dense |
| `N6f_reservation_states.png` | 2400 x 2108 | 4.3 x 2.2 | 4.1 px | Rendered unchanged; dense |
| `N7a_uc05_design_class.png` | 2400 x 1579 | 8.9 x 4.8 | 14.2 px | Passed; approximately 14 px minimum |
| `N7b_uc05_design_sequence.png` | 2400 x 1348 | 8.9 x 4.8 | 13.9 px | Passed; approximately 14 px minimum |

All seven existing diagrams are too dense when their entire image is fitted into the requested small slot. They need slide cropping, enlargement, or multiple slides. In particular, the UC04 design class is naturally very wide, and the UC04 state diagram is naturally tall despite the requested landscape target. These are source-density/layout limitations, not render failures; the sources were preserved exactly as requested. Legacy exports receive at least 24 pixels for their smallest source font where this requires more than 2400 pixels of width, preserving useful detail for cropping; this does not fix whole-slide density.

Environment: Windows, Node `v24.20.0`, npm/npx `11.19.0`, Mermaid CLI `12.0.0` using Mermaid `12.2.0`, and installed headless Google Chrome. The already cached Mermaid CLI package was used through its `renderMermaid` API for every diagram; no additional dependency was installed. Local render tooling, intermediate SVGs, audit JSON and QA previews are outside the clone in `D:\ChatGPT\Designing_Moder_Software_Systems\.cache\serms-t6-render\`.

Verification inputs: baseline/initial HEAD `df9033f0cafd58258bf86594bdc9f7795e9748e2` plus the three explicitly listed uncommitted task files. The PR records delivered commit identity.

| Check | Result | Evidence |
| --- | --- | --- |
| `node ../serms-t6-render/render.mjs`, then final UC05-only rerenders and final full export | Passed: all nine Mermaid sources render, all nine PNGs are at least 2400 px wide | `results.json`, final `results-uc05.json`, retained SVGs and exported PNGs |
| `node ../serms-t6-render/audit.mjs` | Passed: seven original sources are byte-identical to baseline; 22 requested types and 21 method names verified against Java; nine PNG signatures/dimensions checked; only three allowed paths changed; UTF-8 without BOM and LF | `audit-results.json` contains source and PNG SHA-256 hashes |
| Visual QA of the existing contact sheet and both UC05 images fitted to 8.9 x 4.8 in at 96 dpi | Passed for rendering/completeness and new-view readability; existing density exceptions are listed above | `existing-diagrams-contact-sheet.png`, `uc05-slide-size-preview.png` |
| `git diff --exit-code origin/main --` followed by the seven existing Mermaid paths | Passed: no changes |
| `node scripts/check-collaboration.mjs` | Passed: 19 documents, 7 skills |
| `git diff --check` | Passed |
| `git diff --cached --check`; `git diff --check origin/main...HEAD` | Passed on the staged additions and diagram delivery commit |
| Backend/frontend/PostgreSQL behavior suites | Not run: documentation-only task; application code and contracts unchanged |
| Hosted CI, human/member acceptance, merge, deployment, team Done | Not claimed; draft delivery only |

Problems encountered: the managed worktree tool rejected the non-repository chat folder, so the approved fresh-clone fallback was used. Sandboxed Chrome launch failed, so rendering used the approved local headless-renderer escalation. An early **new** sequence draft used Mermaid semicolons as label punctuation and failed parsing; only that new source was corrected. Initial new class/sequence layouts were too dense; the final grouped class view and selected sequence calls were visually checked at the target size. A sequence note box was widened and its wording shortened to contain all text. No existing source needed or received a repair.

## Delivery and follow-ups

The requested documentation and nine local PNG exports are complete. Opened draft [PR #112: docs: UC05 design diagrams and presentation renders](https://github.com/cpg25ncu/shared-equipment-reservation-and-maintenance-system/pull/112), targeting `main`. The GitHub connector returned `403 Resource not accessible by integration`; the already authenticated GitHub CLI successfully created the single requested PR. The diagram delivery commit is `3971bc7a8fd18ca89f86a34563aa30b0854c182a`; the subsequent log-only commit records final export sizes and this delivery link, without changing either verified Mermaid source. The branch is retained in the task-specific clone, and no services remain running from the rendering work.

The PR remains draft and unmerged. The presentation owner should crop/enlarge the existing diagrams as recorded above. Human acceptance and ordinary hosted CI remain separate from these local documentation checks. No required local artifact is missing; broader runtime tests, human acceptance, merge and deployment were not part of this task.

## Authorship and remaining acceptance

This entry and both UC05 diagrams are agent-assisted work for Liu Tongyao. No human review, member acceptance, CI success, merge, deployment, or team Done is claimed. This task changes documentation only and does not change contracts or policies.
