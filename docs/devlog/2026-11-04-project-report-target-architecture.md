# Project report: target architecture views

Owner: Shi Wenqi (@YukiOvOb) · Requirement: instructor feedback on the project report. Asked for: a detailed DevOps pipeline and test evidence, more architecture views (deployment), detailed DDD diagrams, class and sequence diagrams for one or two critical use cases, data schemas, a scalable monolith with load balancing, and a discussion of microservices.

Branch: `claude/bold-franklin-barevs` · Baseline: `16a1030`

## 2026-11-04 Report written into the course template

- Shi Wenqi asked for the report to show the ideal result, with diagrams drawn as the target design, and said code changes are optional.
- Added `docs/report/SERMS_Project_Report.docx` (40 pages, 20 figures, 23 tables; diagram PNGs quantised to 128 colours to keep the file near 3 MB). It follows the template sections 1–5, and section 6 covers the move from the scalable monolith to microservices.
- Added the Mermaid sources in `docs/diagrams/report/`: C4 context, containers and components; tiers and layers; logical and physical deployment; DDD context map, aggregates and event flow; ERD; UC01 and UC03 design class and sequence diagrams; reservation states; branching; CI; CD; the microservice target; and the strangler roadmap.
- The design class and sequence diagrams use the real class and method names from `reservation`, `loan` and `maintenance`. Status values match migrations V002–V007.

### Problems and fixes

| Symptom | Cause | Resolution |
| --- | --- | --- |
| The backend could not be compiled in the session container | Maven Central returned HTTP 429, and even the Maven wrapper distribution could not be downloaded | No Java or deployment code was changed. The gaps between the target design and `main` are listed in `docs/report/README.md` |
| Wide diagrams were unreadable on A4 portrait pages | Class, aggregate, sequence and CI diagrams are wider than they are tall | Put these figures in landscape sections, and compacted the sequence diagrams |
| Mermaid sequence render failed | A semicolon inside a message ends the statement | Removed the semicolons from the messages |

### Verification

- The docx passes the OOXML schema check of the docx tooling, compared with the original template.
- Rendered to PDF with LibreOffice and inspected every page. TOC page numbers come from the rendered PDF, and the second pass returns the same numbers.
- Application tests: **not run**. No application files changed.

## 2026-11-04 Report brought in line with the implementation

- Shi Wenqi then asked for the target items to be implemented in code. See [scalable monolith](2026-11-04-scalable-monolith.md) and [D-014](../collaboration/decisions.md#d-014-scalable-monolith-with-load-balancing).
- Report figures and text now match the code: cookie `JSESSIONID`, real nginx settings (AD-07), rolling-update steps (Figure 19), CI jobs and test counts (Figure 18).
- The read replica, off-host backup copy and edge rate limiting are marked *planned*. A k6 scaling chart (Figure 16) and a measured results table were added. Limitations AIS-03 and AIS-07–AIS-09 were updated.
- Measured values: 690 + 101 backend tests, 188 + 16 front-end tests, 77.87% coverage, k6 50/150 users on 1–3 replicas, 0 failed requests in rolling updates and failover, ZAP production 0/5/62 and local 0/2/60.
- `docs/report/README.md` now separates implemented items from design-only ones. The rebuilt docx (41 pages, 21 figures, 24 tables) passes the OOXML check; its TOC page numbers come from the rendered PDF.

## 2026-11-04 Team correction and final report pass

- The team is **Team 6** with four students: Shi Wenqi, Wang Yuanmeng, Zhang Hanming and Zhou Fanhao. The cover, stakeholders, ownership, WBS, effort and issue owners are corrected. UC04 is recorded as shared and testing/quality under Zhang Hanming, pending the team's confirmation.
- The elements previously marked planned are now implemented (D-015). The report presents them as implemented, with evidence. Only microservices on Kubernetes and campus SSO are architected (Section 6), as the instructor asked.
- New tables:
  - architecture scope and implementation status;
  - 4+1 view mapping;
  - ubiquitous language;
  - aggregate invariants;
  - key constraints and indexes;
  - quality attribute scenarios with verified measures.
- Also added: AD-18 to AD-20. Diagrams 02-06, 17 and 20 were updated. The rebuilt docx has 43 pages, 21 figures and 30 tables, and passes the OOXML check.
