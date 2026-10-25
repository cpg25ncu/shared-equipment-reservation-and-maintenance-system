# Presentation architecture, use case and pipeline diagrams

Owner: Liu Tongyao (@cpg25ncu). Requirement: SWE5006 final presentation, conversation task T1.

## 2026-10-25 Task and isolation record

- Objective: deliver readable system use case, as-built architecture and as-built CI/CD diagrams, exported as N1_use_case.png, N2_architecture.png and N4_pipeline.png.
- Sole writer: this Codex T1 session; no subagents or other writing sessions.
- Allowed repository paths: `docs/diagrams/system-use-case.mmd` (the assignment permits Mermaid or PlantUML), `docs/diagrams/system-architecture.mmd`, `docs/diagrams/delivery-pipeline.mmd`, and this dated devlog only.
- Exclusions: primary checkout, shared documentation indexes, application code, workflows, contracts, repository settings, secrets, environments, production operations and other tasks' files. Exported PNGs stay outside Git.
- Worktree: `D:/ChatGPT/Designing_Moder_Software_Systems/.cache/serms-t1-bootstrap`.
- Branch: `codex/presentation-architecture-diagrams`.
- Starting HEAD, fetched origin/main and rule baseline: `df9033f0cafd58258bf86594bdc9f7795e9748e2`.
- Base fetched on 2026-10-25 at approximately 00:01 SGT into a separate task-owned bare clone; the assignment's `90d840e` was superseded. No dependency PRs.
- Authorized scope: the user's T1 assignment, local rendering/export, a scoped commit/push and one draft docs-only PR; no merge or deployment.
- Rules read at the fetched baseline: `AGENTS.md`, `.github/CONTRIBUTING.md`, `docs/collaboration/agent-workflow.md`, `docs/collaboration/ownership.md`, `docs/testing.md`, `docs/collaboration/decisions.md` (D-003, D-009 and D-011), `docs/devlog/README.md`, and `.github/pull_request_template.md`.
- Skills read: `.agents/skills/serms-worktree/SKILL.md`, `.agents/skills/serms-verify/SKILL.md`, and `.agents/skills/serms-pr/SKILL.md`.
- Relevant sources read: `docs/tech-stack.md` sections 2.1-2.5, `compose.yaml`, `Dockerfile`, `web/nginx.conf`, `.github/workflows/*.yml`, `scripts/verify-release.mjs`, `scripts/deploy.sh`, `app/pom.xml`, and identity, administration and checkout/return contracts.

### Design notes

Mermaid CLI renders all three final sources. The use case diagram uses actor symbols, rounded use case nodes, a system boundary and labelled include/extend dependencies. All three use a white background, Arial, NUS blue lines/text and a single orange highlight each. Diagram sources are committed; render tools and PNGs remain outside the worktree.

The architecture combines actual container boundaries with the modular monolith's ten modules and the api/service/domain/repository layer convention. Domain events connect business modules to notification/audit. The optional email path is excluded under D-009.

The pipeline groups the existing jobs rather than reproducing the target technology diagram. The eight checks requested by T1 are explicitly marked as a subset of the current 15-check main/release gate. Documentation-only pushes skip automatic Deploy; images are built on the server. No policy or workflow changes are proposed.

### Problems and fixes

| Symptom | Cause | Resolution and verification |
| --- | --- | --- |
| App worktree creation returned `Not a git repository` | The chat belongs to the presentation folder, which is not a Git repository | Created an independent bare clone and isolated Git worktree using terminal equivalents; attachment also returned `not a managed worktree`. Recorded this tool limitation rather than claiming app management. The primary checkout and other sessions' refs were not mutated. |
| Assignment listed eight required checks, while fetched main lists 15 | The owner's 2026-10-24 gate change is present in current CONTRIBUTING and verify-release.mjs | Retained all eight requested markers and explicitly labelled the actual 15-check gate. |
| Scheduler was included in the assignment's general login wording | Scheduler is an internal time trigger, whereas login is interactive | Show login dependencies for human interaction and the Scheduler trigger separately; this does not invent scheduler credentials or change authentication contracts. |
| Initial renders clipped labels or wasted the slide area | Cached Mermaid CLI 12 has changed its size options and font embedding affected label measurements; initial PlantUML layouts were too wide | Used explicit Arial CSS and `--no-font-embed`, retained only Mermaid for the final diagrams, regrouped the pipeline into compact columns and re-opened every final PNG. |
| PlantUML trial did not produce a suitable final source | The bundled Graphviz cannot output PNG directly and PlantUML suppresses raw DOT diagrams | Discarded the task-owned trial source; the permitted Mermaid alternative is the sole final renderer. No extra tool was installed. |

