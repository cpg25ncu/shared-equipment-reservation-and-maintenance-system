# T4: Release SHA in the application footer

Owner: Liu Tongyao (@cpg25ncu) · Requirement: conversation task T4, visible deployed release · Branch: `feat/liu-tongyao-release-sha-footer` · Baseline: `df9033f0cafd58258bf86594bdc9f7795e9748e2`

## 2026-10-25 Implementation

### Task and workspace record

- Objective: display `Release <first seven commit characters>` in the application footer and `Release local` in development.
- Sole writer: the Codex session assigned T4; no other task is included.
- Workspace: `D:\ChatGPT\Designing_Moder_Software_Systems\.cache\serms-t4`, a fresh task-specific clone. The managed worktree tool rejected the chat folder with `Not a git repository`; the user explicitly approved this clone fallback. The primary checkout was not used.
- Base: latest `origin/main` fetched on 2026-10-25 at 00:10:11 SGT; starting HEAD and rule baseline are `df9033f0cafd58258bf86594bdc9f7795e9748e2`.
- Allowed paths: `Dockerfile` (frontend-build stage only), `frontend/src/app/Layout.tsx`, one frontend test file, frontend environment typing if needed, and this devlog.
- Excluded: workflows, deployment scripts, Compose, backend code, shared documentation indexes, other tasks' files, and production operations.
- Dependencies: existing Compose build arguments and deployment script already supply the verified release SHA; no dependency PR or business contract change is needed.
- Authorization: implement and verify T4, push its isolated branch, open a normal PR titled `feat: show release SHA in footer`, then stop for team integration. No merge or deployment is authorized.
- Rules read: `AGENTS.md`, `.github/CONTRIBUTING.md` (including Branches and Worktrees), `docs/tech-stack.md` section 5, `docs/testing.md`, `docs/collaboration/decisions.md` (D-003 and D-011), `docs/collaboration/agent-workflow.md`, `docs/contracts/README.md`, `docs/devlog/README.md`, and `.github/pull_request_template.md`.
- Skills read and applied: `.agents/skills/serms-task/SKILL.md`, `.agents/skills/serms-worktree/SKILL.md`, `.agents/skills/serms-verify/SKILL.md`, and `.agents/skills/serms-pr/SKILL.md`.

### What was built

The frontend Docker build accepts `RELEASE_SHA=local` and exposes it to Vite as the public build-time variable `VITE_RELEASE_SHA`. The existing footer keeps the system name and Team 07, and adds the first seven release characters. Development and builds without a release value display `Release local`.

### Design notes

The release identifier is public commit metadata. Vite embeds it in the existing JavaScript bundle, so no runtime request, inline script, CSP change, secret, or new dependency is needed. The footer uses its existing small, muted styling. Build arguments are declared immediately before the frontend build to preserve dependency-install caching. Existing app/web image revision labels are unchanged. No design pattern or business/API contract changes apply.

The component tests reuse the existing authentication provider, query provider, router, and shared MSW server. They assert visible footer content for two different release commits, missing and empty values, and development mode. Environment stubs are restored after each test.

### Problems and fixes

| Symptom | Root cause | Fix | How it was verified |
| --- | --- | --- | --- |
| Deployments had image revision labels but identical footer text | The independent frontend build stage did not receive the release argument | Pass the existing release argument into Vite and render its abbreviated value | Component tests and frontend/container build checks below |
| Managed worktree creation was unavailable from the chat folder | The chat workspace is not a Git repository | Use the explicitly approved, separate T4 clone | Fresh clone status, HEAD and worktree inspection |

### Verification

Environment: Windows, Node `24.20.0`, pnpm `11.19.0`, TypeScript `5.9.3`, Vite `7.3.6`, Vitest `3.2.7`, Git `2.55.0.windows.4`, Docker client/engine `29.8.2` (Docker Desktop Linux engine).

Input version: HEAD/base `df9033f0cafd58258bf86594bdc9f7795e9748e2` plus the uncommitted changes to `Dockerfile`, `frontend/src/app/Layout.tsx`, and new `frontend/src/app/Layout.test.tsx`; this log records their results. The PR's commit identifies the delivered version. All checks ran on 2026-10-25 SGT in this task's separate clone.

| Check | Working directory | Result and evidence |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | `frontend/` | Passed; lockfile unchanged |
| `pnpm test -- src/app/Layout.test.tsx` | `frontend/` | Passed, 5 footer component tests |
| `pnpm lint` | `frontend/` | Passed |
| `pnpm typecheck` | `frontend/` | Passed |
| `pnpm test` | `frontend/` | Passed, 18 files and 188 tests, including the 5 new footer tests |
| `pnpm build` | `frontend/` | Passed; generated ignored `frontend/dist/` |
| `pnpm exec prettier --check src/app/Layout.tsx src/app/Layout.test.tsx` | `frontend/` | Passed |
| `docker build --target web --build-arg RELEASE_SHA=0123456789abcdef .` | Repository root | Passed; image `sha256:0fea9dfd7f876994e8b5c4e56687cf269125014b62adc4c9a89b56a812ef29b8` |
| Built-image bundle and revision-label inspection | Repository root | Passed; a temporary container with networking disabled found `"0123456789abcdef".slice(0,7)` and `Team 07 · Release` using that value in `index-DvYXlSdn.js`; image revision label remained `0123456789abcdef`. The container was automatically removed |
| `git diff --check` | Repository root | Passed |

The first sandboxed Docker version probe could not access its engine pipe; the authorized elevated retry and build succeeded. Test output included chart-size warnings from the report component tests; both builds included dependency annotation and chunk-size warnings. These did not fail checks and no unrelated files were changed to suppress them.

Local component tests use the existing MSW API mocks. No real database, E2E browser run, production deployment, human acceptance or remote CI result is claimed. CSP configuration is unchanged; release metadata is embedded in the existing external JavaScript asset and adds no inline code or external request. Generated `node_modules/`, `frontend/dist/` and TypeScript build state are ignored local artifacts, not committed files. No services were started or left running.

### Deviations

No technical differences from the task brief were found at the recorded baseline. The user-requested normal PR and clone fallback apply to this task. No PNG or diagram was requested or produced.

### Follow-ups

The team owns PR integration and subsequent deployed/member acceptance. CI, merge, deployment and team Done remain separate from local verification.

### Authorship

Code, component tests and this log were written by Codex for Liu Tongyao's T4 assignment. No human review, approval, personally executed test or effort estimate is claimed.
