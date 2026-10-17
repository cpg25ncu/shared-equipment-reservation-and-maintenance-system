# SERMS Documentation Index

This index provides navigation without replacing existing standards; historical deliveries, snapshots, and evidence retain their locations.

## Project Identity

Use the full name **Shared Equipment Reservation and Maintenance System (SERMS)** on first mention in the project report, then use **SERMS** throughout the remaining text and everyday communication. The repository name is `shared-equipment-reservation-and-maintenance-system`.

## Documentation Map

| Topic | Entry point |
| --- | --- |
| Participation, branches, PRs, merge permissions, contract changes, handover | [Collaboration guide](../.github/CONTRIBUTING.md) |
| Agent startup and skills | [AGENTS](../AGENTS.md) |
| Technology, layering, test benches, alignment targets | [Technology stack](tech-stack.md) |
| Member use cases and shared-responsibility differences | [Ownership](collaboration/ownership.md) |
| Tools, sole writers, delegation, resume | [Agent workflow](collaboration/agent-workflow.md) |
| Conflicts, reference patterns, user decisions | [Decisions](collaboration/decisions.md) |
| Commands, actual CI, evidence formats | [Testing](testing.md) |
| Current progress and remaining acceptance | [Integration update 2026-10-17](agile/sprint-status.md#integration-update-2026-10-17), [plan Issue #27](https://github.com/cpg25ncu/shared-equipment-reservation-and-maintenance-system/issues/27); earlier snapshots: [2026-10-14](agile/sprint-status.md#integration-update-2026-10-14), [2026-10-13](agile/sprint-status.md#current-local-progress-2026-10-13) |
| Development process, problems met, report material | [Development log](devlog/README.md), [2026-10-14 review and completion plan](devlog/2026-10-14-project-review-and-completion-plan.md), [2026-10-17 acceptance close-out](devlog/2026-10-17-acceptance-closeout.md) |
| Local startup and real-flow checks | [Local demo](local-demo.md), [Verification](evidence/local-demo/verification.md), [2026-10-17 acceptance evidence](evidence/acceptance-20261017/README.md) |
| Server release, backup and security scan | [Server handover and release](server-release.md), [Backup runbook](runbook-backup.md), [ZAP baseline 2026-10-16](evidence/zap-baseline-20261016/zap-baseline.md) |
| Local cleanup, retained history and next work | [Repository closeout](local-repository-closeout.md), [Repository preparation](repository-preparation.md) |
| Interface contracts | [Contracts](contracts/README.md) |
| Backlog, Sprints, task status, report evidence | [Agile](agile/README.md) |
| Diagram source files | [Diagrams](diagrams/) |
| Actual screenshots/acceptance evidence | [Evidence](evidence/) |
| Recorded architectural decisions | [ADR](adr/) |
| Platform/React integration | [Platform REST/React](platform-rest-react.md) |
| UC01 | [Search and reservation](uc01-search-and-reserve.md) |
| UC02 | [Approval implementation](uc02-approval-implementation.md) |
| UC03 | [Checkout and return](uc03-checkout-and-return.md) |
| UC04 | [Fault and maintenance analysis and design](uc04-fault-and-maintenance.md) |
| UC05 | [Notification design](notification-design.md) |
| Data foundation/historical delivery | [Database](../database/README.md), [Alignment](serms-database-alignment.md) |
| Notification adaptation/integration | [integration/notifications](../integration/notifications/README.md), [Alignment](notification-interface-alignment.md) |

## Project Structure

| Path | Responsibility |
| --- | --- |
| `app/` | One Spring Boot application; retain `sg.edu.nus.serms.<business-module>.{api,service,domain,repository}` |
| `frontend/` | One React application; `src/features/` corresponds to business modules, reusing `app/`, `api/`, `components/`, `lib/` |
| `database/` | Retained data-foundation/regression module; production migrations now live in `app/` |
| `integration/notifications/` | PostgreSQL adapters are included by app's build; pinned historical contract testing remains separate |
| `web/`, root Docker/Compose | Production `web` + `app` + `db` runtime, released by the gated `Deploy` workflow since 2026-10-15 |
| `scripts/` | Local demo, tests, browser checks, backups, releases and documentation checks |
| `docs/collaboration/` | Collaboration practices, ownership sources, agent workflow and decisions |
| `.agents/skills/` | SERMS operating guides routed from AGENTS; read as needed |
| `.github/` | Workflows, collaboration guide, Issue/PR templates and dependency configuration |
| `Dockerfile`, `compose.yaml`, `.env.example` | Production packaging and environment template; `compose.dev.yaml` provides a local data environment |
| `.claude/CLAUDE.md` | Claude Code forwards to root AGENTS, avoiding duplicate rules |

Documents may describe earlier branches, database versions, or unmerged states. Check dates/commits before reading them as current acceptance; never delete historical evidence just to update navigation.

## Feature and Module Map

Users sign in with one of five roles: Borrower, Approver, Custodian, Maintainer and Administrator.

| Scope | Backend package (`app/src/main/java/sg/edu/nus/serms/`) | Frontend (`frontend/src/features/`) | Design and contract |
| --- | --- | --- | --- |
| UC01 Search and reserve equipment | `equipment`, `reservation` | `equipment`, `reservation` | [Design](uc01-search-and-reserve.md), [contract](contracts/equipment-and-reservation.md) |
| UC02 Review and approve reservations | `approval` | `approval` | [Implementation](uc02-approval-implementation.md), [contract](contracts/auth-and-approval.md) |
| UC03 Equipment checkout and return | `loan` | `loan` | [Design](uc03-checkout-and-return.md), [contract](contracts/checkout-and-return.md) |
| UC04 Fault reports and maintenance | `maintenance` | `maintenance` | [Design](uc04-fault-and-maintenance.md) |
| UC05 Overdue detection and notifications | `notification` | `notification`, `overdue` | [Design](notification-design.md), [overdue contract](contracts/checkout-and-return.md#uc05-overdue-projection) |
| Sign-in, roles, user administration, audit viewer | `identity`, `audit`, `shared` | `auth`, `admin`, `home` | [Authentication contract](contracts/auth-and-approval.md), [administration contract](contracts/admin-console.md) |
| Equipment and category management | `equipment` | `equipment` | [Development log #17](devlog/issue-17-equipment-management.md) |
| Reports | `report` | `report` | [Development log #23](devlog/issue-23-reports.md) |

Use-case owners are listed in [Ownership boundaries](collaboration/ownership.md). Email notifications, QR codes and automatic cancellation of expired pending reservations were dropped by the [scope freeze (D-009)](collaboration/decisions.md#d-009-scope-freeze).

## Historical Deliveries

Earlier member deliveries keep their own records and verification scripts; [docs/testing.md](testing.md) lists the scripts.

| Delivery | Records |
| --- | --- |
| Sprint 1 data foundation by Zhou Fanhao: Java/JDBC domain and reservation data module, aligned to the ten SERMS business entities at V002 | [Database module](../database/README.md), [alignment](serms-database-alignment.md), [domain design](sprint1-domain.md), [delivery record](sprint1-zhoufanhao.md) |
| PostgreSQL adapter for Wang Yuanmeng's notification branch: V003 migration and LoanReminderGuard | [Adapter](../integration/notifications/README.md), [interface alignment](notification-interface-alignment.md) |
| UC03 checkout and return by Zhou Fanhao: backend, `/loans` page, PostgreSQL profile, V004 alignment and approval persistence adapter | [Delivery notes](zhoufanhao-delivery.md), [integration checklist](zhoufanhao-handoffs.md), [verification](zhoufanhao-validation.md), [PostgreSQL runtime](serms-postgres-runtime.md) |
