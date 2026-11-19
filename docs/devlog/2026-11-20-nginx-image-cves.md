# Web Image Blocked by nginx CVEs (2026-11-20)

Owner: Liu Tongyao (@cpg25ncu) · Requirement: release gate (`scripts/verify-release.mjs`, `release-images`) · Branch: `fix/liu-tongyao-nginx-cves` · Baseline: main `f09a792`

Related: [2026-10-20 libexpat CVE](2026-10-20-image-cve-libexpat.md), the same kind of failure in the `app` image.

## 2026-11-20 nginx 1.30.6 in the web image

### What happened

PR #121 (README tagline, Markdown only) passed 15 of 16 checks. `Release preparation / release-images` failed at the Trivy scan of `serms-web:ci` (run 44609785600, 2026-11-19 20:35 UTC):

| Package | Installed | Fixed | Findings |
| --- | --- | --- | --- |
| `nginx` | `1.30.6-r1` | `1.30.7-r0` | CVE-2026-113425, CVE-2026-121810, CVE-2026-123007, CVE-2026-123633 (CRITICAL); CVE-2026-118899, CVE-2026-123634 (HIGH) |

The `app` image passed. `main` `f09a792` passed the same job on 2026-11-04, before nginx 1.30.7. Because `release-images` is one of the 15 merge and release checks, no PR can merge and no commit can be released until the web image changes.

### Root cause

- The web stage was built `FROM nginxinc/nginx-unprivileged:stable-alpine`. On Docker Hub its tags were last updated on 2026-10-19 (nginx 1.30.6).
- The official `nginx:stable-alpine` moved to 1.30.7 on 2026-11-18. Its amd64 image config reads `NGINX_VERSION=1.30.7`, `PKG_RELEASE=1`; `nginx:1.30.7-alpine` resolves to the same amd64 manifest.
- The 2026-10-20 `apk upgrade --no-cache` cannot help. nginx in these images comes from nginx.org's package repository, which is not configured in the final image; `apk upgrade` only sees Alpine's repositories.

### Fix

The web stage now starts `FROM nginx:stable-alpine` and applies the same unprivileged changes that `nginx-unprivileged` makes:

- removes the `user` directive from `/etc/nginx/nginx.conf`;
- moves the pid file to `/tmp/nginx.pid`;
- gives the `nginx` user (uid 101, as before) ownership of `/var/cache/nginx`, where the temporary files live.

The build fails if either `nginx.conf` edit does not apply. `USER nginx`, port 8080, the configuration, the static files and the health check are unchanged. The `apk upgrade` stays for Alpine packages.

Options offered to the owner:

| Option | Outcome |
| --- | --- |
| Separate fix PR switching to the official image (chosen) | Unblocks merges and releases now; #121 keeps its own change |
| Wait for `nginx-unprivileged` to rebuild | No code change, but no merge or release for an unknown time, and production keeps the vulnerable nginx |

Ignoring the CVEs (`.trivyignore`) was not offered: repository rules forbid skipping or weakening failing checks.

### Problems and fixes

| Symptom | Root cause | Fix | How it was verified |
| --- | --- | --- | --- |
| `release-images` red on a Markdown-only PR | `nginx-unprivileged` had not been rebuilt for nginx 1.30.7; `apk upgrade` cannot reach nginx.org packages | Official `nginx:stable-alpine`, reconfigured to run as `nginx` | This PR's `release-images` job: both Trivy scans, then the production-profile Compose smoke with two replicas, cluster, data-tier and rolling-update checks |

### Verification

Not built locally: the base images are not in the local Docker cache, and pulling them was not part of the owner's request. The CI job `release-images` on this PR is the check; its result is recorded on the PR.

### Follow-ups

- After this merges, update #121 with `main` so its `release-images` check runs on the new web stage.
- The fix reaches production only through the gated `Deploy` run that this merge starts; the owner approves it.
- The 2026-10-20 follow-up still stands: pinning base images by digest with scheduled updates would make such changes explicit.

### Authorship

Agent-written (Claude Code) on the owner's instruction; the owner chose the separate-PR option.
