# Notification dates under a non-English server locale

Owner: Liu Tongyao (@cpg25ncu) · Related: UC05 notifications (#19, owner Wang Yuanmeng), found during #26 · Branch: `fix/liu-tongyao-notification-locale` · Baseline: main `45e4e1a`

## 2026-10-17 English month names whatever the JVM locale

### What was built

Notification texts that carry a time, such as "Your loan of Professional tripod is due at 17 Oct 2026, 02:59 SGT.", now always use English month names. `NotificationText` formats with an explicit `Locale.ENGLISH`; nothing else changed. Stored notifications keep the text they were created with.

### Design notes

- `DateTimeFormatter.ofPattern(pattern)` takes its language from the JVM's default format locale. Production runs in a Linux container that is probably English, but the local demo on a Windows machine set to Chinese wrote "17 10月 2026", which shows in the inbox during a demonstration.
- The formatter is now built per instance instead of as a `static final` constant. A static constant is created when the class is first loaded, by whichever test or bean loads it first, so a unit test could not reliably prove that the locale is fixed. With an instance field, the test sets a Chinese, German or US default locale, creates the object and checks the text.
- No other server code formats dates or numbers into text: `formatted(...)` calls only build SQL, and case changes already use `Locale.ROOT`.

### Problems and fixes

| Symptom | Root cause | Fix | How it was verified |
| --- | --- | --- | --- |
| Inbox text "due at 17 10月 2026, 02:59 SGT" on the local demo | Formatter built without a locale on a JVM whose default format locale is Chinese | `Locale.ENGLISH` on the formatter | `NotificationTextTest` fails on the old code ("17 10月 2026") and passes now |
| `initdb` rejected its password-file argument | PowerShell passed `--pwfile=(Join-Path …)` through literally | Built the argument as a string first | Cluster started on 127.0.0.1:55447 |
| The PowerShell call that started PostgreSQL never returned | `Start-Process -Wait` also waits for the server process that `pg_ctl` leaves running | Stopped the waiting shell; the server kept running | `createdb` and the tests connected |

### Verification

On Windows 11 with Java 25 (release 17 target) and PostgreSQL 18.6, on this branch's change against main `45e4e1a`:

- `./mvnw -B test -Dtest=NotificationTextTest`: failed on the old `NotificationText` ("17 10月 2026"), passed with the fix.
- `./mvnw -B test`: 686 tests, 0 failures, 0 errors, 0 skipped. The database-backed unit tests used `SERMS_APP_TEST_JDBC_URL` on a throwaway cluster.
- `./mvnw -B -Puc03-postgres-it -Dit.test=Uc05PostgresIT test-compile failsafe:integration-test failsafe:verify`: 10 of 10, real PostgreSQL through `SERMS_UC05_TEST_JDBC_URL`.

The throwaway cluster lived in the ignored `.cache/test-pg/` of this checkout (local binaries, no Docker) and was stopped afterwards. CI runs the same suites with its own containers; remote results are on the pull request. Not run here: a live notification through the local demo.

### Deviations

None.

### Follow-ups

Notifications already stored with a Chinese month keep their text; only new ones change. Production is affected only if its JVM ran with a non-English locale, which was not checked here.

### Authorship

Implementation, test and this entry were produced by an AI agent (Claude Code) under Liu Tongyao's instruction. No teammate review is claimed.
