# Scalable Monolith Evidence (2026-11-04)

This folder holds evidence for the horizontal-scaling work: app replicas behind the nginx load balancer, HTTP sessions in PostgreSQL (Spring Session JDBC), scheduler locks (ShedLock), rolling updates and Prometheus/Grafana monitoring. The devlog is [2026-11-04 scalable monolith](../../devlog/2026-11-04-scalable-monolith.md).

## Environment

All runs used the branch `claude/bold-franklin-barevs`. The working tree was based on `main` at `16a1030`, with the changes described in the devlog.

| Item | Value |
| --- | --- |
| Host | Cloud sandbox, Linux, 4 vCPU, 15 GB RAM, Docker Engine 29.9.2 (cgroup v1) |
| Stack | `compose.yaml` production profile: `web` (nginx 1.30.6), `app` × N, `db` (PostgreSQL 18.6). `compose.monitoring.yaml` adds Prometheus v3.5.0 and Grafana 12.1.1 |
| Images | Built from the host-compiled jar and SPA with the runtime stages of the repository `Dockerfile`. `docker build` in the sandbox could not reach Maven Central. The app base image was `eclipse-temurin:17-jre` (Ubuntu), not `-alpine`. JVM and application are identical |
| Load tool | k6 1.3.0 (`grafana/k6`), `scripts/load-k6.js`. Each VU logs in, searches and reserves its own item once. Every run used 50 or 150 fresh borrowers and items |
| Load-test cookie flags | Over plain HTTP, k6 does not send `Secure` cookies. Load-test replicas therefore ran with `SERMS_SECURITY_SECURE_COOKIES=false` and `SERVER_SERVLET_SESSION_COOKIE_SECURE=false`. Nothing else changed. All functional checks below used the normal `Secure` cookies |
| CPU experiment | Same stack with `cpus: 1.0` per app replica, so each replica behaves like a one-core host |

These are local measurements, not production capacity figures. Production still runs the single-replica release until this branch is merged and deployed.

## Load-balancing and session checks (`scripts/verify-cluster.sh`)

Output: [verify-cluster.txt](verify-cluster.txt). Two healthy replicas ran behind nginx:

- `/api/v1/prometheus` returns 404 at the edge.
- Login issues the contract cookie `JSESSIONID` with `HttpOnly`, `Secure` and `SameSite=Lax`.
- 40 signed-in requests with one session were split 20/20 between the replicas, and all returned 200.
- The session row is in `serms.spring_session`.
- All three scheduled jobs hold rows in `serms.shedlock`.
- After logout, every replica answers 401.

The existing `scripts/verify-compose.mjs` smoke (headers, routes, CSRF) also passed against the two-replica stack.

## Zero-downtime rolling update (`scripts/verify-rolling-update.sh`)

Output: [verify-rolling-update.txt](verify-rolling-update.txt). The script keeps signed-in traffic flowing (one request every 50 ms) while `scripts/rolling-update.sh` replaces both replicas.

| Run | Duration | Requests | Non-200 |
| --- | --- | --- | --- |
| Final build (`v2` → `v2-next`) | 29 s | 450 | 0 |
| Earlier runs on the final nginx configuration (`r0` → `r1`, `r2`, `r3`) | 29 s each | 424 / 438 / 457 | 0 / 0 / 0 |

The first attempts had 1–2 nginx-generated 502 responses per update. The causes were Docker DNS listing a replica before it listens, and stale addresses after a replica stops. The resulting fixes are in `web/nginx.conf` and `scripts/rolling-update.sh` (see the devlog):

- a 2 s resolver cache;
- no peer parking (`max_fails=0`);
- unlimited retries within 10 s, with a 1 s connect timeout;
- a one-time replay of GET/HEAD requests after an nginx-generated error;
- waiting one resolver period after the new replicas are healthy, then stopping the old replicas one at a time.

Failover: during continuous traffic, one of two replicas was killed with `docker kill`. All 353 requests (first configuration) and all 261 requests (final configuration) returned 200.

## k6 results

Averages of the measured runs; warm-up runs are excluded. Raw summaries are in [k6/](k6/). p95 is in seconds; the target is 2 s for every operation.

| Scenario | Runs | Checks | Failed requests | p95 all | Login | Search | Reserve |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 50 VUs, 4 shared vCPU, **2 replicas (final build)** | 3 | 200/200 each | 0 | **1.21** | 1.25 | 0.22 | **0.31** |
| 50 VUs, 4 shared vCPU, 2 replicas (before the cookie-name fix) | 3 | 200/200 each | 0 | 1.11 | 1.19 | 0.25 | 0.28 |
| 50 VUs, 4 shared vCPU, 1 replica | 3 | 200/200 each | 0 | 0.96 | 1.04 | 0.13 | 0.14 |
| 50 VUs, 1 vCPU per replica, 1 replica | 2 | 200/200 each | 0 | 4.09 | 4.28 | 0.82 | 0.86 |
| 50 VUs, 1 vCPU per replica, 2 replicas | 2 | 200/200 each | 0 | 2.05 | 2.10 | 0.36 | 0.42 |
| 150 VUs, 1 vCPU per replica, 1 replica | 2 | 600/600 each | 0 | 10.33 | 11.00 | 3.86 | 2.97 |
| 150 VUs, 1 vCPU per replica, 2 replicas | 2 | 600/600 each | 0 | 5.47 | 5.70 | 1.43 | 1.40 |
| 150 VUs, 1 vCPU per replica, 3 replicas | 2 | 600/600 each | 0 | 3.87 | 3.99 | 0.65 | 0.82 |

Reading the results:

- **Proposal target met in the production configuration.** With 50 concurrent users on two replicas, every operation's p95 is below 2 s; reserve p95 is 0.31 s. The earlier 2.26 s reserve p95 was recorded on a laptop with a single local instance. That miss (former AIS-03) is not reproduced here, but it was not tuned away by a code change either: the hardware differs.
- **Scaling works when replicas get their own CPU.** With one vCPU per replica, adding replicas roughly halves the latency of every operation (150 VUs: reserve 2.97 → 1.40 → 0.82 s).
- **On one shared 4-vCPU host, a second replica does not make 50 users faster**: both replicas compete for the same cores. There it adds availability (failover, rolling updates), not throughput.
- **Login is the costliest call** because BCrypt hashing is deliberately CPU-heavy. It is the first operation to exceed 2 s when CPU is scarce, so capacity planning should size CPU for peak sign-in.

## OWASP ZAP baseline (local two-replica stack)

`zaproxy/zap-stable:2.17.0`, `zap-baseline.py -t http://127.0.0.1:8789`, passive and anonymous, like the [2026-10-17 production baseline](../zap-baseline-20261017/README.md). Reports are in [zap/](zap/).

Result: **0 FAIL / 2 WARN / 60 PASS**. The warnings are `CSP: style-src unsafe-inline` [10055], which Radix dialogs need, and the informational `Modern Web Application` [10109].

This scan targets plain HTTP on loopback, so TLS-dependent rules do not apply. It does not replace a production scan. The latest production result remains 0 FAIL / 5 WARN / 62 PASS (2026-10-17, SHA `2993b78`).
