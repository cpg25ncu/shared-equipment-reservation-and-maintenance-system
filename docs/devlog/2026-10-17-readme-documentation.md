# README and Documentation Organization

## 2026-10-17 Documentation Entry Points

### Task and Scope

- Human task owner: the requester in the current conversation; no member name or GitHub identity was supplied.
- User-authorized objective: standardize README and move detailed content into the appropriate documentation.
- Sole writer: this Codex session; no delegation or concurrent writer in this new worktree.
- Worktree: `C:/Users/14824/.codex/worktrees/serms-readme-docs/SWE5006_Group_Project`.
- Branch: `codex/readme-documentation`; initial HEAD and fetched `origin/main` baseline: `30bcc6ede1ab197589e3c2f87af8caa7b40ecc39` (fetched 2026-10-17, Asia/Singapore).
- Allowed paths: `README.md`, `AGENTS.md`, `.github/CONTRIBUTING.md`, `.agents/skills/serms-integrate/SKILL.md`, `docs/README.md`, `docs/contracts/README.md`, `docs/collaboration/decisions.md`, `docs/server-release.md` and this log.
- Exclusions: application code, test behavior, workflows, dependency versions, business contract semantics, team ownership, remote settings, production operations and historical evidence. The original checkout and its untracked proposal document are untouched.
- Dependencies: existing `main` documentation, including README refresh #94 and server handover record #95. No implementation dependency or contract change.

### What Changed and Why

| Content | Maintained location |
| --- | --- |
| Project purpose, feature summary, quick start, core technology, basic test commands | [README](../../README.md) |
| Full project name convention, feature/module paths and historical delivery links | [Documentation index](../README.md) |
| Detailed technology, architecture and member test-bench requirements | Existing [technology guide](../tech-stack.md), linked rather than copied |
| Merge permissions, CI prerequisites and contract-change confirmation | [CONTRIBUTING](../../.github/CONTRIBUTING.md#prs-and-team-acceptance) |
| Deployment trigger, environment approval, packaging, ports and secret storage | [Server release runbook](../server-release.md#deployment-entry-points) |
| Dated progress, scope freeze, schedules, detailed checks and evidence | Existing [Sprint status](../agile/sprint-status.md), [decisions](../collaboration/decisions.md) and [testing](../testing.md) |

The earlier checkout was detached at `74103d5`; fetching main exposed the newer README and production records. The work uses the fetched baseline rather than reintroducing the earlier local-only status. Navigation and rule-source links now point directly to their maintained pages. The README's former collaboration heading remains a navigation entry so historical links still resolve. The release runbook's check list now also names `maintenance-postgres`, which was already required by `scripts/verify-release.mjs` and documented in the baseline README.

### Sources Actually Read

- [AGENTS](../../AGENTS.md), [CONTRIBUTING](../../.github/CONTRIBUTING.md), [ownership](../collaboration/ownership.md), [agent workflow](../collaboration/agent-workflow.md) and [decisions](../collaboration/decisions.md).
- [Contract index](../contracts/README.md); no business contract contents changed.
- [Technology guide](../tech-stack.md), [testing](../testing.md), [local demo](../local-demo.md), [server release](../server-release.md), [Sprint status](../agile/sprint-status.md) and [development log guidance](README.md).
- [Implementation](../../.agents/skills/serms-task/SKILL.md), [worktree](../../.agents/skills/serms-worktree/SKILL.md), [verification](../../.agents/skills/serms-verify/SKILL.md) and [PR](../../.agents/skills/serms-pr/SKILL.md) skills; [integration skill](../../.agents/skills/serms-integrate/SKILL.md) read to update its rule-source link only.
- Documentation checker, deployment workflow, release verifier, PR template and repository text attributes.

### Verification

Input version: initial HEAD `30bcc6ede1ab197589e3c2f87af8caa7b40ecc39` plus the nine documentation files listed above. Environment: Windows, Node.js 24.20.0 and PowerShell 7.6.5. No service, database, container or browser session was started.

| Check | Result |
| --- | --- |
| `node scripts/check-collaboration.mjs` | Passed: 19 documents and 7 skills |
| Extended local Markdown check (task-local verification script) | Passed: all 9 edited Markdown files; 192 case-correct local file/heading links; UTF-8 without BOM and LF |
| Relocation and rule-preservation checks (task-local verification script) | Passed: full module map, naming convention and historical delivery table retained; self-merge and affected-owner confirmation rules preserved; former README collaboration anchor retained |
| `git diff --check` | Passed |
| Backend/frontend runtime tests | Not run: documentation-only; no behavior, dependency or test changes |
| Hosted CI / member checks / merge / deployment | Not established by these local checks; follow the PR's latest-HEAD results |

Task-local verification tooling remains outside the repository. The patch is ready for review; team Done is not claimed.

### Authorship

Agent-written at the requester's instruction. No member contribution, effort, approval or meeting is inferred. Existing policies and historical records retain their meaning.
