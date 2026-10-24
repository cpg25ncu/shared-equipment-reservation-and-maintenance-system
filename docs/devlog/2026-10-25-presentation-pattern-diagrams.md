# T3: Presentation design-pattern class diagrams

Owner: Liu Tongyao (@cpg25ncu) · Requirement: conversation task T3, SWE5006 final presentation · Branch: `codex/liu-tongyao-t3-pattern-diagrams` · Baseline: `df9033f0cafd58258bf86594bdc9f7795e9748e2`

## 2026-10-25 Scope and isolation record

- Objective: five compact UML class diagrams for Strategy (UC01), Chain of Responsibility (UC02), State (UC04 design model), Observer, and Adapter / Factory Method.
- Sole writer: this Codex session, assisting Liu Tongyao; no delegated writers.
- Workspace: `D:/ChatGPT/Designing_Moder_Software_Systems/.cache/serms-t3`, an independent fresh clone. The managed `create_worktree` tool returned `Not a git repository` for this chat's folder, so the user's explicit clone fallback was used. The primary checkout was not accessed or changed.
- Branch: `codex/liu-tongyao-t3-pattern-diagrams`; starting HEAD, fetched `origin/main`, and rule baseline: `df9033f0cafd58258bf86594bdc9f7795e9748e2`. Fetch completed on 2026-10-25 SGT (2026-10-24 UTC).
- Before publication, a refreshed `origin/main` was `76d1312eaf0b0a3a0fc2210d95fec06289da00f3`. Compared with the task baseline, it changes only the login page and an unrelated demo devlog; no applicable rule, contract, Java declaration or diagram fact changes. This branch retains its original, latest-at-creation baseline. The first refresh failed DNS in the sandbox; the approved elevated fetch succeeded.
- Allowed repository paths: `docs/diagrams/pattern-strategy.*`, `pattern-chain.*`, `pattern-state.*`, `pattern-observer.*`, `pattern-adapter-factory.*`, and this devlog only. Commit PlantUML sources, not PNGs.
- Authorized external outputs: the five named PNGs in `D:/ChatGPT/Designing_Moder_Software_Systems/Presentation/assets/new/`; isolated rendering/evidence scratch files outside the clone. Push this branch and open one draft PR; do not merge.
- Exclusions: Java, shared indexes, other sessions' files, repository settings, workflows, secrets, production and deployment.
- Dependencies: existing Java sources and confirmed D-008 (five maintenance states), D-009 (email descoped), D-003 (English), D-011 (devlog). No dependency PR, interface change or new owner confirmation is needed.
- Rules read: `AGENTS.md`, `.github/CONTRIBUTING.md` (including Branches and Worktrees), `docs/testing.md`, `docs/collaboration/agent-workflow.md`, `docs/collaboration/decisions.md`, `docs/devlog/README.md`, `.github/pull_request_template.md`.
- Skills applied: `.agents/skills/serms-worktree/SKILL.md`, `.agents/skills/serms-verify/SKILL.md`, `.agents/skills/serms-pr/SKILL.md`.
- Technical references read: `docs/contracts/README.md`, `docs/contracts/equipment-and-reservation.md`, relevant approval contract sections, `docs/notification-design.md`, and the Java files listed below. The older local maintenance diagram was inspected as a layout reference only; its extra state and obsolete operations are omitted.

## What was built

Five UML class diagrams use one PlantUML 1.2026.9 toolchain, its bundled Graphviz 2.44.1 layout engine, white backgrounds, Arial, NUS blue `#023E7C`, and one orange `#F17D00` behavioural highlight per image. The two panels of the fifth image share the same type size. Only key operations are shown. Group borders label shared GoF roles without repeating the role in every concrete class box.

| Committed source | Exported PNG |
| --- | --- |
| [pattern-strategy.puml](../diagrams/pattern-strategy.puml) | `N5a_strategy.png` |
| [pattern-chain.puml](../diagrams/pattern-chain.puml) | `N5b_chain.png` |
| [pattern-state.puml](../diagrams/pattern-state.puml) | `N5c_state.png` |
| [pattern-observer.puml](../diagrams/pattern-observer.puml) | `N5d_observer.png` |
| [pattern-adapter-factory.puml](../diagrams/pattern-adapter-factory.puml) | `N5e_adapter_factory.png` |

All five PNGs are local presentation assets at `D:/ChatGPT/Designing_Moder_Software_Systems/Presentation/assets/new/`, outside the clone and outside Git. Each is **2400 × 1435 px**, aspect **1.67247**, matching the target **4.6 × 2.75 in** to rounding. A 522 ppi metadata hint gives approximately that physical size; place the images using the requested slide dimensions.

The reproducible [export script](../diagrams/pattern-adapter-factory.render.mjs) is also committed within the allowed `pattern-adapter-factory.*` scope. It renders five sources (six panels), checks for render-error placeholders, combines the last two panels, adds a single explanatory highlight, and exports fixed-size PNGs. It requires an existing PlantUML jar, Java and Sharp; it installs nothing and rejects output directories inside the repository.

