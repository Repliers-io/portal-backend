---
name: di-provider-widening-breaks-test-stubs
description: Recurring failure mode — adding a method to a tsyringe-injected provider breaks hand-rolled `useValue` stubs in tests, invisible to tsc
metadata:
  type: project
---

Adding a method to a provider that is injected by string token (e.g. `@inject("XForwardedFor")`) breaks every test that registers a hand-rolled stub for that token, and **`tsc --noEmit` stays green** because those stubs are `useValue: { ... }` object literals or `as unknown as X` casts. The failure only surfaces at runtime as `TypeError: x.foo is not a function`.

**Why:** Observed concretely on `feat/cache-warmup-repliers-key` (2026-08-25): `XFFProvider.isSsg()` was added and called from the `RepliersBase` constructor; `test/services/listings/restrictedListings.test.ts` registered `useValue: { isEnabled, getHeader }` and started throwing. The shared `DummyXFFProvider` was updated, the inline stub was not.

**How to apply:** When reviewing any change that widens a provider's surface, grep for every `register("<token>"` / `registerInstance("<token>"` site across `src/` and `test/` and check each stub. Recommend replacing ad-hoc inline stubs with the shared dummy provider in `src/providers/` so there is a single place to update. See [[test-suite-baseline]] for why grep-subset verification misses this.
