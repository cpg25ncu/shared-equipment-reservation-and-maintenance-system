# Takeover of overdue work and response-header hardening (2026-10-16)

Owner: Liu Tongyao (@cpg25ncu) · Related: #27 (plan), #10 (headers part), #25 (ZAP) · Baseline: `main` `871ba3e`

## 2026-10-16 Re-split of overdue and stalled work

### What happened

At 14:41 SGT no member had pushed, commented or updated a PR since Thu 23:04 SGT. #6, #17 and #20 (Zhou Fanhao) and the UC01 part of #9 (Shi Wenqi) were past their D-012 deadlines; #18, #8 and #24 (Zhang Hanming) were delivered but had no ticked acceptance item; the ZAP baseline of #25 (Wang Yuanmeng) was due that evening. On the repository owner's instruction the remaining work moved to Liu Tongyao (D-007 re-split, recorded in the #27 body). At 15:10 SGT the owner moved the cross-verification and parallel parts to Zhang Hanming instead: ticking #18 and #8, the #24 final pass, an independent acceptance of the #9 UC01 items, and member checks of the takeover PRs. Shi Wenqi keeps everything on the server in #10.

Zhou Fanhao's drafts continued on new `feature/liu-tongyao-…` branches cut from the PR heads, so commits and authorship were kept, and the drafts were closed as superseded: #80 → #81 (#17), #79 → #82 (#6), #78 → #84 (#20); the headers are #83. As the new #20 (UC03) executor, the owner agreed to the damaged-return defaults `PHYSICAL_DAMAGE` / `HIGH`, which completed and closed #21.

### Problems and fixes

| Symptom | Root cause | Fix | How it was verified |
| --- | --- | --- | --- |
| #80 had 16 green checks, but its six real-PostgreSQL cases never ran in CI. | Failsafe runs only in profiles, and none included `EquipmentManagementPostgresIT`. | Added to `uc03-postgres-it` in #81. | Both uc03 jobs on #81 log `Tests run: 7` for the class. |
| Category names with `/`, `\`, `%` or `;` could be created but not renamed. | Rename carries the name in the URL path. | Rejected on create and rename in #81. | Against a local backend, `PATCH /api/v1/equipment/plainname` returned 403 (no session), while `Audio%2FVideo`, `Lab%5CKit`, `100%25Kit` and `Kit%3B2` returned 400 before reaching any controller. |
| The #6 restart check never restarted the backend. | `java.exe` on `PATH` is Oracle's `javapath` launcher, which runs the JVM as a child process; stopping the launcher left the JVM running. | Start `JAVA_HOME\bin\java.exe` and require that the health check stops answering (#82). | A leftover `jdk-25.0.4\bin\java.exe` process was visible after the first attempt; none remained after the fix. |
| Merging #81 was refused locally. | The agent's auto mode treats `gh pr merge` as "Merge Without Review". | Merges are left to the repository owner. | - |

## 2026-10-16 Response headers in `web/nginx.conf` (#10, repository part)

### What was built

The `web` container's nginx adds, on React pages and assets: `Content-Security-Policy` (same-origin scripts, connections, forms and base; `object-src 'none'`; `frame-ancestors 'none'`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` and `Strict-Transport-Security: max-age=15552000`. API responses gain only HSTS and `Referrer-Policy`, because Spring Security already sends `nosniff` and `DENY` there. `server_tokens off` hides the container's nginx version. `scripts/verify-compose.mjs` asserts every header, including that the API's `X-Frame-Options` is not duplicated.

### Design notes

- Before: production HTML responses carried none of these headers (`curl -D -` on 2026-10-16 14:40 SGT); API responses had `nosniff` and `DENY` from Spring.
- `style-src` allows `'unsafe-inline'` because Radix dialogs insert `<style>` elements at runtime; scripts stay `'self'` only, and the Vite build has no inline script.
- HSTS lasts 180 days without `includeSubDomains` or `preload`: the parent domain `midas.cyou` is not managed by this project, so only this host is pinned to HTTPS.
- The host nginx on the server still adds `Server: nginx/1.18.0 (Ubuntu)`; `server_tokens off` there stays with Shi Wenqi in #10. nginx passes the upstream headers through, so this change takes effect behind the host proxy without any server change.

### Verification

The hosted "Release preparation" job runs the production Compose stack with the real nginx image and the new `verify-compose.mjs` assertions.

