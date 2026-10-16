# README and current-state documents — 2026-10-17

Owner: Liu Tongyao (@cpg25ncu) · Branch: `docs/liu-tongyao-readme-standardize` · Baseline: main `cef0e10` · Refs #27

## 2026-10-17 Rewrite the root README as a current entry point

### What was built

The owner asked for a repository review and a standardized README. The root `README.md` was rewritten into fixed sections: Status, Features, Technology Stack, Repository Layout, Run Locally, Testing, Documentation, Collaboration and Releases, and Historical Deliveries.

### Problems found in the previous README

| Problem | Evidence on main `cef0e10` | Treatment |
| --- | --- | --- |
| Current baseline given as main `b3def12` (2026-10-14) with UC05, administration, equipment management, reports and deployment still open | Issues #15, #16, #18, #19, #21-#26 closed; `audit`, `report`, `admin`, `overdue` modules present | Dated status (2026-10-17) that points to Issue #27 for live progress instead of naming a commit |
| "No deployment secrets are configured, so a red `Deploy` run is expected", "production readiness remains disabled", "server runtime pending" | First successful `Deploy` run on 2026-10-15 (`0be0a29`); latest on `cef0e10`; `production` environment has required reviewers | Release bullets describe the actual gate: documentation-only paths ignored, `verify-release.mjs` checks on the exact current main SHA, environment approval |
| CodeQL, OWASP ZAP and Dependabot listed as planned | `codeql.yml` runs on PRs and main; passive ZAP baseline in `docs/evidence/zap-baseline-20261016/`; Dependabot paused by PR #70 | Stack summary states the actual tools; status detail stays in `docs/tech-stack.md` |
| JaCoCo "without an automatic threshold gate" | `docs/testing.md` and `app/pom.xml`: `verify` enforces 70% service/domain line coverage | Corrected |
| "Optional features (if time permits)": email and QR codes | Dropped by D-009 | Removed; README links D-009 |
| Full technology tables duplicated `docs/tech-stack.md` and had drifted from it | AGENTS.md: each rule has one maintained source | One summary table; `docs/tech-stack.md` named as the source |
| Member-specific sections ("SERMS Sprint 1 application", "Zhou Fanhao: ...", "Notification Integration") mixed with current guidance | Historical delivery records under `docs/` | Moved into one Historical Deliveries table; authorship names kept |
| Contract list named only two contracts | Four contracts in `docs/contracts/` | Links the contract index; per-feature contract links in the Features table |

### Design notes

- The `## Collaboration and Releases` heading is kept: CONTRIBUTING, D-001 and the `serms-integrate` skill link its anchor, and CONTRIBUTING names it the maintained source for release and merge permissions. The merge-permission sentence, the PR/required-checks sentence, the contract-change rule and the closing "remain in effect" paragraph are kept verbatim, as D-001 says README merge permissions are not rewritten.
- Facts that change daily (open Issues, SHAs) are not repeated; the README dates its status and links Issue #27, the development log and the Sprint status.
- Use-case owners are not restated; the README links `docs/collaboration/ownership.md` so the ownership table keeps one source.
- The full-name rule for the project report is kept unchanged.

## 2026-10-17 Bring the technology stack, documentation index and Sprint status up to main

### What was built

The README review found three more documents describing main `b3def12`. At the owner's choice this was done in the same branch rather than a separate session.

| Document | Change |
| --- | --- |
| `docs/tech-stack.md` | Snapshot moved to `cef0e10`; status rows corrected (Playwright in CI, overdue scanners, PostgreSQL profiles per workflow, coverage gate, production database, backups, CI/CD, CodeQL, ZAP, k6, containers, registry, server); §2.1 no longer says Compose serves a static welcome page; §3.1 equipment and maintenance state rows cite D-008 instead of "pending confirmation", email/QR rows say dropped by D-009; §3.3 required-check list replaced by the actual eight protected checks; §7 rewritten as the `cef0e10` state, with the `b3def12` state left in Sprint status |
| `docs/README.md` | Current-progress row points to the new Sprint snapshot and Issue #27; rows added for the 2026-10-17 close-out, acceptance evidence, server release/backup/ZAP, UC03 and UC05; `web/` row describes the production runtime |
| `docs/agile/sprint-status.md` | New "Integration Update 2026-10-17" at the top; older snapshots unchanged |

### Design notes

- §3.1 state rows: D-008 says the technology document's wording is updated by the next task that touches it; #17 and #21 did not, so this change does it. No state model changes.
- §1.4 uses 🔶 for ZAP and k6: each ran once, ZAP is not automated after deployment and the k6 reservation p95 (2.26 s) missed the 2 s target on a local instance.
- §3.3 keeps the original pipeline diagram as the target and states the two differences on main: images are built on the server (no GHCR) and post-deployment checks are run by hand.
- §5.2 (member test scopes) and the ownership tables were left unchanged.
- Issue closure dates in the Sprint snapshot were converted from GitHub's UTC `closedAt` to Asia/Singapore.

### Verification

Run on the branch with uncommitted changes, baseline main `cef0e10`, Windows, Node 24.20.0:

- `node scripts/check-collaboration.mjs`: passed, 19 documents, 7 skills. This covers every local link and heading anchor in README, `docs/README.md` and the documents they point to, including the new `integration-update-2026-10-17` anchor and the README anchors other documents use.
- Table column counts checked with a script on all four edited documents; all files UTF-8 without BOM, LF only.
- Facts checked against main: workflow triggers in `.github/workflows/`, the release gate's check list in `scripts/verify-release.mjs`, `compose.yaml`, `deploy.yml` paths and `APP_DIR`, `scripts/deploy.sh` (builds images on the server), `@Scheduled` classes, Maven failsafe profiles, `frontend/package.json`, `app/pom.xml`, the Flyway directory, backend packages, frontend features, `zap-console.txt` (FAIL-NEW 0, WARN-NEW 7, PASS 60) and the Issue #25 log. Live GitHub state read through `gh` on 2026-10-17: required status checks (8, strict), `Deploy` run history, `production` environment protection, Issue states, closure times and latest comments on #10/#17/#20, PRs merged since 2026-10-14.

No application code, workflow or migration changed, so no build or test suite was run. Documentation-only pushes do not start `Deploy`.

### Deviations

None from the Proposal or contracts.

### Follow-ups

- `docs/testing.md` still states some historical baselines (`b3def12`, V001-V006) in its closing paragraph; it was not part of this request.
- After #10, #17 and #20 close, the README Status list and the tech-stack server row need their next update.

### Authorship

Review, edits and this entry were prepared by Claude Code at the owner's request. No member review, approval or hours are claimed.
