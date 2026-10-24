# T2 — Presentation ERD for V001–V007

Owner: Liu Tongyao (@cpg25ncu) · Requirement: SWE5006 final presentation, T2 · Branch: `codex/presentation-t2-erd` · Baseline: `df9033f0cafd58258bf86594bdc9f7795e9748e2`

## 2026-10-25 Task record

- Objective: document the current `serms` schema after V001–V007 and export `N3_erd.png` for a 6.2 × 4.8 in slide area.
- Sole writer: the Codex session assigned T2; no delegation or shared clone.
- Workspace: `D:\ChatGPT\Designing_Moder_Software_Systems\.cache\serms-t2`, a fresh task-only clone. The managed worktree tool returned `Not a git repository` for this chat's presentation folder; the user's approved fresh-clone fallback was used.
- Initial HEAD, fetched `origin/main`, and rule baseline: `df9033f0cafd58258bf86594bdc9f7795e9748e2`; fetched on 2026-10-25 (SGT). The clean task branch was created from that baseline.
- Pre-commit refresh found `origin/main` at `76d1312eaf0b0a3a0fc2210d95fec06289da00f3`. Only the login page and another task's recording devlog changed; the seven migrations, rules and skills were identical. This task branch was fast-forwarded to that latest base before committing, preserving the two staged T2 files. Final local checks were repeated on the refreshed base; schema extraction remains bound to the identical `df9033f` migration bytes.
- Allowed repository writes: `docs/diagrams/schema-erd.puml` and this dated devlog only. Export: `D:\ChatGPT\Designing_Moder_Software_Systems\Presentation\assets\new\N3_erd.png`; PNGs are not committed.
- Exclusions: primary checkout, shared indexes, other tasks' files, application code, migrations, workflows, settings, production, merging and remote comments.
- Dependencies: baseline migrations `app/src/main/resources/db/migration/V001__sprint1.sql` through `V007__identity_session_version.sql`; no dependency PR, service, or existing database.
- Rules and skills read: `AGENTS.md`; `.github/CONTRIBUTING.md` including Branches and Worktrees; `.agents/skills/serms-worktree/SKILL.md`, `serms-task/SKILL.md`, `serms-verify/SKILL.md`, and `serms-pr/SKILL.md`; `docs/collaboration/agent-workflow.md`; D-003/D-011 in `docs/collaboration/decisions.md`; `docs/devlog/README.md`; `docs/testing.md`; `.github/pull_request_template.md`.
- Authorized scope: T2 source, local render and verification, explicit-path commit/push, and one draft docs-only PR. No business-contract or policy change is proposed.

### What was built

- [PlantUML source](../diagrams/schema-erd.puml), rendered with PlantUML 1.2026.9 and Java 25.0.4. Only the source and this record are committed.
- Export: `D:\ChatGPT\Designing_Moder_Software_Systems\Presentation\assets\new\N3_erd.png`, 2828 × 2283 pixels, white background, Arial, NUS blue lines/headers and one NUS orange reservation header.
- All 12 requested business entities and all 18 current business foreign keys appear as crow-foot connectors or explicit `→ U` / `→ U*` key references. The two omitted tables and five legacy FK links are accounted for in the footnote, source comments and inventory below.
- Draft PR title: **docs: presentation ERD for V001-V007**. This delivery does not merge or deploy anything.

### Design notes

The catalog was derived mechanically from an empty, disposable `postgres:18-alpine` container (actual PostgreSQL **18.6**, Docker Engine **29.8.2**). V001–V007 were applied in filename order with `psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 -q -f /migrations/<filename>`; all seven succeeded and `serms.schema_version` contained 1–7. The migrations were mounted read-only, networking was disabled, no host ports were published, and no real database or production endpoint was used. Schema inspection read `information_schema.tables/columns`, `pg_constraint`, `pg_trigger`, `pg_get_constraintdef` and `pg_get_triggerdef`.