A real-browser check ran the production build under the exact `location /` headers of `web/nginx.conf`: a small Node server served `frontend/dist` with those headers and proxied `/api` to the local demo backend; Playwright Chromium signed in as each of the five roles, opened every page of that role (30 page loads), opened the retirement confirmation on `/manage/equipment` and the display-name dialog on `/admin/users`, opened a reservation page, and listened for `securitypolicyviolation` events.

| Symptom | Root cause | Fix | How it was verified |
| --- | --- | --- | --- |
| 33 violations, one per page load: `script-src eval` from the main bundle. All pages still rendered. | Zod 4 probes `new Function` to decide whether to use its JIT. The throw is caught, but the browser still reports the blocked eval. Zod's own source notes this and offers `jitless`. | `frontend/src/lib/zod-config.ts` sets `z.config({ jitless: true })`; `main.tsx` imports it before anything else, so no schema is created first. A unit test checks the setting. | Rerun: 30 pages, both dialogs and the reservation page, **0 violations**. The only console errors were the expected 401 of `/api/v1/auth/me` before sign-in. |

Inputs: combined head `07e8f83` (`main` `871ba3e` + #84 including #81 + #82 + #83), Windows 11, Node.js 24.20.0, Playwright Chromium, local demo on PostgreSQL 18.6. The production headers after the gated deploy are recorded below once deployed.

## 2026-10-16 #9 UC04 acceptance on the combined head

The same combined head `07e8f83` ran on a fresh local demo (ports 55481 / 8096 / 5196, PostgreSQL 18.6, real Flyway V001-V007, real sessions and CSRF, no mocks):

| Check | Result |
| --- | --- |
| `node scripts/smoke-local.mjs` | Passed, 28 of 28 |
| `node scripts/check-uc01-uc04.mjs` (API: UC01 rules, UC04 protections) | Passed, 24 of 24, including unauthorized assignment and non-technician selection rejected, an unassigned maintainer unable to read or start a case, borrower and admin unable to do technician work, a loan linked to other equipment rejected without writes, a missing linked loan without side effects, and a terminal case refusing work |
| `node scripts/check-uc01-uc04-browser.mjs` (real Chromium, desktop and mobile) | Passed, 10 of 10: search, reserve and cancel; fault report from the catalogue; custodian assignment; technician diagnosis, repair and resolution; equipment available again |

The browser script overwrites the tracked screenshots in `docs/evidence/uc01-uc04/`; they were restored, because the existing evidence still shows the same flows. The UC01 items of #9 are left to Zhang Hanming's independent check, even though this run also covered them.

## 2026-10-16 Merges and release

On the repository owner's instruction the four takeover PRs were merged in dependency order, each after updating its branch with `main` and waiting for all 16 checks on the new head (strict up-to-date protection):

| PR | Issue | Head merged | Merge commit (UTC) |
| --- | --- | --- | --- |
| #81 | #17 | `b4e1017` | `0325f20` (07:36) |
| #84 | #20 | `ee22f89` | `f491874` (07:41) |
| #82 | #6 | `7ea27fa` | `b1c627e` (07:46) |
| #83 | #10 headers | `f216301` | `92cca31` (07:50) |

`git diff 07e8f83 92cca31` lists only this devlog file, so the combined-head runs recorded above (smoke, UC01/UC04 API and browser, CSP) cover exactly the code now on `main`.

### Problems and fixes

| Symptom | Root cause | Fix | How it was verified |
| --- | --- | --- | --- |
| No workflow ran for `92cca31`: no CI, no Deploy, 0 runs for the SHA after 14 minutes, while the three earlier merges triggered normally. GitHub's status page reported all systems operational. | The push event of that merge did not start Actions; the cause is not visible from the repository. Only `deploy.yml` has `workflow_dispatch`, so the checks on that SHA could not be started by hand, and the release gate needs all twelve on the released SHA. | This documentation-only PR. Its merge is a new push to `main`, which runs every check workflow (none filters by path); `deploy.yml` ignores documentation-only pushes, so the release is then started with `workflow_dispatch` on `main` and still passes the release gate and the owner's approval. | Hosted checks on the new `main` SHA, then the gated deploy run (recorded with the ZAP baseline). |
| Three Deploy runs queued: `0325f20` waiting for approval, `f491874` cancelled, `b1c627e` pending. | `deploy-production` concurrency keeps one run in progress and only the newest pending one. | The owner rejects the earlier waiting runs and approves only the run that releases the final `main`. | Recorded with the deployed headers. |

### Release of `eedd8c7`

- #85 merged as `eedd8c7`; its push ran all eleven check workflows, and the twelve checks required by `scripts/verify-release.mjs` succeeded on that SHA. As expected, no Deploy run started for the documentation-only push.
- Deploy was started with `workflow_dispatch` on `main` (run 38872254823). It queued behind run 38868326819 (`0325f20`, #81 alone), which was still waiting for approval.
- The owner reported rejecting 38868326819 and approving 38872254823, but the API showed no review on either run: the new run had not yet reached its environment step, so there was nothing to approve. At the owner's stated instruction, the agent rejected 38868326819 through the API. 38872254823 then passed `release-gate` ("Verified current main eedd8c7…: 12 successful GitHub Actions checks"). The owner approved it in GitHub, and the log ends with "Released eedd8c7…" (about 2026-10-17 00:06 SGT).
- Lesson: the approval button appears only after `release-gate` finishes. A run that is still queued behind another one cannot be approved.

## 2026-10-17 Production headers and OWASP ZAP baseline (#10, #25)

### Deployed headers

`curl -D -` against https://serms.midas.cyou at 00:12 SGT:

- `/` and `/manage/equipment`: the exact CSP of `web/nginx.conf`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=15552000`.
- `/api/v1/health`: one each of Spring's `nosniff` and `DENY`, plus HSTS and `Referrer-Policy`.
- `Server: nginx/1.18.0 (Ubuntu)` still comes from the host nginx. That stays with Shi Wenqi in #10.

### ZAP baseline

`zaproxy/zap-stable:2.17.0` (digest `sha256:5ccfff9a411743ab2615136a2edd7416bec9ce41572fa94e935df38c14adb2b6`), pulled with the owner's permission. Ran locally with Docker on 2026-10-17 00:19-00:20 SGT:

```text
docker run --rm -v <scratch>:/zap/wrk:rw zaproxy/zap-stable:2.17.0 zap-baseline.py -t https://serms.midas.cyou -r zap-baseline.html -J zap-baseline.json -w zap-baseline.md -I
```

The generated plan (`zap.yaml`) contains only passiveScan-config, a one-minute spider, passiveScan-wait and reports. **No active scan was run** (#25 forbids one against production without the owner). Result: **0 FAIL, 7 WARN, 60 PASS** over 6 URLs. The reports are in `docs/evidence/zap-baseline-20261016/`.

Header rules that pass because of #83: Strict-Transport-Security [10035], Anti-clickjacking [10020], X-Content-Type-Options [10021], CSP Header Not Set [10038]. Cookie Secure / HttpOnly / SameSite [10011, 10010, 10054], Absence of Anti-CSRF Tokens [10202] and Vulnerable JS Library [10003] also pass.

| Alert | Risk (confidence) | Disposition |
| --- | --- | --- |
| CSP: style-src unsafe-inline [10055] | Medium (High) | Accepted for the presentation: Radix dialogs insert `<style>` at runtime; scripts remain `'self'` only. Removing it would need nonces or hashes and a style audit. |
| Cross-Origin-Embedder/Opener/Resource-Policy missing [90004] | Low (Medium) | Deferred: the app uses no cross-origin isolation features and loads only same-origin resources. `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Resource-Policy: same-origin` are low-risk candidates for a later hardening PR. |
| Permissions Policy Header Not Set [10063] | Low (Medium) | Deferred, same follow-up (for example `camera=(), microphone=(), geolocation=()`). |
| Server leaks version via `Server` [10036] | Low (High) | Host nginx `server_tokens off` — Shi Wenqi (#10); the container's nginx already sends none. |
| Modern Web Application [10109] | Informational | No action: an SPA as designed. |
| Re-examine Cache-control Directives [10015], Storable and Cacheable Content [10049] | Informational | No action for hashed assets. `index.html` could get `Cache-Control: no-cache` in the same later PR. |

**Coverage limits:** the scan was unauthenticated. The spider reaches only `/`, `robots.txt`, `sitemap.xml` and the two hashed assets, because the React routes are client-side and every API needs a session. No authenticated or active testing was done; local real-browser checks with every role cover those pages functionally.
