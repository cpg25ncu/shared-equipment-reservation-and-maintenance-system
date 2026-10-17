# Deployed acceptance — 2026-10-17 (in progress)

Owner: Liu Tongyao (@cpg25ncu); agent-prepared and executed under his instruction. Refs #10.

Deployed SHA and main baseline: `2993b78eef24c15a96a1ba77536488c5eb0bc4e8`. [Deploy attempt 2](https://github.com/cpg25ncu/shared-equipment-reservation-and-maintenance-system/actions/runs/39010686818/attempts/2) logged the matching Released SHA. Real browser acceptance began 15:02 SGT.

UC01, UC02 and UC04 passed. Damaged checkout/return, users/roles, Reports, decision notices and mark-as-read passed. GOOD return, real overdue reminder/projection, final retirement and final audit checks are **not run yet**. The camera reservation is 15:07-15:37 SGT; actual checkout is scheduled for 15:27, followed by overdue checks after 15:39. No fake clock or database edits.

No account was deactivated. Generated passwords remain only in the ignored local accounts file and process memory; administrator credentials remain in the owner's terminal/child-process environment. No traces, cookie values or storage-state files were exported.

- [01-five-single-role-accounts.png](01-five-single-role-accounts.png)
- [02-two-equipment-fixtures.png](02-two-equipment-fixtures.png)
- [07-overlap-409.png](07-overlap-409.png)
- [15-damaged-return-open-case.png](15-damaged-return-open-case.png)
- [18-maintenance-resolved-history.png](18-maintenance-resolved-history.png)
- [19-equipment-available-after-repair.png](19-equipment-available-after-repair.png)

This is an interim evidence commit, not complete acceptance or a member sign-off. The final results will replace this entry before delivery.
