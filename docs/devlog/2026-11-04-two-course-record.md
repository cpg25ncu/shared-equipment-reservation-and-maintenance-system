# Two-course Record and Report Removal (2026-11-04)

Owner: Liu Tongyao (@cpg25ncu) · Requirement: repository owner's instruction of 2026-11-04 · Branch: `docs/liu-tongyao-second-course-record` · Baseline: main `3740a83`

Decision: [D-016](../collaboration/decisions.md#d-016-repository-shared-by-two-courses).

## 2026-11-04 What happened

- Shi Wenqi (@YukiOvOb) opened PR #118 at 17:23 SGT and merged it himself at 18:04 SGT: 114 files, +9757 / −42. All 16 checks passed, and nobody reviewed it. The PR asked three members to confirm (Wang Yuanmeng, Zhou Fanhao, Zhang Hanming); none had confirmed at merge time.
- The work answers instructor feedback on a second course's project report:
  - a scalable monolith ([D-014](../collaboration/decisions.md#d-014-scalable-monolith-with-load-balancing));
  - a replicated data tier with edge rate limits ([D-015](../collaboration/decisions.md#d-015-read-replica-pitr-off-host-backups-and-edge-rate-limits));
  - the report `docs/report/SERMS_Project_Report.docx` with 21 diagrams.
- The report names "Team 6, four students" and records UC04 as shared. An agent review read this as removing Liu Tongyao from the SWE5006 team and proposed reverting #118. The owner then explained that the repository serves two courses and that Liu Tongyao is not in the second course's group. The revert was dropped; nothing was reverted.

## 2026-11-04 What this change does

- Removes `docs/report/` from `main`: the `.docx`, `build/build_report.py`, `build/report_content.py`, `build/tocpages.py`, `build/render-diagrams.sh` and `README.md`. The files stay in history at `3740a83` and on branch `feat/shi-wenqi-scalable-architecture`.
- Adds D-016 and a short pointer in [ownership](../collaboration/ownership.md#sources-of-shared-responsibilities-and-specific-deliveries).
- Keeps:
  - `docs/diagrams/report/`: Mermaid architecture sources with no team or course data;
  - the `.gitleaksignore` entry for `report_content.py`, because gitleaks scans the full history and the reviewed false positive stays in commit `9b9d4cb`;
  - Shi Wenqi's two 2026-11-04 devlogs, unedited (one writer per file). Their mentions of `docs/report/` refer to the files as of `3740a83`.
- Changes only `docs/**`, so the push to `main` starts no `Deploy` run.

## Open items

| Item | Owner | State on 2026-11-04 |
| --- | --- | --- |
| D-014 confirmations | Wang Yuanmeng (CI/CD, deployment, UC05 scheduler); Zhou Fanhao (migrations); Zhang Hanming (session cookie unchanged) | Not recorded |
| D-015 confirmations | Zhou Fanhao (database configuration, backups); Wang Yuanmeng (deployment, cron, off-host target); Zhang Hanming (login `429`) | Not recorded |
| Login `429`: `POST /api/v1/auth/login` can return `429 /problems/rate-limited` from nginx; [auth-and-approval](../contracts/auth-and-approval.md) does not list it | Zhang Hanming confirms; the contract is then updated in its own PR | Open |
| Production release of #118 | Release decision: repository owner. Server work: Shi Wenqi | Waiting; see below |
| Report-only content (effort figures, the UC04 split in that report) | Team 6, outside the repository | Not tracked here |
| Branches `feat/shi-wenqi-scalable-architecture` (merged, still holds the report) and `claude/bold-franklin-barevs` (an earlier copy of the same commits) | Shi Wenqi | Kept; only their owner deletes them |

### Release of #118

Facts:

- Production runs `16a1030`, released on 2026-10-27.
- Deploy run [41811674506](https://github.com/cpg25ncu/shared-equipment-reservation-and-maintenance-system/actions/runs/41811674506) for `3740a83` has passed `release-gate` and waits for `production` approval. The environment reviewers are `cpg25ncu` and `YukiOvOb`.
- Once a later commit is on `main`, `scripts/deploy.sh` stops that run before it changes the server, because it requires `origin/main` to equal the release SHA. Reject the stale run, and start `deploy.yml` on the current `main` when the release is wanted.

The first release with #118:

- recreates `db` once, a few seconds of downtime;
- clones `db-replica`;
- signs every user out once, because sessions move from Tomcat memory to the database.

Server work before the release ([server release](../server-release.md), [backup runbook](../runbook-backup.md)):

- host nginx sends `X-Forwarded-For`; without it, the rate limits do nothing;
- `.env` gains `SERMS_OFFSITE_TARGET` and `SERMS_OFFSITE_KEY_FILE`, and `GRAFANA_ADMIN_PASSWORD` before the monitoring overlay starts;
- the operator installs the cron entries from the backup runbook.

After that release, V008 and V009 are in the production database. Flyway has no rule that ignores missing migrations, so any later rollback must keep those two migration files.

## Problems and fixes

| Symptom | Root cause | Fix | How it was verified |
| --- | --- | --- | --- |
| The report seemed to drop a SWE5006 member and reassign UC04 | The report belongs to a second course with a different team, and nothing in the repository said so | D-016 records both courses; the report leaves the repository | Owner's statement in conversation on 2026-11-04 |
