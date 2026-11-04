# Scalable monolith with load balancing

Requirement: the instructor's report feedback, "implement at least scalable monolith with load balancing". Decision: [D-014](../collaboration/decisions.md#d-014-scalable-monolith-with-load-balancing).

Branch: `claude/bold-franklin-barevs` · Baseline: `main` `16a1030` · Evidence: [scaling 2026-11-04](../evidence/scaling-20261104/README.md)

## 2026-11-04 Task

The user asked for the code to match the report:

- multiple replicas with nginx load balancing;
- sessions in the database (Spring Session JDBC);
- scheduler locks (ShedLock);
- rolling updates;
- Prometheus/Grafana monitoring;
- re-measured test counts, coverage, ZAP and k6 figures.

Production was not touched, and no member confirmation is claimed.

## Changes

| Area | Files |
| --- | --- |
| Shared sessions | `app/pom.xml` (`spring-boot-starter-session-jdbc`); Flyway `V008__spring_session.sql`. In `application.properties`, the table is `serms.spring_session` and `initialize-schema=never`. `shared/config/SessionCookieConfig.java` keeps the contract cookie `JSESSIONID` with HttpOnly, Secure and SameSite=Lax |
| Scheduler locks | ShedLock 7.9 (`shedlock-spring`, `shedlock-provider-jdbc-template`); `V009__shedlock.sql`; `shared/config/SchedulerLockConfig.java` (database clock). `@SchedulerLock` is on `LoanReminderScanner.scheduledScan`, `CollectionReminderScanner.scheduledScan` and the new `NotificationWorker.scheduledDelivery` |
| Metrics | `micrometer-registry-prometheus`; `prometheus` exposure with an HTTP histogram and SLOs; `SecurityConfig` permits `/api/v1/prometheus` and the health probes; nginx returns 404 for the metrics path |
| Replicas and load balancing | `compose.yaml`: `deploy.replicas: ${SERMS_APP_REPLICAS:-2}`, graceful stop, Hikari pool per replica, `frontend` / internal `backend` networks. `web/nginx.conf`: `upstream app_pool` with `least_conn`, `resolve` through Docker DNS (`valid=2s`), `max_fails=0`, `proxy_next_upstream` (10 s budget, 1 s connect timeout), one-time GET/HEAD replay on nginx-generated 502/503/504 |
| Rolling update | `scripts/rolling-update.sh` (new), called from `scripts/deploy.sh`; `scripts/test-deploy.sh` adds `replica-unhealthy` and stricter `success` assertions |
| Monitoring | `compose.monitoring.yaml`; `monitoring/prometheus/{prometheus,alerts}.yml`; Grafana provisioning and the *SERMS · scalable monolith* dashboard |
| Verification | `ClusterScalingPostgresTest` (two real replicas on one database); `scripts/verify-cluster.sh`; `scripts/verify-rolling-update.sh`; `release-config.yml` runs both on a two-replica stack in `release-images` |
| Test support | `testsupport/SpringSessionMockMvcBridge` (test classpath only) maps the Spring Session cookie onto `MockHttpSession`, so existing MockMvc session tests keep their meaning on the JDBC repository |
| Load script | `scripts/load-k6.js` accepts `SERMS_K6_VUS` (default 50) |

## Problems and fixes

| Symptom | Cause | Resolution and verification |
| --- | --- | --- |
| `AdminSessionPostgresTest` errors after adding Spring Session | The test datasource has no `search_path`, so the unqualified `SPRING_SESSION` table was not found | Table name `serms.spring_session` (and `serms.shedlock`); the H2 test profile keeps unqualified names with `initialize-schema=always` |
| MockMvc session tests got `null` sessions | With Spring Session, the server ignores `MockHttpSession` and uses its cookie | Test-only bridge: a first-in-chain filter adds the cookie after every request post-processor; the result handler maps rotated and expired cookies onto `MockHttpSession`, and copies persisted attributes so session-content assertions still apply |
| 4 `Uc05PostgresIT` failures | Tests call `deliverPending()` directly; a lock on that method with `lockAtLeastFor` skipped the next call | Lock moved to the new scheduled entry point `scheduledDelivery()`, the same pattern the scanners use; 10/10 pass |
| Cookie became `SESSION` in MockMvc but `JSESSIONID` on a real server | Boot applies `server.servlet.session.cookie.*` to Spring Session only when a web server is configured | Explicit `CookieSerializer` bean reading the same properties; the contract cookie shape is unchanged everywhere |
| 1–2 nginx 502s per rolling update | Docker DNS lists a replica before it listens and keeps a stopped one briefly; nginx parked peers (`max_fails`) and lost its retry state when the resolved set changed mid-request | `max_fails=0`, 2 s resolver cache, 1 s connect timeout, unlimited retries in 10 s, GET/HEAD replay; the script waits one resolver period after the new replicas are healthy and stops old replicas one at a time. Result: 0 failures in 4 runs |
| Fake `docker` in `test-deploy.sh` reported a failed build as success | A new trailing `if` reset the exit status | `exit 1` inside the build branch; 8/8 boundary cases pass |
| 32 context-load errors in one regression run | The shell had sourced the local cluster `.env` (`SERMS_BOOTSTRAP_ADMIN_*`), which made the PostgreSQL-only bootstrap run in H2 tests | Re-ran in a clean environment: 690/690. CI sets those variables only in the Compose smoke step |
| Maven wrapper and Docker Hub downloads were rate-limited (HTTP 429) | Shared sandbox egress | Used the preinstalled Maven 3.9.11 with retries, and `mirror.gcr.io` for base images; local images were built from host artifacts with the repository's runtime stages (see the evidence README) |

## Verification (2026-11-04, this environment)

| Check | Result |
| --- | --- |
| `app/` `mvn -B clean verify` | 690 tests, 0 failures; JaCoCo business coverage 77.87% (1316/1690), gate met |
| `-Puc02-postgres-it` | 30/30 |
| `-Puc03-postgres-it` | 41/41 (LoanPostgresIT 21, Uc05PostgresIT 10, EquipmentManagementPostgresIT 10) |
| `MaintenancePostgresIT` (CI procedure: psql V001–V009 into a fresh PostgreSQL 18, `-Puc04-postgres-it`) | 30/30 |
| Front end: lint, typecheck, `pnpm test`, `check:api`, `test:e2e`, `role-access.test.mjs` | Pass; 188 tests; no drift; 16 E2E; 9 role-inventory tests |
| `scripts/test-deploy.sh` | 8/8 boundary cases |
| `verify-compose.mjs`, `verify-cluster.sh`, `verify-rolling-update.sh` on the two-replica stack | Pass; see the evidence README |
| k6, ZAP | See the evidence README |
| Hosted CI, member confirmation, merge, deployment | **Not run.** These follow after push |
