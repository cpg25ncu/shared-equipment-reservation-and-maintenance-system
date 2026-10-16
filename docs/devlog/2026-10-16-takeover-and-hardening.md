# Takeover of overdue work and response-header hardening (2026-10-16)

Owner: Liu Tongyao (@cpg25ncu) · Related: #27 (plan), #10 (headers part), #25 (ZAP) · Baseline: `main` `871ba3e`

## 2026-10-16 Re-split of overdue and stalled work

### What happened

At 14:41 SGT no member had pushed, commented or updated a PR since Thu 23:04 SGT. #6, #17 and #20 (Zhou Fanhao) and the UC01 part of #9 (Shi Wenqi) were past their D-012 deadlines; #18, #8 and #24 (Zhang Hanming) were delivered but had no ticked acceptance item; the ZAP baseline of #25 (Wang Yuanmeng) was due that evening. On the repository owner's instruction the remaining work moved to Liu Tongyao (D-007 re-split, recorded in the #27 body). At 15:10 SGT the owner moved the cross-verification and parallel parts to Zhang Hanming instead: ticking #18 and #8, the #24 final pass, an independent acceptance of the #9 UC01 items, and member checks of the takeover PRs. Shi Wenqi keeps everything on the server in #10.

Zhou Fanhao's drafts continued on new `feature/liu-tongyao-…` branches cut from the PR heads, so commits and authorship were kept, and the drafts were closed as superseded: #80 → #81 (#17), #79 → #82 (#6), #78 → the #20 PR. As the new #20 (UC03) executor, the owner agreed to the damaged-return defaults `PHYSICAL_DAMAGE` / `HIGH`, which completed and closed #21.

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

Recorded with the PR: the hosted "Release preparation" job runs the production Compose stack with the real nginx image and the new `verify-compose.mjs` assertions. A real-browser check under the CSP and the production headers after the gated deploy are recorded below when they have run.
