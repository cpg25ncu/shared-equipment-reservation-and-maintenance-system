# Project Description and Topics (2026-11-20)

Owner: Liu Tongyao (@cpg25ncu) · Requirement: repository owner's instruction of 2026-11-20 · Branch: `docs/liu-tongyao-project-description` · Baseline: main `f09a792`

## 2026-11-20 What happened

The owner asked for GitHub topics and a rewritten repository description that presents SERMS as a product rather than as group coursework.

### GitHub repository settings (applied directly, not part of this PR)

- About description, before: "Shared Equipment Reservation and Maintenance System (SERMS) — SWE5006 Team 07."
- About description, after: "SERMS — a shared equipment reservation and maintenance platform: availability search, approval workflows, checkout and returns, fault reporting and repair tracking, overdue reminders, role-based access and audit trails. Spring Boot 4 · React 19 · PostgreSQL 18, containerized and delivered through a DevSecOps CI/CD pipeline." (329 of 350 characters.)
- Topics, previously none, now 20 (GitHub's maximum): `equipment-management`, `reservation-system`, `booking-system`, `maintenance-management`, `asset-management`, `spring-boot`, `spring-security`, `java`, `react`, `typescript`, `vite`, `tailwindcss`, `postgresql`, `flyway`, `docker`, `nginx`, `github-actions`, `devsecops`, `rest-api`, `rbac`.
- Both were set with `gh repo edit` and read back with `gh repo view`.
- The homepage field is still empty.

### README (this PR)

- The tagline under the title no longer starts with "SWE5006 Team 07". It now reads: "A web platform for managing shared equipment across its full lifecycle: availability search, reservation and approval, checkout and return, fault reporting and maintenance."
- The repository serves two courses ([D-016](../collaboration/decisions.md#d-016-repository-shared-by-two-courses)), so a single-course label on the landing page was also incomplete.
- Team membership, ownership and course records are unchanged. They remain in [ownership](../collaboration/ownership.md), the [decision record](../collaboration/decisions.md) and the earlier devlogs.

## Design notes

- Every feature and version named in the description and topics is implemented on main, per the [README](../../README.md) and the [technology stack](../tech-stack.md). Items dropped by D-009 (ArchUnit, Spotless, SpotBugs) are not named.
- The change touches only `**.md`, so a push to `main` starts no `Deploy` run (`paths-ignore` in `.github/workflows/deploy.yml`).

## Verification

`node scripts/check-collaboration.mjs` on the branch; result is recorded in the PR.

## Authorship

Agent-assisted (Claude Code) at the owner's request: description, topics, README wording and this entry. No reviews or approvals are recorded here.
