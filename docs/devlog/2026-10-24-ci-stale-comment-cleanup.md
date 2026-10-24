# CI stale comment and documentation cleanup

Owner: Liu Tongyao (@cpg25ncu) · Requirement: conversation task to align CI/CD documentation with implemented automation; no Issue number · Branch: `fix/liu-tongyao-ci-stale-comments` · Baseline: `90d840e5e07efb80775cc435518eb41679e35e15` (`origin/main`)

## 2026-10-24 CI/CD documentation inventory

### What was built

Updated comments and current documentation to describe the three security jobs in `ci.yml`, the separate build/test workflows, and the distinct merge and release gates. Corrected the old pipeline diagram and claims about CodeQL, Dependabot, registry use, static-analysis tools, and manual ZAP/k6 checks. No application or pipeline behavior changed.

The delivery [PR #103](https://github.com/cpg25ncu/shared-equipment-reservation-and-maintenance-system/pull/103) targets `main`; its exact HEAD, Actions links and final CI conclusions are recorded in the PR's Verification Evidence section after push. Initial documentation commit `20f74a0` was pushed before PR creation; this follow-up adds the real PR link. This entry records the local input and observations made before the delivery commit.

### Design notes

- Sole writer/coordinator: Codex, acting for Liu Tongyao. Worktree: `C:/Users/14824/.codex/worktrees/serms-ci-stale-comments/SWE5006_Group_Project`. Fetched `origin/main` on 2026-10-24 at about 15:59 SGT; starting HEAD and rule baseline were `90d840e5e07efb80775cc435518eb41679e35e15`.
- Authorized paths: comments under `.github/`, current CI/CD guidance, and this new log. Exclusions: workflow jobs/steps/triggers/permissions, application code, tests, contracts, repository settings, existing development logs/evidence, production actions, merges and comments on other Issues/PRs. Push and PR creation are authorized by the conversation task.
- Dependencies: existing main workflows, `scripts/verify-release.mjs`, `scripts/deploy.sh`, `Dockerfile`, `frontend/package.json`, and read-only GitHub settings. No dependency PR or contract change; no new design pattern.
- The primary checkout remains detached at `74103d5c7b4f32dfb02d7514666d845a2b878db8`; its untracked proposal document is outside this task. Other worktrees are untouched.
- Rules and skills read: `AGENTS.md`, `.github/CONTRIBUTING.md`, `.github/pull_request_template.md`, `.gitattributes`, `.agents/skills/serms-worktree/SKILL.md`, `.agents/skills/serms-verify/SKILL.md`, `.agents/skills/serms-pr/SKILL.md`, `docs/devlog/README.md`, `docs/collaboration/agent-workflow.md`, `docs/collaboration/ownership.md`, `docs/collaboration/decisions.md`, `docs/contracts/README.md`, `docs/tech-stack.md`, and `docs/testing.md`. The newer main rules were checked against the primary checkout before writing.

### Problems and fixes

| Symptom | Root cause | Fix | How it was verified |
| --- | --- | --- | --- |
| `ci.yml` described all merge requirements as its three jobs, deferred stack selection/CodeQL, and retained a commented Node example | Initial scaffold comments survived later workflows | Describe only its three security checks, map existing build/test workflows, and remove the obsolete example | All workflow files inspected; branch-protection API returned 8 names; imported `requiredChecks` returned 12 |
| Release-trigger comment claimed all documentation-only pushes were ignored | Trigger filtering matches paths rather than semantic content | Explain that workflow YAML, including comment-only edits, triggers Deploy | `deploy.yml` filters and `production` required-reviewer setting read without mutation |
| Dependabot wording implied the freeze date would end its pause | Five zero PR limits remain configured without a date condition | State that updates remain paused and resumption needs an owner decision/configuration change | `.github/dependabot.yml`; repository metadata reports `dependabot_security_updates.status=disabled` |
| Technology guide still showed GHCR, Compose pull, Spotless/SpotBugs/ArchUnit and automatic post-deployment scans | Target design text conflicted with implemented workflows and D-009 | Replace the diagram/table with current automation and separate manual evidence | `release-config.yml`, `Dockerfile`, `scripts/deploy.sh`, frontend scripts, `app/pom.xml`, D-009; no ZAP/k6 invocation in workflow inventory |
| DoD wording deferred CodeQL/ESLint and described deployment as automatic | Stale status language | Reference active checks, existing production approval and manual acceptance, preserving the team's green-CI/member-check requirements | `codeql.yml`, `frontend-tests.yml`, `deploy.yml`, GitHub workflow states and environment rules |

### Verification

Environment: Windows, PowerShell, Node.js `v24.20.0`, external `yaml@2.8.1` parser using YAML 1.2. The parser and audit outputs are outside the repository; no package or lockfile was changed. Local input HEAD was the baseline above plus the nine explicitly scoped files in this PR, including this entry. No mock, database, ZAP, k6 or production execution was needed for comment/documentation changes.

For **each modified YAML**, read the baseline with `git show <baseline>:<path>`, parse baseline/current text with `yaml.parse(..., {version: '1.2', uniqueKeys: true})`, recursively sort object keys, serialize each to JSON, and run `git diff --no-index -- <before.json> <after.json>`. All three comparisons exited 0 with empty output. Nonblank, non-comment YAML lines were also compared byte-for-byte and were identical.

| YAML file | Before/after canonical JSON SHA-256 (identical) | Result |
| --- | --- | --- |
| `.github/workflows/ci.yml` | `a47d6148222a5cba51f4174918638290d2198c606f5fe7bd567012c49fc8496a` | passed; empty JSON diff |
| `.github/workflows/deploy.yml` | `b06adc49f7f5fd554155c8e94a0d8b2948bfda3b047e59111cb1ffd96122362c` | passed; empty JSON diff |
| `.github/dependabot.yml` | `a3f259faccc5dde142082599cf57b54e702848a8992d6d88cabc57859de7e9b5` | passed; empty JSON diff |

Other local checks: `node scripts/check-collaboration.mjs` passed (19 documents, 7 skills); UTF-8 without BOM/LF validation and `git diff --check` passed. Scope review allows only the three YAML comment edits, five current Markdown guides and this new log. Existing dated development logs and all `docs/evidence/` files are unchanged. README and CONTRIBUTING required no corrections: their current navigation/eight-check baseline is consistent. Historical Sprint snapshots, repository-preparation records and old AGFP references retain their date/commit context.

Read-only settings checked on 2026-10-24:

- `gh api repos/cpg25ncu/shared-equipment-reservation-and-maintenance-system/branches/main/protection`: 8 required checks, strict up-to-date branches. The exact names are in [the current inventory](../tech-stack.md#33-devsecops-pipeline-proposal-83--dod-items-7-and-8).
- Imported `requiredChecks` from `scripts/verify-release.mjs`: those 8 plus `collaboration-docs`, `maintenance-postgres`, `release-config`, `release-images` (12 total).
- `gh api repos/cpg25ncu/shared-equipment-reservation-and-maintenance-system/actions/workflows`: CodeQL and the application/security workflows are active.
- Repository metadata: Dependabot security updates disabled. The separate alerts query returned HTTP 403 saying alerts are disabled; this is not a successful vulnerability scan and no permission or setting was changed.
- `gh api repos/cpg25ncu/shared-equipment-reservation-and-maintenance-system/environments/production`: `required_reviewers` protection is present.

Hosted CI is pending at this entry's pre-commit writing time; the delivery PR records final results for its actual latest HEAD after all checks finish. Human/member checks, merge, deployment and team Done are not performed or claimed. No new evidence file is added to `docs/evidence/`.

### Deviations

No technology, contract, ownership, threshold, merge policy or pipeline behavior change. This is the owner's explicitly requested nonfunctional cleanup after the 2026-10-22 code freeze. The actual server path `/opt/agfp` and Compose project `agfp` remain intact.

### Follow-ups

- Liu Tongyao decides whether `maintenance-postgres`, `release-config`, `release-images`, `collaboration-docs`, and CodeQL should become branch-protection requirements. Existing settings remain unchanged; CodeQL and `approval-postgres` are absent from both gate lists.
- Liu Tongyao decides separately whether/when to resume Dependabot version updates or enable security updates; this cleanup does neither.
- Merging this PR triggers Deploy because `ci.yml` is outside `paths-ignore`. After the unchanged release gate passes it waits for production approval. Application code is unchanged; Liu Tongyao may approve or reject it. No merge or deployment approval is authorized to Codex in this task.

### Authorship

Written by Codex at Liu Tongyao's (@cpg25ncu) request, including the inventory, comment/documentation edits and this entry. No Issue, human review, member test, approval, meeting or effort hours are invented.

## 2026-10-24 documentation follow-up

Codex, at Liu Tongyao's request, added the latest anonymous passive ZAP baseline (2026-10-17, deployed `2993b78`, 0 FAIL / 5 WARN / 62 PASS) alongside the 2026-10-16 result in the technology guide, backup runbook and Sprint status. The technology table now distinguishes its original `cef0e10` snapshot from CI/CD verification against `90d840e` on 2026-10-24; Sprint status now describes Deploy's path filtering accurately. Only these three guides and this appended log section change in this follow-up; no YAML changes or repeated YAML comparison.

The fetched main baseline is unchanged. This round runs only `node scripts/check-collaboration.mjs`, `git diff --check` and the four-file Markdown scope check once on its final HEAD; results and the single post-push CI wait are appended to PR #103. The contract's remaining ArchUnit wording requires Zhang Hanming's confirmation and is left untouched, as is the historical `docs/local-repository-closeout.md`. The separate zod security PR must merge into main and #103 must then incorporate that main before its Trivy finding can clear. No merge, repository-setting change or human acceptance is claimed.

## 2026-10-24 owner-authorized integration and unified gates

Liu Tongyao explicitly authorized the remaining integration, settings and deployment coordination in conversation, recorded in [the dated decision](../collaboration/decisions.md#unified-ci-gates-and-dependabot-security-2026-10-24). PR #104 merged with merge commit `8f9c063fc48e46da251d079c4207ec417cffd58d`; #103 then merged that main in its existing worktree/branch. The sole writer remains Codex, acting for Liu Tongyao. This new main SHA is the integration baseline for this round; earlier entries retain their historical inputs and results.

**Scope now includes a release behavior change:** `requiredChecks` gains `approval-postgres`, `Analyze java` and `Analyze javascript-typescript`, so both merge and release gates use the same 15 GitHub Actions checks. Release retains the exact current main SHA, readiness flag and production human approval. Matching current guidance and CONTRIBUTING's numeric baseline are synchronized. Existing release tests derive their fixtures/count from `requiredChecks`, so no literal list assertion needs changing. YAML edits remain comments only.

The owner resolved the previously pending decisions: he confirmed the single contract-row removal of `ArchUnit rules` under D-009 without further Zhang Hanming confirmation, approved enabling Dependabot alerts/security updates, and kept version updates paused until after the final project report/presentation. The exception does not authorize other contract changes. Application source, other dependencies, existing evidence and Deploy triggers remain untouched.

Run only the requested release-script tests, collaboration checker, `git diff --check` and non-comment YAML line comparison once on final HEAD, then one post-push PR CI wait. Append results, setting readbacks, actual merges and deployment/health outcomes to the PR records after execution. Apply protection/security settings only after green CI. Keep production approval with Liu Tongyao; a successful health check would not establish signed-in member acceptance or team Done. Codex authored this appended section; no human checks or future outcomes are invented.
