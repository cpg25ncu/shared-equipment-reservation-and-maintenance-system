# SERMS Project Report

`SERMS_Project_Report.docx` is the project report, written into the course template (*02 Project Report Template for Practice Project*). It shows the **target architecture** asked for in the instructor feedback:

- a scalable modular monolith with load balancing,
- several architecture views (C4 context, containers and components; tiers and layers; logical and physical deployment),
- DDD diagrams (subdomains, context map, aggregates, domain events),
- class and sequence diagrams at class/object level for UC01 (submit reservation) and UC03 (receive a return),
- the data schema and an information architecture,
- detailed CI/CD diagrams with test evidence,
- a discussion of how to move to microservices.

The diagram sources are in [`docs/diagrams/report/`](../diagrams/report/) (Mermaid).

## Target design vs implemented on `main`

Some parts of the report describe the target design and are **not yet in the code**. The team must either implement them or reword them before submission:

| Report statement | State on `main` |
| --- | --- |
| N app replicas behind an nginx `upstream` with `least_conn` | One `app` container; `web/nginx.conf` proxies to `app:8081` |
| Spring Session JDBC (Flyway V008) and ShedLock (V009) | Not added; sessions are in-memory and `@Scheduled` jobs run in every instance |
| Rolling update, image-tag rollback, release SHA check in `deploy.sh` | Compose `up` with a health check |
| `release-config` smoke test with two replicas and a cross-replica session | Single-instance Compose smoke |
| Prometheus/Grafana, ops network, off-host backup copy, read replica, ufw, `limit_req` | Not configured in this repository |
| Data retention periods (12 months notifications, 3 years audit, 30 min session) | Proposed values |
| Effort per member and the WBS person-day figures | Estimates; replace them with the team's real figures |

Facts taken from repository evidence: test counts (685 + 30 + 38 backend, 174 front-end component tests), 78.04% coverage, ZAP 0 FAIL / 5 WARN / 62 PASS, k6 reserve p95 2.26 s, milestone dates, the 15 required checks, the schema up to V007 and the class and method names in the detailed design.

## Rebuild

```bash
docs/report/build/render-diagrams.sh /tmp/serms-png
cd docs/report/build
python3 build_report.py <template.docx> /tmp/serms-png ../SERMS_Project_Report.docx
soffice --headless --convert-to pdf ../SERMS_Project_Report.docx
python3 tocpages.py SERMS_Project_Report.pdf      # writes toc.json with heading page numbers
python3 build_report.py <template.docx> /tmp/serms-png ../SERMS_Project_Report.docx toc.json
```

The second build fills the page numbers in the table of contents. Word also refreshes the TOC field when the file is opened.

The build needs Python 3 with `python-docx` and Pillow, Node.js for Mermaid CLI, Chromium, and LibreOffice (only for the page-number pass).