## Design notes and differences from implementation

- **Strategy:** `ReservationRules` holds a list of policies and evaluates every one, collecting all `RuleViolation` values. It does not select a single policy or stop at the first violation.
- **Chain of Responsibility:** `ApprovalPolicyChain` iterates an ordered list and returns at the first rejection. `ApprovalConfiguration` orders `NoSelfApprovalHandler` before `DecisionCommentHandler`. No fictional `next` field is added to the handlers.
- **State design model:** D-008 defines `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `UNREPAIRABLE`; both terminal states reject all actions. The live `MaintenanceCase` delegates transitions to a static `MaintenanceStateMachine`, rather than instances of a `MaintenanceState` interface. The drawn `currentState` field, delegation interface and five concrete classes are explicitly a design model, with dashed outlines for the six designed types. Real completion methods also receive an `Instant`; the model retains the brief's compact state-interface operations. `MaintenanceExceptionHandler` maps `InvalidMaintenanceTransitionException` to HTTP 409. No extra state or post-completion action is introduced, and Java is unchanged.
- **Observer:** the Spring publisher dispatches synchronously to the four `@EventListener` classes. Notification requests join the business transaction; rollback removes them. `NotificationWorker` polls committed requests and `NotificationDeliveryService` delivers in a separate transaction, with deduplication and bounded retry. This is not a claim that the listeners themselves run after commit. Maintenance publishes through `SpringMaintenanceEventPublisher`.
- **Adapter:** the first three JDBC adapters wrap Spring `JdbcOperations`; the reservation adapter wraps the public `ReservationApprovalService`. Every target/adapter pair is shown separately. `MaintenanceService` depends on the three maintenance ports; `ApprovalService` depends on `ReservationApprovalPort`.
- **Factory Method design model:** none of `NotificationChannel`, `NotificationDispatcher`, `InAppDispatcher`, `EmailDispatcher`, `InAppChannel`, `EmailChannel` exists as a Java type. All six have dashed outlines. The implemented in-app behaviour belongs to `NotificationDeliveryService`; the footer explicitly identifies this difference. Email remains descoped by D-009. The existing `ApprovalNotificationFactory.from(ReservationDecided): NotificationRequest` appears as a solid helper, not as an implemented channel creator. The one-argument overload exists; the listener currently uses its two-argument equipment-name overload.

## Implemented class-name inventory

**Passed: 47 local declarations**, checked with `rg -n -g '*.java' '\b(class|interface|record|enum)\s+(<the names below>)\b' app/src/main/java/sg/edu/nus/serms`, followed by checking each declaration in its exact `<package>/<Type>.java` file. These include types displayed in signatures and the implementation classes used to explain design-model differences. Package paths below are relative to `app/src/main/java/sg/edu/nus/serms/`.

| Package | Exact verified names |
| --- | --- |
| `reservation/domain/policy` | `ReservationPolicy`, `BookingHorizonPolicy`, `DurationPolicy`, `OpenReservationQuotaPolicy`, `OverdueLoanPolicy`, `StartInFuturePolicy`, `ReservationRules` |
| `reservation/domain` | `ReservationRuleContext`, `RuleViolation` |
| `reservation/service` | `ReservationService`, `ReservationApprovalAdapter`, `ReservationApprovalService` |
| `reservation/service/event` | `ReservationSubmitted`, `ReservationCancelled` |
| `approval/domain` | `ApprovalHandler`, `ApprovalContext`, `ApprovalEvaluation`, `NoSelfApprovalHandler`, `DecisionCommentHandler`, `ApprovalPolicyChain` |
| `approval/service` | `ApprovalService`, `ReservationApprovalPort` |
| `approval/service/event` | `ReservationDecided` |
| `loan/service` | `LoanService`, `LoanEvent` |
| `maintenance/domain` | `MaintenanceCase`, `MaintenanceStatus`, `MaintenanceStateMachine`, `InvalidMaintenanceTransitionException`, `MaintenanceAssigned`, `MaintenanceCompleted` |
| `maintenance/service` | `MaintenanceService`, `SpringMaintenanceEventPublisher`, `MaintenanceLoanPort`, `EquipmentMaintenancePort`, `TechnicianDirectoryPort` |
| `maintenance/service/jdbc` | `JdbcMaintenanceLoanAdapter`, `JdbcEquipmentMaintenanceAdapter`, `JdbcTechnicianDirectoryAdapter` |
| `notification/service` | `ReservationNotificationListener`, `ApprovalNotificationListener`, `LoanNotificationListener`, `MaintenanceNotificationListener`, `NotificationWorker`, `NotificationDeliveryService`, `ApprovalNotificationFactory` |
| `notification/domain` | `NotificationRequest` |

External framework interfaces: `org.springframework.context.ApplicationEventPublisher` and `org.springframework.jdbc.core.JdbcOperations`; their exact imports and usage were verified with `rg`. They are Spring APIs, not local SERMS declarations.

**Passed: 12 design-only declarations absent**, checked using the same declaration search: `MaintenanceState`, `OpenState`, `AssignedState`, `InProgressState`, `ResolvedState`, `UnrepairableState`, `NotificationChannel`, `InAppChannel`, `EmailChannel`, `NotificationDispatcher`, `InAppDispatcher`, `EmailDispatcher`. Their absence is documented, not treated as an implemented-class pass.

## Problems and fixes

| Symptom | Cause | Fix and evidence |
| --- | --- | --- |
| Managed worktree creation rejected the chat folder | Chat working directory is not a Git repository | Used the user-approved independent-clone fallback; clean branch starts at fetched `df9033f` |
| Initial UML layouts exceeded the small slide area | Repeated role labels and automatic rank placement | Compact UML tables in PlantUML's DOT syntax; shared GoF role groups; independently laid-out Adapter / Factory panels |
| Renderer produced placeholders or failed in parallel | DOT SVG export requires the explicit trusted-source profile; bundled Windows Graphviz extraction conflicted during parallel rendering, and its PNG plugin is unavailable | Use the documented process-local profile and one rendering thread; rasterize SVG with existing Sharp. [PlantUML issue 2495](https://github.com/plantuml/plantuml/issues/2495) documents DOT SVG support. No machine-wide setting or package installation was changed |
| Some bold long names or the exception note overflowed | Bundled Graphviz font measurement differed from the rasterizer | Use regular class labels, wrap the exception note, and visually inspect all five final 662 px slide previews |

## Verification

Environment: Windows / PowerShell; Java **25.0.4**, PlantUML **1.2026.9**, bundled Graphviz **2.44.1**, Node **24.20.0**, bundled Sharp **0.35.5**. Verification input HEAD was baseline `df9033f0cafd58258bf86594bdc9f7795e9748e2` plus exactly the five new `.puml` files, export script and this devlog. Source/render checks cover those uncommitted inputs; delivered commit and PR HEAD are recorded in the PR.

Working directory for commands: `D:/ChatGPT/Designing_Moder_Software_Systems/.cache/serms-t3`.

```powershell
node docs/diagrams/pattern-adapter-factory.render.mjs `
  --java 'C:/Program Files/Java/jdk-25.0.4/bin/java.exe' `
  --plantuml-jar 'D:/ChatGPT/Designing_Moder_Software_Systems/.cache/plantuml-1.2026.9.jar' `
  --sharp-module 'C:/Users/14824/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp' `
  --scratch-dir 'D:/ChatGPT/Designing_Moder_Software_Systems/.cache/serms-t3-render' `
  --output-dir 'D:/ChatGPT/Designing_Moder_Software_Systems/Presentation/assets/new'
node scripts/check-collaboration.mjs
node --check docs/diagrams/pattern-adapter-factory.render.mjs
git diff --check
git diff --cached --check
```