The layout keeps key columns instead of shrinking type. U is `app_user.user_id`; U* is the distinct unique `app_user.notification_principal`; L* is `loan.reminder_id`. Notification recipient and reminder links therefore terminate at the actual unique bridge keys, not the UUID primary keys. User-role PK markings form one composite key. The unique loan/reservation and approval/reservation links use 0..1 child cardinality. Nullable foreign keys are marked with `?` or optional parent cardinality. `reservation.equipment_id` and `loan.reservation_id` are represented by their unambiguous connectors rather than repeated attribute rows. Other unselected columns (including status fields, email/serial unique keys and V007's session revocation counter) remain in the schema and are intentionally omitted from this compact view.

Version tags correspond exactly to `equipment_version`, `reservation_version`, `loan_version` and `maintenance_version`, all calling `bump_version()`. V007's `app_user.session_version` has no database bump trigger and is not tagged. Immutable tags cover `audit_immutable` / `audit_no_truncate` and `approval_immutable`; only audit has the additional truncate guard. The exclusion predicate covers `PENDING_APPROVAL`, `CONFIRMED` and `FULFILLED`, using `tstzrange(start_at, end_at, '[)')`. `audit_log.entity_id` is a polymorphic identifier, not a foreign key.

### Catalog table inventory

All 14 `serms` base tables were found; the 12 business tables are shown and the permitted legacy/metadata omissions are explicit.

| Table | Diagram |
| --- | --- |
| `app_user` | Entity shown |
| `approval_decision` | Entity shown |
| `audit_log` | Entity shown |
| `equipment` | Entity shown |
| `equipment_category` | Entity shown |
| `loan` | Entity shown |
| `maintenance_case` | Entity shown |
| `notification_attempt` | Entity shown |
| `notification_legacy_v2` | Omitted with the required footnote |
| `notification_request` | Entity shown |
| `reservation` | Entity shown |
| `role` | Entity shown |
| `schema_version` | Omitted with the required footnote |
| `user_role` | Entity shown |

### Foreign keys found in pg_constraint

Every catalog foreign key is listed here. All 18 non-legacy links are represented in the PNG. The five legacy links are intentionally summarized by its omission footnote and retained explicitly in source comments; they are not drawn as current business relationships.

| Constraint | Child column | Referenced key | Diagram representation |
| --- | --- | --- | --- |
| `approval_decision_approver_id_fkey` | `approval_decision.approver_id` | `app_user.user_id` | explicit FK row → U |
| `approval_decision_reservation_id_fkey` | `approval_decision.reservation_id` | `reservation.reservation_id` | crow-foot connector |
| `audit_log_actor_id_fkey` | `audit_log.actor_id` | `app_user.user_id` | explicit FK row → U |
| `equipment_category_fk` | `equipment.category` | `equipment_category.name` | crow-foot connector |
| `loan_checkout_by_fkey` | `loan.checkout_by` | `app_user.user_id` | explicit FK row → U |
| `loan_reservation_id_fkey` | `loan.reservation_id` | `reservation.reservation_id` | crow-foot connector |
| `loan_return_by_fkey` | `loan.return_by` | `app_user.user_id` | explicit FK row → U |
| `maintenance_case_assigned_to_fkey` | `maintenance_case.assigned_to` | `app_user.user_id` | explicit FK row → U |
| `maintenance_case_equipment_id_fkey` | `maintenance_case.equipment_id` | `equipment.equipment_id` | crow-foot connector |
| `maintenance_case_loan_id_fkey` | `maintenance_case.loan_id` | `loan.loan_id` | crow-foot connector |
| `maintenance_case_reported_by_fkey` | `maintenance_case.reported_by` | `app_user.user_id` | explicit FK row → U |
| `notification_attempt_notification_id_fkey` | `notification_attempt.notification_id` | `notification_request.id` | crow-foot connector |
| `notification_loan_id_fkey` | `notification_legacy_v2.loan_id` | `loan.loan_id` | legacy omission footnote; exact mapping in source comment |
| `notification_maintenance_case_id_fkey` | `notification_legacy_v2.maintenance_case_id` | `maintenance_case.maintenance_case_id` | legacy omission footnote; exact mapping in source comment |
| `notification_recipient_id_fkey` | `notification_legacy_v2.recipient_id` | `app_user.user_id` | legacy omission footnote; exact mapping in source comment |
| `notification_reservation_id_fkey` | `notification_legacy_v2.reservation_id` | `reservation.reservation_id` | legacy omission footnote; exact mapping in source comment |
| `notification_request_legacy_notification_id_fkey` | `notification_request.legacy_notification_id` | `notification_legacy_v2.notification_id` | legacy omission footnote; exact mapping in source comment |
| `notification_request_loan_id_fkey` | `notification_request.loan_id` | `loan.reminder_id` | crow-foot connector |
| `notification_request_recipient_fkey` | `notification_request.recipient` | `app_user.notification_principal` | explicit FK row → U* |
| `reservation_equipment_id_fkey` | `reservation.equipment_id` | `equipment.equipment_id` | crow-foot connector |
| `reservation_user_id_fkey` | `reservation.requester_id` | `app_user.user_id` | explicit FK row → U |
| `user_role_role_id_fkey` | `user_role.role_id` | `role.role_id` | crow-foot connector |
| `user_role_user_id_fkey` | `user_role.user_id` | `app_user.user_id` | explicit FK row → U |

### Problems and fixes

| Symptom | Root cause | Fix and verification |
| --- | --- | --- |
| Managed worktree creation rejected the chat folder | Presentation project is not a Git repository | Used the user's explicitly approved fresh clone fallback; primary checkout was never accessed |
| Clone/fetch failed in the sandbox | GitHub DNS/network access unavailable there | Retried with approved network escalation; fetched baseline matches the task brief |
| Docker initially unavailable | Desktop engine was stopped; CLI access required escalation | Started the installed engine and used only the task-specific disposable container |
| Direct-dot rendering unavailable in this PlantUML build | Renderer returned a suppressed-feature document | Replaced the exploratory source with supported PlantUML entity syntax; no added software or alternate diagram tool |
| First layout did not fit the slide legibly | Too many attributes and crossing user-hub links | Reduced attributes, used explicit user-key references and compact trigger tags; final fitted minimum text is 14.12 px at 96 px/in |

### Verification

Environment: Windows NT **10.0.26300.0** / PowerShell; Node **24.20.0**, Java **25.0.4**, PlantUML **1.2026.9**, Graphviz **2.44.1**, Docker Engine **29.8.2**, PostgreSQL **18.6**. Schema extraction used `df9033f0cafd58258bf86594bdc9f7795e9748e2`; final local checks were repeated on refreshed HEAD/base `76d1312eaf0b0a3a0fc2210d95fec06289da00f3` plus the two explicitly identified uncommitted deliverables. Final commit and latest-head CI are recorded on the PR separately.

| Check / command | Result | Evidence |
| --- | --- | --- |
| Apply V001–V007 with `ON_ERROR_STOP=1`; inspect installed versions | **passed** | All seven applied; real disposable PostgreSQL 18.6, not mock/H2 |
| Catalog extraction and source comparison | **passed** | 14 tables, 23 FKs; 12 entities / 18 business links / 5 legacy links accounted for; four version and two immutable tags verified |
| PlantUML `-tsvg` and `-tpng` exports | **passed** | Final PNG 2828 × 2283; minimum 2400 px width satisfied |
| Open final PNG; inspect text bounds, palette and slide fit | **passed** | Nothing clipped; one orange highlight; text ≥ 14.12 px when fitted within 6.2 × 4.8 in at 96 px/in; preserve aspect ratio |
| `node ../serms-t2-artifacts/verify-erd.mjs` from the task clone | **passed** | Mechanical catalog, entity/FK, trigger, exclusion, selected-column, PNG, SVG text-bounds and palette audit |
| `node scripts/check-collaboration.mjs` | **passed** | 19 documents, 7 skills |
| `git diff --check` and explicit-path staged diff | **passed** | Only the two authorized source/devlog paths; no PNG or runtime artifact staged |
| Hosted CI, member review, merge, deployment, team Done | **not claimed** | Draft PR; no merge or production operation authorized |

Task-only, uncommitted verification artifacts: `D:\ChatGPT\Designing_Moder_Software_Systems\.cache\serms-t2-artifacts\` contains schema-only `catalog.json`, `schema-audit.json`, the verification SVG and local verification helpers. None contains account data or credentials. PNG SHA-256: `2473e6e5975fa0cc6043b69d54dce34738b9433c1101a0f3de23ce8afaf9c4cb`.

Cleanup **passed**: the task container `serms-t2-erd-20261025` was identity-checked, then removed with its disposable volume; the filtered container inventory was empty. No application or database service remains from T2. Docker Desktop was left available as a shared runtime; other sessions' containers and services were not stopped.

Re-render from the task-clone root (the SVG used for verification is separate from the exported PNG):

~~~powershell
& 'C:\Program Files\Java\jdk-25.0.4\bin\java.exe' -jar 'D:\ChatGPT\Designing_Moder_Software_Systems\.cache\plantuml-1.2026.9.jar' -tpng -o 'D:\ChatGPT\Designing_Moder_Software_Systems\Presentation\assets\new' docs/diagrams/schema-erd.puml
~~~

### Deviations and follow-ups

No schema fact conflicts with the brief were found. The image uses the requested omission option for `notification_legacy_v2` and `schema_version`; five historical FKs remain in the catalog and are documented rather than drawn. The key-only diagram deliberately omits most non-relational attributes to preserve readability. Its aspect is 1.239:1, so fit it proportionally in the target area; no cropping or stretching is needed. No backend/frontend code or business-contract change was made, so application regressions were not run for this docs-only task; hosted CI runs normally.

Liu Tongyao retains slide acceptance and PR review. No missing T2 diagram work is delegated to another task. Keep the draft PR unmerged; no deployment or settings change is part of this task.

### Authorship

Diagram and evidence record prepared by Codex for Liu Tongyao. No human review, effort hours, approval, deployment or team Done is claimed.
