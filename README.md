# Shared Equipment Reservation and Maintenance System (SERMS)

SWE5006 Team 07 · A web application for managing shared equipment from reservation and approval through checkout, return and maintenance.

[Hosted application](https://serms.midas.cyou) · [Documentation](docs/README.md) · [Local demo](docs/local-demo.md)

## Features

- Search equipment and availability; submit, view and cancel reservations.
- Review reservation requests and record approval or rejection decisions.
- Check out equipment, record returns and route damaged items to maintenance.
- Report faults, assign technicians and track repairs and maintenance history.
- Track overdue loans and deliver in-app notifications and reminders.
- Manage users, roles, equipment and categories; view reports and audit records.

Access is controlled by five roles: Borrower, Approver, Custodian, Maintainer and Administrator. See the [feature and module map](docs/README.md#feature-and-module-map) for designs, contracts and implementation paths.

## Quick Start

The complete local demo runs on Windows with Java 17+, Node.js 24, the pnpm version declared in [frontend/package.json](frontend/package.json), and PostgreSQL 18 binaries. From the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-local.ps1 -PostgresBin '<PostgreSQL 18 bin directory>'
```

Open [http://127.0.0.1:5174](http://127.0.0.1:5174). Use the [local demo guide](docs/local-demo.md) for demo accounts, generated credentials, port configuration and troubleshooting.

Stop the demo from the same checkout:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/stop-local.ps1
```

## Technology

| Layer | Core technologies |
| --- | --- |
| Frontend | React 19, TypeScript 5, Vite 7, Tailwind CSS 4; pnpm |
| Backend | Java 17, Spring Boot 4, Spring Security, Spring Data JPA; Maven Wrapper |
| Database | PostgreSQL 18, Flyway |
| Delivery | GitHub Actions, Docker Compose, nginx |

The backend is a modular monolith exposing a REST API to a React single-page application. See the [technology and architecture guide](docs/tech-stack.md) for versions, security, module boundaries and testing requirements.

## Repository Layout

| Path | Purpose |
| --- | --- |
| [app/](app/) | Spring Boot backend and production database migrations |
| [frontend/](frontend/) | React frontend and its tests |
| [web/](web/) | Production web container's nginx configuration |
| [scripts/](scripts/) | Local startup, verification, backup and release tools |
| [docs/](docs/README.md) | Designs, contracts, runbooks and project evidence |

The [complete project structure](docs/README.md#project-structure) also covers retained data/integration modules and development tooling.

## Testing

Run commands from the indicated directory after installing the prerequisites and dependencies in the [testing guide](docs/testing.md).

| Check | Directory | Command |
| --- | --- | --- |
| Backend | `app/` | `./mvnw -B verify` (Windows: `mvnw.cmd -B verify`) |
| Frontend | `frontend/` | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` |
| Documentation | Repository root | `node scripts/check-collaboration.mjs` |

PostgreSQL integration profiles, browser tests, coverage requirements and verification evidence are documented in [docs/testing.md](docs/testing.md).

## Documentation

| Topic | Guide |
| --- | --- |
| Documentation overview and module designs | [Documentation index](docs/README.md) |
| Business interfaces | [Contract index](docs/contracts/README.md) |
| Deployment and recovery | [Server release](docs/server-release.md), [backup runbook](docs/runbook-backup.md) |
| Progress, scope and delivery schedule | [Sprint status](docs/agile/sprint-status.md), [Agile plan](docs/agile/README.md) |
| Development history and verification | [Development log](docs/devlog/README.md), [evidence](docs/evidence/), [historical deliveries](docs/README.md#historical-deliveries) |

## Collaboration and Releases

See [CONTRIBUTING](.github/CONTRIBUTING.md) for participation, ownership, PRs, merge permissions and contract changes, and the [release runbook](docs/server-release.md#deployment-entry-points) for deployment gates and operations. Coding agents start at [AGENTS.md](AGENTS.md).
