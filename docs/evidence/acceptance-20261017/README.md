# Acceptance evidence — 2026-10-17

Agent-prepared under Liu Tongyao's authorization. Refs #24. Refs #18. Refs #8. Refs #9.
No human approval, production transaction or team Done is claimed.

[Development log](../../devlog/2026-10-17-acceptance-closeout.md) contains task boundaries,
commands, exact input versions, failed attempts, repairs, Issue dispositions and missing acceptance.
[verification.json](verification.json) retains safe observations, source fingerprints and PNG hashes.
[ci-pr90.json](ci-pr90.json) records hosted checks on the successor's exact delivered head.

All screenshots show synthetic local demo data, after password fields were cleared. Raw traces,
credentials, cookies, runtime JARs and databases remain ignored and private. Screenshots support
the actual API/PostgreSQL tests; they do not independently prove transaction or authorization rules.

- [Actual independent approval](desktop-approved.png)
- [Mobile linked repair completion](mobile-resolved.png)
- [ADMIN has no implicit approval permission](mobile-admin-no-implicit-approval.png)
- [Mobile retired-equipment history](mobile-equipment-retired.png)
- [Mobile administrator audit viewer](mobile-audit.png)

Local tests, hosted CI, agent review, human member acceptance, merge, deployment and team Done
remain separate. No production fixture runner was used. Reproduce the live runs only on the
explicit six-account isolated demo, in the order recorded in the log. Run mocked E2E separately
from a live Vite server in the same checkout; stop only resources owned by the test session.
