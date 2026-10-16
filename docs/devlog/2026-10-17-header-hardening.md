# 2026-10-17 Header and cache hardening

Refs #10. Primary human owner: Liu Tongyao (@cpg25ncu). Agent-prepared by Codex;
no member approval, merge, deployment or team Done is claimed.

## Scope and isolation

User-authorized follow-up to the passive ZAP observations in
[the takeover log](2026-10-16-takeover-and-hardening.md) and
[the original report](../evidence/zap-baseline-20261016/zap-baseline.md).
Base/rule baseline: main `da099e065225fed902a8b69f3b9914a1513f2625`.
Branch: `fix/liu-tongyao-header-hardening`. Sole writer: this Codex session.
Worktree: `C:/Users/14824/.codex/worktrees/serms-header-hardening/SWE5006_Group_Project`.
Allowed files: `web/nginx.conf`, `scripts/verify-compose.mjs` and this log.
No frontend, migrations, contracts, workflows, acceptance browser scripts, testing index,
collaboration/agile files or another session's checkout was edited. This PR is independent
of the repository-layer refactor and must remain unmerged under the owner's instruction.

Read: `AGENTS.md`, `.github/CONTRIBUTING.md`, `docs/tech-stack.md` section 2.2,
`docs/testing.md`, contract index and authentication/equipment/checkout contracts,
agent-workflow and ownership guides, PR template, latest Issue #27 comments,
and the `serms-task`, `serms-worktree`, `serms-verify` and `serms-pr` skills.
These rules were checked against the new baseline; no policy change is proposed.

## Implementation and decisions

- React pages and assets add Permissions-Policy disabling camera, microphone, geolocation,
  payment and USB, plus same-origin opener/resource policies. No embedder policy is added.
- All pre-existing security headers remain byte-for-byte unchanged. The API location still
  adds only HSTS and Referrer-Policy; Spring retains ownership of its own security headers.
- A map in the http context classifies Vite's fingerprinted assets by path and filename.
  The default is no-cache, covering index.html, SPA fallback, robots.txt and unversioned files.
  Fingerprinted assets receive public, max-age=31536000, immutable. The map uses the final
  URI, so a missing asset that falls back to index.html is revalidated too.
- Cache-Control is set beside the other location headers. No nested asset location is added
  that could lose nginx header inheritance.
- The existing Compose smoke checks the three additions on all six React routes and their
  JavaScript asset, HTML no-cache, immutable JavaScript caching and the existing single API
  X-Frame-Options assertion. Health, authentication, CSRF and existing security checks remain.

## Verification and limitations

Windows, Node.js 24.20.0. Commands from the dedicated worktree:

| Check | Actual result |
| --- | --- |
| `node --check scripts/verify-compose.mjs` | Passed on the uncommitted inputs included in this PR |
| `git diff --check` | Passed |
| Hosted Release preparation | Pending at preparation; the exact PR-head result is reported on the PR |
| Local Docker/nginx and production | Not run; no Docker images pulled and no existing containers stopped/pruned |

Hosted Release preparation builds and starts the real nginx image and runs the amended smoke;
its success is the nginx-syntax/header evidence. All 16 checks must pass on the delivered head.
Agent verification does not replace member review or the later owner-approved deployment.

No application problem or rule conflict was encountered. Recovery is to revert this scoped
change through the normal PR/deployment process. Review is requested from @cpg25ncu and
@Hanming1008 where GitHub permits it; the PR author cannot be their own requested reviewer.
