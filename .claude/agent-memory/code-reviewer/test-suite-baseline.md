---
name: test-suite-baseline
description: Suite health baseline (green on dev as of 2026-09-04), the resolved stats-mock UTC flake, and why an unmatched nock now surfaces as a bogus 500
metadata:
  type: project
---

**Baseline as of 2026-09-04:** the full suite is green (525 passing, ~11s) on `dev` + `fix/xff-missing`. Any red run should be treated as caused by the change under review, not waved off as pre-existing. Verify with a full run, not `--grep` — mocha's grep is case-sensitive and matches the full title chain, so `Listings` silently skips suites titled `Restricted listings...`. For any change to a shared base class or a DI-injected provider, insist on a full-suite run.

**Resolved flake (kept for pattern recognition):** `Stats > Neighborghood rankings` used to fail ~4-5h/day on non-UTC machines because `src/services/stats.ts` computes ranges with `dayjs().utc()` while `test/mocks/repliers/stats.ts` built its nock query matchers in local time. Fixed by making the mock consistently `dayjs.utc(...)`; landed on `dev` in `58c1f41`. Lesson: a date-sensitive failure that looks like a stable pre-existing break may be time-of-day flaky.

**Diagnosing nock misses:** `test/hooks.ts` calls `nock.disableNetConnect()`, so an unmatched request throws instead of hitting the wire. `RepliersBase.request` (`src/services/repliers/base.ts`) catches everything and rethrows `new ApiError(..., e.response?.status)`; a `NetConnectNotAllowedError` has no `.response`, so the status is `undefined` and `ApiError` defaults to **500 with no body**. So: *a 500 from a Repliers-touching test almost always means "no nock interceptor matched"* (wrong method, path, query, or a `matchHeader` predicate that returned false) — not a real server error. Turn on `DEBUG=nock.*` or add a `nock.emitter.on("no match", …)` listener to see the actual request.

**`nock.cleanAll()` is global.** Several suites call it in `after`/`afterEach` (`test/services/autosuggest.test.ts`, `test/services/repliers/base.test.ts`, `test/services/listings/restrictedListings.test.ts`). It wipes `.persist()`ed interceptors registered by *other* files — notably the Google OpenID discovery mock in `test/mocks/services/oauth/google.ts`. Safe today only because mocha's alphabetical file order puts `test/routes/oauth.test.ts` before all of them and `oauth.google` is `instanceCachingFactory`-cached process-wide. Flag any new `cleanAll()` or any new persisted global mock.
