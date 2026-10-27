# CodeQL findings in the collaboration-docs check

Owner: Liu Tongyao (@cpg25ncu) · Requirement: conversation task to clear the two open code scanning alerts, no Issue number · Branch: `fix/liu-tongyao-codeql-collaboration-script` · Baseline: `392f303f059148a23d27d335d5debb06e7f17cec` (`origin/main`)

## 2026-10-27 Clear code scanning alerts #1 and #2

### What was built

Two small changes to `scripts/check-collaboration.mjs`, the CI-only link and anchor checker run by `collaboration-docs.yml`:

| Alert | CodeQL rule | Line | Change |
| --- | --- | --- | --- |
| #1 (high) | `js/incomplete-multi-character-sanitization` | 8–9 | The HTML-comment `replace(/<!--[\s\S]*?-->/g, '')` becomes `withoutComments()`, a single left-to-right `indexOf` pass with the same result |
| #2 (high) | `js/double-escaping` | 13–14 | `headingSlug()` decodes `&lt;` and `&gt;` first and `&amp;` last, so `&amp;lt;` decodes once |

### Design notes

The script is not a security sanitizer. Its input is the repository's own Markdown, and its output is only compared with link targets; nothing reaches HTML or a browser. The alerts therefore had no exploitable impact. They were fixed rather than dismissed so the repository ends with no open alerts.

For #1, CodeQL's suggested fix is to repeat the replacement until nothing changes. That would differ from how Markdown renderers treat comments (one pass), so the one-pass behaviour is kept, written without a regular-expression replace. For #2, decoding `&amp;` last is the standard order and matches GitHub, which shows `&amp;lt;` as the text `&lt;`.

### Problems and fixes

| Symptom | Root cause | Fix | How it was verified |
| --- | --- | --- | --- |
| Two high CodeQL alerts open on `main` since 2026-10-15 | Comment stripping and entity decoding used patterns CodeQL treats as HTML sanitization | Rewrote both spots as above | Equivalence run below; hosted CodeQL result on the PR |

### Verification

Windows, Node 24.20.0, on this branch:

| Check | Result |
| --- | --- |
| Old vs new `prose()` and heading slugs over all 127 tracked Markdown files (1,091 headings) | Identical output |
| Edge cases: unterminated comment, `<!---->`, adjacent comments, `<!<!-- x -->-- y -->z`, multi-line comment | Identical output |
| `&amp;lt;` in a heading | Slug changes from `a--b` to `a-lt-b`, which matches GitHub |
| `node scripts/check-collaboration.mjs` | Passed: 19 documents, 7 skills |
| `git diff --check` | Passed |

The equivalence run used a temporary script outside the repository. Hosted CI, merge and deployment results are recorded on the pull request.

### Deviations

Lands after the 2026-10-22 code freeze at the owner's request. The changed file is CI tooling and is not part of the application images.

### Follow-ups

None. `scripts/` is not in Deploy's `paths-ignore`, so the merge starts a Deploy run, which the owner approves.

### Authorship

Written by Claude (Claude Code) at Liu Tongyao's request, including the change, the equivalence check, this entry, the PR and the merge. No human review, member test, meeting or effort hours are claimed.
