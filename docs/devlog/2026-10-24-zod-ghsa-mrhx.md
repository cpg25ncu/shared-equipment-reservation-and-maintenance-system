# Zod security patch for GHSA-mrhx-c7xc-m3w5

Owner: Liu Tongyao (@cpg25ncu) · Requirement: conversation task, no Issue number · Branch: `fix/liu-tongyao-zod-ghsa-mrhx` · Baseline: `90d840e5e07efb80775cc435518eb41679e35e15` (`origin/main`)

## 2026-10-24 minimum security update

### What was built

Updated the direct frontend dependency to `zod ^4.6.6`, locked at exactly `4.6.6`, to address the HIGH finding CVE-2023-54404 / GHSA-mrhx-c7xc-m3w5 reported by Trivy on PR #103. Only the zod package and its existing `@hookform/resolvers` peer references are in scope; no other dependency upgrade, application edit, test edit or workflow change is authorized.

### Design notes

Use the minimum fixed patch, not a later minor. Codex is the sole writer in `C:/Users/14824/.codex/worktrees/serms-zod-ghsa-mrhx/SWE5006_Group_Project`. The fetched main baseline is unchanged from the documentation task; this independent branch does not include PR #103's documentation changes. Previously read SERMS rules/skills remain applicable and were not reread in this follow-up. No interface contract or design pattern changes.

### Problems and fixes

The unchanged main lockfile also resolves the vulnerable `4.6.5`; documentation-only PR #103 cannot remove that finding. This security PR must merge into main and #103 must subsequently incorporate that main before its Trivy result can clear. Neither merge is performed by this task.

### Verification

Node.js 24 / pnpm 11.19.0 on Windows. The delivery PR records the exact final HEAD, one lockfile-diff review, one `pnpm install --frozen-lockfile && pnpm typecheck && pnpm test` run in `frontend/`, and one post-push CI wait. Results are appended there after execution; no intermediate-commit test runs or unrelated local checks are performed. Frontend tests use the existing component/API mocks; they do not establish production or member acceptance.

### Deviations

This is the owner's explicitly requested critical security fix after the 2026-10-22 code freeze. The dependency patch is the only runtime change.

### Follow-ups

The PR opens ready for review. A future merge triggers Deploy and, after its release gate and production approval, actually publishes the new frontend build. The owner controls merge/production approval; Codex performs neither. PR #103 stays draft. Local checks, CI, member acceptance, merge, deployment and team Done remain separate.

### Authorship

Written by Codex at Liu Tongyao's (@cpg25ncu) request. No Issue, human approval, member test, meeting or effort hours are invented.
