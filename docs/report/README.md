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

## Implemented vs designed

The scalable-monolith items the instructor asked for are **implemented on this branch and verified** ([decision D-014](../collaboration/decisions.md#d-014-scalable-monolith-with-load-balancing), [evidence](../evidence/scaling-20261104/README.md)):

| Report statement | Implementation | Verification |
| --- | --- | --- |
| N app replicas behind an nginx load balancer | `compose.yaml` `deploy.replicas: ${SERMS_APP_REPLICAS:-2}`; `web/nginx.conf` `upstream app_pool` (least_conn, Docker DNS `resolve`) | `scripts/verify-cluster.sh`: one session served 20/20 by two replicas; killing a replica caused 0 failed requests |
| HTTP sessions in PostgreSQL | Spring Session JDBC, Flyway V008, cookie still `JSESSIONID` | `ClusterScalingPostgresTest` (two real replicas), `verify-cluster.sh` |
| Scheduler locks | ShedLock 7.9, Flyway V009, `@SchedulerLock` on the three scheduled jobs | `ClusterScalingPostgresTest`, `serms.shedlock` rows on the running stack |
| Rolling update | `scripts/rolling-update.sh`, called by `scripts/deploy.sh` | `scripts/test-deploy.sh` (8 boundary cases); `scripts/verify-rolling-update.sh`: 0 failed requests in 4 runs |
| Prometheus / Grafana monitoring | Micrometer endpoint (internal only), `compose.monitoring.yaml`, `monitoring/` (alerts, dashboard) | Both replicas discovered as targets; 5 alert rules loaded; dashboard provisioned |

Numbers in the report are measured: test counts, 77.87% coverage, k6 (50 and 150 users, 1-3 replicas), rolling-update and failover runs, and ZAP (production 2026-10-17; local 2026-11-04). Measurement conditions are in the evidence README.

Still **design only**, and marked as planned or roadmap in the report:

- the PostgreSQL read replica;
- host-nginx rate limiting;
- off-host backup copies;
- campus SSO (OIDC);
- microservices on Kubernetes (Section 6).

The WBS person-days and the per-member effort table are **estimates**; replace them with the team's real figures.

Production still runs the single-replica release until this branch is confirmed by the affected members, merged and deployed through the gated `Deploy` workflow.

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
