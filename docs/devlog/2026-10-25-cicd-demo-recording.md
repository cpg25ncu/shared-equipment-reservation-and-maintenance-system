# CI/CD demonstration recording

Owner: Liu Tongyao (@cpg25ncu) · Requirement: conversation task to prepare and record the final presentation's CI/CD demonstration; no Issue number · Branch: `demo/liu-tongyao-login-caption-rehearsal` · Baseline: `df9033f0cafd58258bf86594bdc9f7795e9748e2`

## 2026-10-25 Rehearsal release

### What was built

The login page footer now reads "SWE5006 · Team 07 · Shared Equipment Reservation and Maintenance System". The change is small and visible on purpose: the recorded rehearsal follows one change from pull request through the merge gate, the release gate and `production` approval to the live site.

### Design notes

Only frontend source changes. `frontend/package.json`, the lockfile and `app/` are untouched, so the server-side image build reuses its cached dependency and backend layers and the deployment stays short enough to record.

### Verification

Local, before push: `git diff --check` and `node scripts/check-collaboration.mjs`. Hosted CI, merge, release-gate and deployment results are recorded in the pull request.

### Deviations

This lands after the 2026-10-22 code freeze. It is an owner-requested, non-functional text change for the presentation demonstration and changes no behaviour, contract or test.

### Follow-ups

- PR #105 (vulnerable lodash) stays open and unmerged as the failing example for the demonstration.
- A demo-day pull request with a second caption change is merged about 30 minutes before the presentation, as the demonstration script describes.

### Authorship

Written by Claude (Claude Code) at Liu Tongyao's request, including the change, this entry, the merge and the recorded rehearsal. No human review, member test, meeting or effort hours are claimed.

## 2026-10-25 Second rehearsal release (approval recording)

### What was built

The login card subtitle now reads "Sign in with your SERMS account to reserve, borrow and track shared equipment." In the first rehearsal (PR #106, merged as `b2ca024`) the `production` approval was given before recording started, so this second small change repeats the whole path and the approval click is recorded.

### Verification

Local, before push: `git diff --check` and `node scripts/check-collaboration.mjs`. Hosted CI, merge, release-gate and deployment results are recorded in the pull request. The first rehearsal's release gate took 3m 42s and its deployment 2m 52s.

### Authorship

Written by Claude (Claude Code) at Liu Tongyao's request, including the merge and the `production` approval given in the owner's browser on the owner's explicit instruction. No human review, member test, meeting or effort hours are claimed.
