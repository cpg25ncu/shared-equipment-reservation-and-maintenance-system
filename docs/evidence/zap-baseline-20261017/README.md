# Second passive ZAP baseline — 2026-10-17

Target: https://serms.midas.cyou. Deployed SHA: `2993b78eef24c15a96a1ba77536488c5eb0bc4e8`. Owner-authorized production baseline; agent-executed. Report generated at 15:00:08 SGT (07:00:08 UTC).

Docker 29.8.2; existing image `zaproxy/zap-stable:2.17.0`, image ID `sha256:5ccfff9a411743ab2615136a2edd7416bec9ce41572fa94e935df38c14adb2b6`. No other image was pulled, and no unrelated container was stopped or pruned. Docker Desktop was started because its local engine was not running.

Command from the primary checkout (the scratch directory is git-ignored):

```powershell
docker run --rm --pull never -v 'D:/ChatGPT/SWE5006_Group_Project/.cache/prod-acceptance/zap-20261017:/zap/wrk:rw' zaproxy/zap-stable:2.17.0 zap-baseline.py -t https://serms.midas.cyou -r zap-baseline.html -J zap-baseline.json -w zap-baseline.md -I
```

Exit 0 with `-I`; **0 FAIL / 5 WARN / 62 PASS**, six URLs found. `-I` makes warnings non-fatal; it does not mean that there are no warnings. No active scan or authenticated session was used. Standard spider discovery of this SPA does not cover the signed-in role/API surface.

The [development log comparison](../../devlog/issue-10-server-release.md#second-passive-zap-baseline) compares the [previous baseline](../zap-baseline-20261016/zap-baseline.json) with the [current JSON](zap-baseline.json). COOP, CORP, Permissions-Policy and Server-version alert references disappeared. COEP remains under the shared 90004 rule. Five warning rule families correspond to six individual alert references because 10049 has two informational variants.

Reports: [HTML](zap-baseline.html), [JSON](zap-baseline.json), [Markdown](zap-baseline.md). These are reviewed anonymous reports; browser credentials, cookies and traces were not exported.
