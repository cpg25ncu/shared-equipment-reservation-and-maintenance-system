# Shared Equipment Reservation and Maintenance System (SERMS)

SWE5006 Team 07 · A web system for reserving, approving, lending and maintaining shared equipment.

Use the full name **Shared Equipment Reservation and Maintenance System (SERMS)** on first mention in the project report, then use **SERMS** throughout the remaining text and everyday communication. The repository name is `shared-equipment-reservation-and-maintenance-system`.

## Status

As of 2026-10-17 (Asia/Singapore):

- The five use cases and the remaining Proposal scope (user and role administration, equipment and category management, reports, audit viewer) are merged to `main`.
- `main` runs in production at https://serms.midas.cyou, released through the gated `Deploy` workflow since 2026-10-15.
- Deployed acceptance and the presentation schedule (feature freeze 2026-10-20, code freeze 2026-10-22, presentation 2026-10-26) are tracked with owners and dates on [Issue #27](https://github.com/cpg25ncu/shared-equipment-reservation-and-maintenance-system/issues/27).

The [development log](docs/devlog/README.md) records how each task was built and verified; the [Sprint status](docs/agile/sprint-status.md) keeps dated snapshots.

## Features

Users sign in with one of five roles: Borrower, Approver, Custodian, Maintainer and Administrator.

| Scope | Backend package (`app/src/main/java/sg/edu/nus/serms/`) | Frontend (`frontend/src/features/`) | Design and contract |
| --- | --- | --- | --- |
| UC01 Search and reserve equipment | `equipment`, `reservation` | `equipment`, `reservation` | [Design](docs/uc01-search-and-reserve.md), [contract](docs/contracts/equipment-and-reservation.md) |
| UC02 Review and approve reservations | `approval` | `approval` | [Implementation](docs/uc02-approval-implementation.md), [contract](docs/contracts/auth-and-approval.md) |
| UC03 Equipment checkout and return | `loan` | `loan` | [Design](docs/uc03-checkout-and-return.md), [contract](docs/contracts/checkout-and-return.md) |
| UC04 Fault reports and maintenance | `maintenance` | `maintenance` | [Design](docs/uc04-fault-and-maintenance.md) |
| UC05 Overdue detection and notifications | `notification` | `notification`, `overdue` | [Design](docs/notification-design.md), [overdue contract](docs/contracts/checkout-and-return.md#uc05-overdue-projection) |
| Sign-in, roles, user administration, audit viewer | `identity`, `audit`, `shared` | `auth`, `admin`, `home` | [Authentication contract](docs/contracts/auth-and-approval.md), [administration contract](docs/contracts/admin-console.md) |
| Equipment and category management | `equipment` | `equipment` | [Development log #17](docs/devlog/issue-17-equipment-management.md) |
| Reports | `report` | `report` | [Development log #23](docs/devlog/issue-23-reports.md) |

Use-case owners are listed in [Ownership boundaries](docs/collaboration/ownership.md). Email notifications, QR codes and automatic cancellation of expired pending reservations were dropped by the [scope freeze (D-009)](docs/collaboration/decisions.md#d-009-scope-freeze).

## Technology Stack

A React single-page application and a Spring Boot REST API organized as a modular monolith, served from one origin and backed by PostgreSQL 18. [docs/tech-stack.md](docs/tech-stack.md) is the maintained source for choices, versions, architecture and the mapping to Proposal requirements.

| Layer | Technology |
| --- | --- |
| Frontend | TypeScript 5 (strict), React 19, Vite 7, React Router 7, TanStack Query 5 and Table 8, React Hook Form + Zod, shadcn/ui on Tailwind CSS 4, Recharts 3, typed API client generated from the backend OpenAPI document; pnpm on Node.js 24 |
| Backend | Java 17, Spring Boot 4.0, Spring MVC JSON API under `/api/v1`, Spring Security (session cookie, CSRF, BCrypt, method authorization), Spring Data JPA with JdbcTemplate for locking and complex queries, springdoc-openapi, RFC 9457 Problem Details; Maven Wrapper |
| Database | PostgreSQL 18 with Flyway migrations in `app/src/main/resources/db/migration`; an exclusion constraint prevents overlapping reservations |
| Testing | JUnit Jupiter, Mockito, AssertJ, Spring Boot Test, Testcontainers or native PostgreSQL 18; Vitest, React Testing Library, MSW, Playwright; JaCoCo |
| CI and security | GitHub Actions with gitleaks, Trivy, Dependency Review and CodeQL; Dependabot version updates paused until after the code freeze |
| Deployment | Docker Compose (`web` nginx, `app`, `db`) behind host nginx with TLS |

## Repository Layout

| Path | Contents |
| --- | --- |
| `app/` | The only backend application, one package per business module with `api`, `service`, `domain` and `repository` layers |
| `frontend/` | The only frontend application; pages in `src/features/`, shared code in `src/{app,api,components,lib}/` |
| `web/` | nginx configuration of the production `web` container |
| `database/` | Sprint 1 data-foundation module, kept for regression; production migrations live in `app/` |
| `integration/notifications/` | PostgreSQL notification adapters compiled into `app/`, with their contract test |
| `scripts/` | Local demo, test, browser-check, backup and release scripts |
| `docs/` | Documentation; start at the [documentation index](docs/README.md) |
| `.github/` | Workflows, [collaboration guide](.github/CONTRIBUTING.md), Issue and PR templates |
| `.agents/skills/` | Operating guides for coding agents, routed from [AGENTS.md](AGENTS.md) |
| `Dockerfile`, `compose.yaml`, `.env.example` | Production packaging; `compose.dev.yaml` is a local data environment |

## Run Locally

The [local demo guide](docs/local-demo.md) starts the complete React, Spring Boot and PostgreSQL 18 system on Windows with Java 17+, Node.js 24, the pnpm version declared in `frontend/package.json` and PostgreSQL 18 binaries. From the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-local.ps1 -PostgresBin '<PostgreSQL 18 bin directory>'
```

Open http://127.0.0.1:5174 and sign in with one of the six local accounts listed in the guide; their generated password is in `.cache/local-demo/access.json`, which must not be committed or shared. Stop the demo with `scripts/stop-local.ps1`. The guide also covers ports, smoke checks and browser checks.

## Testing

Each member provides a complete test bench for their use cases in the same PR as the feature code, covering the normal flow and the major exception flows:

- Backend in `app/src/test/java/sg/edu/nus/serms/<module>/`: unit tests for domain rules, integration tests on real PostgreSQL 18, and API and authorization tests with MockMvc.
- Frontend in `frontend/src/features/<module>/`: component tests with Vitest, React Testing Library and MSW, plus at least one Playwright end-to-end test of the main flow.
- Each test prepares its own data and does not depend on execution order or other tests.

Main entry points:

| Check | Command |
| --- | --- |
| Backend, including the coverage gate | `app/`: `./mvnw -B verify` (Windows: `mvnw.cmd -B verify`) |
| Frontend | `frontend/`: `pnpm install --frozen-lockfile`, then `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` |
| Frontend end-to-end | `frontend/`: `pnpm exec playwright install chromium`, then `pnpm test:e2e` |
| Collaboration documents | Repository root: `node scripts/check-collaboration.mjs` |

`verify` fails when line coverage of the service and domain packages falls below 70%. Failing required checks block merging, and skipping or deleting tests to make CI pass is prohibited. [docs/testing.md](docs/testing.md) lists every entry point, including the PostgreSQL integration profiles and real browser checks, and the evidence format; [Section 5 of the technology stack](docs/tech-stack.md#5-test-benches-each-member-owns-their-tests) gives each member's test scope.

## Documentation

| Topic | Entry point |
| --- | --- |
| All documents | [Documentation index](docs/README.md) |
| Interface contracts | [Contract index](docs/contracts/README.md) |
| Backlog, Sprints, demo script, agile evidence | [Agile](docs/agile/README.md) |
| Decisions and their sources | [Decision record](docs/collaboration/decisions.md) |
| Development process and problems met | [Development log](docs/devlog/README.md) |
| Diagram sources (Mermaid) | [docs/diagrams/](docs/diagrams/) |
| Screenshots and verification reports | [docs/evidence/](docs/evidence/) |
| Server release and recovery | [Server handover and release](docs/server-release.md), [backup runbook](docs/runbook-backup.md) |

## Collaboration and Releases

- Team participation, task dependencies, branches and handover: [Collaboration guide](.github/CONTRIBUTING.md). Coding agents start at [AGENTS.md](AGENTS.md); see also [Ownership boundaries](docs/collaboration/ownership.md) and [Agent workflow](docs/collaboration/agent-workflow.md).
- Cross-module interface contracts live in [`docs/contracts/`](docs/contracts/README.md); the repository version is authoritative. Changes require a PR and confirmation from the owners of affected modules.
- All changes go through PRs. `main` is protected by eight required security/application checks; local commits await their own PR/CI before integration.
- Collaborators with Write permission may merge their own PRs without another reviewer's approval, provided all CI checks pass.
- Local checks, CI, member checks, merge, deployment and team Done are recorded separately; the [Definition of Done](docs/agile/sprint-plan.md#2-definition-of-done) applies to team Done.
- Every push to `main` that changes more than documentation (`**.md`, `docs/**`, `.agents/**`, Issue templates) starts the `Deploy` workflow, which can also be dispatched manually. Its release gate (`scripts/verify-release.mjs`) requires `SERMS_PRODUCTION_READY` and successful required, collaboration-docs, maintenance-postgres, release-config and release-images checks on the exact current `main` SHA. The `production` environment then needs reviewer approval before the release runs over SSH.
- Deployment uses Docker Compose: `compose.yaml` and `Dockerfile` must exist at the repository root. The `web` container port maps to the host's `127.0.0.1:8789`, with nginx providing the public reverse proxy at https://serms.midas.cyou. The procedure, first-administrator bootstrap and recovery are in the [server release runbook](docs/server-release.md).
- Secrets are stored only in `/opt/agfp/.env` on the server (template: `.env.example`) and must never be committed to Git.

These entry points supplement collaboration practices; the technology stack, five-member use-case ownership, existing contracts, and Write collaborators' right to merge their own PRs remain in effect.

## Historical Deliveries

Earlier member deliveries keep their own records and verification scripts; [docs/testing.md](docs/testing.md) lists the scripts.

| Delivery | Records |
| --- | --- |
| Sprint 1 data foundation by Zhou Fanhao: Java/JDBC domain and reservation data module, aligned to the ten SERMS business entities at V002 | [Database module](database/README.md), [alignment](docs/serms-database-alignment.md), [domain design](docs/sprint1-domain.md), [delivery record](docs/sprint1-zhoufanhao.md) |
| PostgreSQL adapter for Wang Yuanmeng's notification branch: V003 migration and LoanReminderGuard | [Adapter](integration/notifications/README.md), [interface alignment](docs/notification-interface-alignment.md) |
| UC03 checkout and return by Zhou Fanhao: backend, `/loans` page, PostgreSQL profile, V004 alignment and approval persistence adapter | [Delivery notes](docs/zhoufanhao-delivery.md), [integration checklist](docs/zhoufanhao-handoffs.md), [verification](docs/zhoufanhao-validation.md), [PostgreSQL runtime](docs/serms-postgres-runtime.md) |
