# Project report: target architecture views

Requirement: instructor feedback on the project report. Asked for: a detailed DevOps pipeline and test evidence, more architecture views (deployment), detailed DDD diagrams, class and sequence diagrams for one or two critical use cases, data schemas, a scalable monolith with load balancing, and a discussion of microservices.

Branch: `claude/bold-franklin-barevs` · Baseline: `16a1030`

## 2026-11-04 Report written into the course template

- The user asked for the report to show the ideal result, with diagrams drawn as the target design, and said code changes are optional.
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
