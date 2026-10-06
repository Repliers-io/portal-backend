---
name: review-tooling-gaps
description: Verification gaps when reviewing portal-backend — ESLint CLI does not run, tsc skips test/, payload/Boss types lie about nullability
metadata:
  type: project
---

Observed 2026-10-01 while reviewing the null-safety pass (branch fix/crashes-on-nulls):

- `npx eslint` fails: eslint 10.9.1 is installed but the repo only has `.eslintrc.json` + `.eslintignore` (flat config required since v9). Lint can't be used to verify "no ESLint warnings"; say so instead of claiming lint is clean.
- `tsconfig.json` `include: ["src"]` — `npx tsc --noEmit -p .` does NOT type-check `test/`. Tests only get type-checked via the mocha/ts loader at run time.
- tsconfig extends `@tsconfig/strictest` (so `noUncheckedIndexedAccess` is on).
- Several Boss/Repliers types still declare fields non-null (`BossPeopleSingle.tags/emails/phones`, `getUsers().users`, `getPeople().people`, `RplArea.name`, `RplEstimateSingle.payload`) while code guards them with `?.`/`??`. tsc won't flag either the redundant guard or a missing one, so check call sites by grep, not by compiler.

**How to apply:** In reviews, run tsc for src, run the targeted mocha suites for tests, and grep for dereferences on fields whose types haven't been widened. Related: [[test-suite-baseline]].
