# Scrum Master and Shared Responsibilities Record (2026-11-21)

Owner: Liu Tongyao (@cpg25ncu) · Requirement: repository owner's instruction of 2026-11-21 · Branch: `docs/liu-tongyao-scrum-master` · Baseline: main `f612846`

Decision: [D-017](../collaboration/decisions.md#d-017-scrum-master-and-shared-responsibilities).

## 2026-11-21 What happened

The owner reported that the repository misstated their role. They own UC04 end to end, later took over integration and the production release, and are the team's Scrum Master who chairs the Sprint meetings. The Sprint plan instead named Member 1 (Shi Wenqi) as chair of every ceremony.

### How the records diverged

| Date | Commit | Author | Effect |
| --- | --- | --- | --- |
| 2026-10-07 | `0bf5b3b` (#11) | Shi Wenqi | First backlog, Sprint plan and agile README with unnamed members: Member 1 holds requirements/tasks/Sprints and chairs all ceremonies; Member 4 holds testing |
| 2026-10-07 | `5559503` | Zhou Fanhao | Backlog member table gains names; Member 4 Liu Tongyao holds Product Backlog, Sprint management, progress consolidation. Other shared duties also move (Member 1 CI/CD, Member 2 testing, Member 5 architecture) |
| 2026-10-13 | `a04f19a` | Liu Tongyao | English translation; both mappings kept as they were |
| 2026-10-15 | `89705f9` (#73) | Shi Wenqi | Backlog table changed to give Member 1 Sprint management and Member 4 testing |
| 2026-10-15 | `19e00a8` (#76) | Liu Tongyao | #73 reverted; the named table returns |

The ceremony chairs, the agile README, the evidence index, the status header and the ownership table never followed the named table. D-002 recorded the difference without resolving it.

The untracked Project Proposal in the owner's checkout lists the five members but no roles, so it does not settle the question.

## What this change does

- Sprint plan:
  - names Liu Tongyao (Member 4) as Scrum Master and chair of planning, weekly meetings, reviews and retrospectives;
  - in the Sprint 0, 1, 3 and 4 tables, moves each shared-duty clause to its owner in the named table. Use-case clauses stay with their members. Sprint 1 had no Sprint-management row, so Member 4's row there reads "Sprint board, tasks and progress tracking". Sprint 2 is unchanged.
- Agile README: Scrum Master title, intro and task column. The Sprint 1–2 UC01 development row is removed, since it was UC01 work rather than agile management. A line keeps Shi Wenqi's authorship of the first backlog and Sprint plan.
- Evidence index and status header: the Scrum Master maintains them.
- Backlog: the Member 4 row says "Scrum Master".
- Ownership table: the long-term column follows the named table and links D-004 for integration and release execution.
- Decisions: adds D-017 and marks D-002 resolved.

Not changed, as history: dated Sprint status snapshots, the backlog's per-Sprint delivery rows (for example "Requirements/tasks (this file) · Member 1 ✅", which records who delivered it), the demo script used at the 2026-10-26 presentation, and all devlogs.

## Verification

`node scripts/check-collaboration.mjs` on the branch; result recorded in the PR.

## Follow-ups

- Confirmations from Shi Wenqi, Zhang Hanming, Zhou Fanhao and Wang Yuanmeng are not recorded. The owner decides whether to ask them.

## Authorship

Agent-written (Claude Code) on the owner's instruction. The history above was read from Git; no meetings, reviews or approvals are recorded here.