### Verification

Environment: Windows; Node 24.20.0; Mermaid CLI 12.0.0 (existing cached package); installed Chrome for headless rendering. PlantUML 1.2026.9 / Java 25.0.4 were tried but are not needed for the final sources. Final canvas fitting uses the existing bundled Python/Pillow runtime; no additional package installation.

Verification inputs are the three new diagram sources plus this devlog on the starting HEAD above. The delivered commit is identified in the PR; this record does not invent a self-referential commit hash.

| Check | Result and evidence |
| --- | --- |
| Mermaid render of each source | **Passed** with `node <cached-mermaid-cli>/src/cli.js -i <source> -o <PNG> --size 2800 -s 1.5 -b white --no-font-embed -p <task-puppeteer-config>`. The task configuration selects installed Chrome. Equivalent renderer entry point: `npx -y @mermaid-js/mermaid-cli@12.0.0`. |
| Final export dimensions and boundaries | **Passed**: N1 and N2 are 3200 × 1726; N4 is 3200 × 1654. White canvas fitting preserves aspect and adds margins, without cropping. Automated foreground-bound checks confirm at least 16 px of clearance from every canvas edge. |
| Visual inspection | **Passed**: opened all three final PNGs and 1282 px-wide previews representing the stated areas on a 1080p presentation slide. No clipped labels or missing connections; text remains readable at approximately 14 px or above at that reference size. |
| Collaboration navigation | **Passed**: `node scripts/check-collaboration.mjs` reports 19 documents and 7 skills. Run from this worktree. |
| Actual main protection | **Passed**: read-only `gh api repos/cpg25ncu/shared-equipment-reservation-and-maintenance-system/branches/main/protection` returned the same 15 required check names as `scripts/verify-release.mjs`; all eight requested names are present. No settings were changed. |
| Scope and whitespace | **Passed**: `git diff --check`; explicit staging is limited to the three Mermaid sources and this devlog. No PNG is staged. |
| Hosted CI | **Not run locally**: normal PR workflows execute after the branch is pushed. Their results are separate from the local checks. |
| Application suites / production / human acceptance | **Not run**: documentation-only task; no application changes, production commands, merge or human approval. |

Final exports outside the repository:

- `D:/ChatGPT/Designing_Moder_Software_Systems/Presentation/assets/new/N1_use_case.png`
- `D:/ChatGPT/Designing_Moder_Software_Systems/Presentation/assets/new/N2_architecture.png`
- `D:/ChatGPT/Designing_Moder_Software_Systems/Presentation/assets/new/N4_pipeline.png`

Reproduction: render the three source files using the command above, then fit them proportionally onto white canvases with the listed pixel dimensions and at least 24 px margins. Cached tooling, intermediate SVG/PNG files and JPEG visual previews remain under the presentation folder's task-specific `.cache/serms-t1-render`, outside Git.

### Follow-ups and acceptance

Local rendering, export and visual inspection are complete. The task is delivered through one draft docs-only PR. Hosted CI, Liu Tongyao's presentation acceptance, merge, deployment and team Done remain separate. No production checks are authorized or required for this asset task. No task-started service or browser remains running after rendering. The worktree is retained for review; app-managed worktree creation/attachment remains unavailable in this chat, as recorded above.

### Authorship

Codex authored the diagrams and this factual task log for Liu Tongyao. No member reviews, approvals, meeting records or effort estimates are inferred.
