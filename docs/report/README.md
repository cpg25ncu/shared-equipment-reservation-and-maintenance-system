# SERMS Project Report

`SERMS_Project_Report.docx` (Team 6) is the project report, written into the course template (*02 Project Report Template for Practice Project*). It shows the **target architecture** asked for in the instructor feedback:

- a scalable modular monolith with load balancing,
- several architecture views (C4 context, containers and components; tiers and layers; logical and physical deployment),
- DDD diagrams (subdomains, context map, aggregates, domain events),
- class and sequence diagrams at class/object level for UC01 (submit reservation) and UC03 (receive a return),
- the data schema and an information architecture,
- detailed CI/CD diagrams with test evidence,
- a discussion of how to move to microservices.

The diagram sources are in [`docs/diagrams/report/`](../diagrams/report/) (Mermaid).

## Implemented vs designed

Everything the instructor asked for is implemented and verified on this branch. Report Table 2 maps each architectural element to its code and evidence.

| Report element | Implementation | Verification |
| --- | --- | --- |
| N app replicas behind an nginx load balancer | `compose.yaml` `deploy.replicas`; `web/nginx.conf` `upstream app_pool` | `verify-cluster.sh`: one session served 20/20 by two replicas; replica kill: 0 failed requests |
| Shared sessions, scheduler locks | Spring Session JDBC (V008, cookie `JSESSIONID`), ShedLock (V009) | `ClusterScalingPostgresTest` |
| Rolling update | `scripts/rolling-update.sh` via `deploy.sh` | `test-deploy.sh` 8/8; `verify-rolling-update.sh`: 0 failed requests in 5 runs |
| Prometheus / Grafana | `compose.monitoring.yaml`, `monitoring/` | Both replicas discovered; 5 alert rules; dashboard |
| Streaming read replica for reports and dumps | `db-replica`, `postgres/replica-entrypoint.sh`, `shared/persistence/ReadReplica` | `ReadReplicaPostgresTest`; `verify-data-tier.sh` (routing, fallback, return) |
| WAL archiving + PITR | `postgres/archive-wal.sh`, `base-backup.sh`, `pitr-restore.sh` | `rehearse-recovery.sh`: restore at the target time, 25/0 rows |
| Encrypted off-host backups | `offsite-backup.sh` (AES-256, SHA-256, `pg_restore` check) | The drill restores from the off-host copy alone |
| Edge rate limiting | `web/nginx.conf` `limit_req` | `verify-data-tier.sh`: 21 × 401 then 429 for a public client |

Architected only, as the instructor asked: microservices on Kubernetes with an event broker, and campus SSO (OIDC). Both are in report Section 6 and are marked "Architected" in Table 2.

Measured figures come from the evidence folders [scaling-20261104](../evidence/scaling-20261104/README.md) and [data-tier-20261104](../evidence/data-tier-20261104/README.md):

- 693 + 101 backend tests, 188 + 16 front-end tests, 77.87% coverage;
- k6 at 50 and 150 users on 1-3 replicas;
- rolling-update and failover runs;
- the recovery drill;
- ZAP: production 2026-10-17 and local 2026-11-04.

Team: Team 6, four students (Shi Wenqi, Wang Yuanmeng, Zhang Hanming, Zhou Fanhao). The report records UC04 as shared and testing/quality under Zhang Hanming; confirm this split. The WBS person-days and the per-member effort table are **estimates**; replace them with the team's real figures.

Production still runs the previous release until D-014/D-015 are confirmed by the affected members, merged and deployed through the gated `Deploy` workflow.

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