| Check | Result and evidence |
| --- | --- |
| PlantUML render, dimensions, output error detection | **Passed:** six panels, five PNG exports; every image 2400 × 1435; `export-verification.json` in the isolated scratch directory |
| Slide-size visual check | **Passed:** all five previews inspected at 662 px wide, corresponding to 4.6 in on a 1920 px wide 13 1/3 in slide; no clipped labels; computed minimum font sizes 15.76 / 14.03 / 15.42 / 14.48 / 14.20 px, respectively. Physical readability also depends on the final deck's display resolution |
| Local Java names / framework imports | **Passed:** 47 local declarations, two framework imports; `implemented-class-grep.txt` and `checks-verification.json` in scratch |
| Design-only types and outlines | **Passed:** 12 Java declarations absent as expected; six dashed designed boxes in State and six in Factory; obsolete extra-state/actions absent |
| Collaboration documentation | **Passed:** `node scripts/check-collaboration.mjs` — 19 documents, seven skills |
| Export script syntax | **Passed:** `node --check docs/diagrams/pattern-adapter-factory.render.mjs` |
| Scope, whitespace and binaries | **Passed:** only seven allowed documentation/source files; explicit staging; no PNG or Java file staged; staged whitespace check clean after removing generated trailing spaces |
| Backend/frontend/database runtime tests | **Not run:** this documentation-only task changes no application behaviour |
| Hosted CI / member acceptance / merge / deployment | Not claimed by local checks. PR remains draft; no merge or deployment is authorized by T3 |

Local scratch evidence directory: `D:/ChatGPT/Designing_Moder_Software_Systems/.cache/serms-t3-render/`. It includes per-image slide previews, export dimensions, minimum-font calculations, source-name grep output and PNG SHA-256 hashes. It is outside the clone and is not committed.

## Follow-ups and handover

The required assets and sources are complete. Open one draft PR titled **docs: presentation design-pattern class diagrams**. Liu Tongyao owns final slide placement and member acceptance. No application server, database, container or background process was started. Keep this isolated clone and local exported assets for review; do not clean another session's checkout.

## Authorship

Liu Tongyao owns the task. PlantUML sources and this factual delivery record are authored with Codex assistance. No hours, member review or approval are inferred.
