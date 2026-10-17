# Second passive ZAP baseline — 2026-10-17

Agent-executed under Liu Tongyao's direct authorization, against https://serms.midas.cyou at deployed `2993b78eef24c15a96a1ba77536488c5eb0bc4e8`. ZAP 2.17.0 report generated 15:00:08 SGT. Existing image ID: `sha256:5ccfff9a411743ab2615136a2edd7416bec9ce41572fa94e935df38c14adb2b6`.

```powershell
docker run --rm --pull never -v 'D:/ChatGPT/SWE5006_Group_Project/.cache/prod-acceptance/zap-20261017:/zap/wrk:rw' zaproxy/zap-stable:2.17.0 zap-baseline.py -t https://serms.midas.cyou -r zap-baseline.html -J zap-baseline.json -w zap-baseline.md -I
```

Exit 0 with -I: **0 FAIL / 5 WARN / 62 PASS**, six URLs found; anonymous passive baseline only, no active scan or authenticated coverage. -I makes warnings non-fatal. No other image was pulled; no unrelated container was stopped or pruned. Docker Desktop was started because its local engine was stopped.

Compared with [the previous baseline](../zap-baseline-20261016/zap-baseline.json), alert references 10063-1 (Permissions-Policy), 90004-3 (COOP), 90004-1 (CORP), and 10036-2 (server version) are absent. COEP remains under 90004. Other remaining families are CSP style-src unsafe-inline, cache directives/storage behavior and the informational modern-web-application alert. The six current alert references include two informational variants of 10049.

Reports: [HTML](zap-baseline.html), [JSON](zap-baseline.json), [Markdown](zap-baseline.md).
