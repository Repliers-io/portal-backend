# SSG cache-warmup key

The Next.js frontend's SSG build generates hundreds of pages and hammers this backend's
Repliers endpoints. Before this change, the build used the same Repliers API key and the
same local rate limiter as live traffic, so a build could starve real users of both the
Repliers-side quota and the process-wide throttle.

The build identifies itself via `X-Forwarded-For-Token` matching `XFF_SSG_TOKEN`
(`XFFProvider.isSsg()`). When a request is an SSG request **and**
`REPLIERS_CACHE_WARMUP_API_KEY` is configured, `RepliersBase` now:

- uses `REPLIERS_CACHE_WARMUP_API_KEY` instead of `REPLIERS_API_KEY` — isolating build
  traffic onto a separate Repliers-side quota;
- routes the request through a second, independent `p-throttle` instance
  (`src/providers/throttler/repliersWarmup.ts`, rate-limited by
  `REPLIERS_CACHE_WARMUP_API_LIMIT` / `REPLIERS_CACHE_WARMUP_API_INTERVAL_MS`) instead of
  the shared `throttler:repliers` — isolating build traffic on the local rate limiter too.

Both switches are gated on the same condition (`isSsg() && cache_warmup_api_key`), so
until `REPLIERS_CACHE_WARMUP_API_KEY` is set, an SSG request is indistinguishable from a
normal one — same key, same throttler, no behaviour change at all.

Applied at `RepliersBase`, so every Repliers service (listings, buildings, locations,
agents, etc.) picks both up automatically, and the choice sticks even if a subclass later
calls `switchKey()` (e.g. `EstimateService` overriding `historical_data_key`) — an SSG
request stays on the warmup throttler regardless of which key ends up on the wire, as long
as the warmup key is configured.

## Env vars

See `CLAUDE.md` → Key Environment Variables → Repliers / boards for
`REPLIERS_CACHE_WARMUP_API_KEY`, `REPLIERS_CACHE_WARMUP_API_LIMIT`,
`REPLIERS_CACHE_WARMUP_API_INTERVAL_MS`, `XFF_SSG_TOKEN`.

## Security

`X-Forwarded-For-Token` now selects which upstream Repliers key a request uses, not just
whether XFF forwarding is suppressed. Compared with `crypto.timingSafeEqual` rather than
`===` for that reason. Provision the warmup key with entitlements no broader than the
default key, and treat `XFF_SSG_TOKEN` as a secret — anyone who obtains it can drain the
warmup key's quota.

## Rollout

1. Provision a separate Repliers API key for the SSG/cache-warmup workload (same or
   narrower entitlements than the default key).
2. Set `REPLIERS_CACHE_WARMUP_API_KEY` and a non-empty `XFF_SSG_TOKEN` on the backend.
3. Configure the Next.js SSG build to send `X-Forwarded-For-Token: <XFF_SSG_TOKEN>` on
   every backend request it makes during build.
