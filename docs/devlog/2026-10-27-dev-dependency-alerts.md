# Frontend test-tooling security alerts

Owner: Liu Tongyao (@cpg25ncu) · Requirement: conversation task to clear the remaining Dependabot alerts, no Issue number · Branch: `fix/liu-tongyao-dev-dependency-alerts` · Baseline: `c04512f8317f8317d68aa5a2642d7a78b706d9be` (`origin/main`)

## 2026-10-27 Minimum patch for three open alerts

### What was built

Cleared the three Dependabot alerts still open on `main` after #113 and #114 merged. All three are development-only packages in `frontend/pnpm-lock.yaml`:

| Alert | Package | Advisory | Fix |
| --- | --- | --- | --- |
| #12 (medium) | `@vitest/mocker` < 4.1.12 | GHSA-qxg6-89mg-rqv8 | `vitest` `^4.1.11` → `^4.1.12` in `frontend/package.json`; `vitest` 4.1.12 pins `@vitest/mocker` 4.1.12 |
| #13 (medium) | `@vitest/mocker` 4.1.11 | GHSA-xp26-3454-mjgp | Same bump |
| #6 (high) | `source-map-js` < 1.2.2 | GHSA-68fv-2mgg-jv7q | Lockfile only: `@tailwindcss/node` 4.3.3 accepts `^1.2.1`, so `pnpm update source-map-js` resolves it to 1.2.2. `postcss` already used 1.2.2 |

Only `frontend/package.json`, `frontend/pnpm-lock.yaml` and this entry change. No application code, test, workflow, override or ignore rule changes.

### Design notes

Used the smallest fixed versions inside the current major lines: `vitest` stays on 4.x (5.0.5 is available but out of scope), and no `pnpm` override is needed because every dependent's range already allows `source-map-js` 1.2.2. The lockfile diff contains only the eight `vitest` / `@vitest/*` packages moving from 4.1.11 to 4.1.12 and the removal of the duplicate `source-map-js` 1.2.1.

### Problems and fixes

| Symptom | Root cause | Fix | How it was verified |
| --- | --- | --- | --- |
| Alert #13 appeared after #114 merged | GHSA-xp26-3454-mjgp affects exactly `@vitest/mocker` 4.1.11, the version #114 introduced while fixing the older vitest advisories | Move to 4.1.12, which fixes both mocker advisories | Lockfile shows `@vitest/mocker@4.1.12` only; alert state is checked on GitHub after merge |
| `source-map-js` 1.2.1 stayed in the lockfile although `postcss` used 1.2.2 | pnpm kept the older resolution for `@tailwindcss/node` | `pnpm update source-map-js` (within the existing `^1.2.1` range) | Only `source-map-js@1.2.2` remains in the lockfile |

### Verification

Windows, Node 24.20.0, pnpm 11.19.0, in `frontend/` on the working tree that became this commit (baseline above plus the two dependency files):

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Passed; lockfile up to date |
| `pnpm lint` | Passed |
| `pnpm typecheck` | Passed |
| `pnpm test` | Passed: 18 files, 188 tests (Vitest 4.1.12) |
| `pnpm build` | Passed; only the existing chunk-size warning |

Frontend tests use the existing component and API mocks. Hosted CI, merge and deployment results are recorded on the pull request.

### Deviations

Lands after the 2026-10-22 code freeze, at the owner's request, as a security-only dependency update. Production behaviour is unchanged: these packages are test or build tooling and are not in the served bundle.

### Follow-ups

Merging starts Deploy; the owner approves the newest run and rejects the stale `3a225a0` run that is still waiting. `vitest` 5 is a separate upgrade decision.

### Authorship

Written by Claude (Claude Code) at Liu Tongyao's request, including the dependency update, local checks, this entry, the PR and the merge. No human review, member test, meeting or effort hours are claimed.
