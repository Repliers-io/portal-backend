# Memory Index

## Project
- [Test suite baseline](test-suite-baseline.md) — suite green on dev (2026-09-04); why an unmatched nock shows up as a bogus 500; `nock.cleanAll()` is global; `--grep` subsets hide regressions.
- [DI provider widening breaks test stubs](di-provider-widening-breaks-test-stubs.md) — adding a method to a token-injected provider breaks inline `useValue` stubs; tsc stays green.
- [Review tooling gaps](review-tooling-gaps.md) — eslint CLI broken (v10 vs .eslintrc), tsc skips test/, several types still claim non-null.
- [Boss undefined-filter hazard](boss-undefined-filter-hazard.md) — axios drops undefined GET params, so getPeople({email: undefined}) lists everyone; people[0] is random.
