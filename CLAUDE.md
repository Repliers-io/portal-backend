# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Repliers Portal Backend — a real estate API backend using TypeScript, Koa, and PostgreSQL. Integrates with Repliers API for MLS listings data, Mapbox/Google for geocoding, and Follow Up Boss for CRM.

## Commands

```bash
# Development
npm run dev                        # Start server + worker
npm run dev:server                 # Server only
npm run dev:[project]              # Run with a project's .env.<project> config

# Testing
npm run test:localhost             # Tests with local DB on port 5555
npm run test:localhost:watch       # Watch mode
npm run test:localhost:watch:grep "pattern"  # Run specific tests (watch mode)

# Run specific tests (single run) — npm run test:localhost -- --grep doesn't forward
# through nested npm calls, so use the direct command:
npx cross-env DB_PORT=5555 NODE_ENV=testing DOT_ENV_CONFIG=test.env npx mocha --grep "pattern"

# Database
npm run db:migrate                 # Run migrations
npm run db:migrate:test            # Migrations for test DB (port 5555)

# Debug
DEBUG=repliers:* npm run dev       # Enable debug logging
```

## Multi-Project / Tenant Model

A **project** is a deployment configuration preset: `src/settings/defaults.ts`, or one file per deployment in `src/settings/instances/` (list the folder for the current set). Each preset maps to a real estate market/MLS board and is selected via the `APP_SETTINGS_PRESET` env var at startup. Settings are **immutable at runtime** — they cannot be changed per-request. At startup the preset is merged over the env-built config (`_.mergeWith` in `src/lib/settings.ts`), so a value set in the preset beats its env var; presets do not stack on `defaults`.

Each preset configures: boardId(s) to query, proximity search center (lat/long/radius), Mapbox country/region filtering, allowed location areas, Follow Up Boss enabled/disabled, scrubbing rules, and cache TTLs.

**"Switching boards"** means deploying with a different `APP_SETTINGS_PRESET` — there is no runtime board-switching endpoint.

**Adding new config values:** Every value in `AppConfig` (defined in `src/config.ts`) must have a corresponding environment variable with a sensible default. Settings presets in `src/settings/instances/` can override these defaults, but the env var must always exist as the baseline. For complex types (arrays of objects), parse from a JSON string env var (e.g., `JSON.parse(process.env["MY_VAR"]) as MyType[]`). Never add a config value that can only be set via a preset.

## Code Style & Naming Conventions

### General

- **Minimal code** — write the smallest thing that does the job. No boilerplate, no speculative abstraction, no exported types that exist only to name a parameter, no ceremonial JSDoc. Comment only what the code cannot say itself (a non-obvious "why"). Cover the real cases in tests, not every permutation.
- **camelCase everywhere** — including constants; no SCREAMING_CASE.
- **Imports** are sorted by ESLint plugin automatically — do not reorder manually.
- **ESLint warnings** must not appear in committed code — fix immediately, never suppress.
- **Dead code** — unused imports, variables, props, and files must be deleted immediately as part of every task. Never ask for confirmation. Never leave anything "just in case".
- **Validation during implementation** — check TypeScript compile errors only. Ignore ESLint/Prettier formatting errors while working: they are fixed automatically on save/commit and must not block implementation progress.
- **Validation** — Joi, no Zod/Yup.
- **Boy Scout Rule** — leave every file you touch cleaner than you found it. Fix naming, split oversized components, remove dead code — within the file being changed, not across adjacent code.
- **Claude settings** — write all new/updated Claude Code settings (permissions, hooks, env) ONLY to `.claude/settings.local.json`, which is gitignored. Never create or edit the shared `.claude/settings.json`.
- **No confabulation** — never present an assumption as a verified fact. If you haven't checked (read a file, run a search, fetched data), you don't know. Say "I don't know which tenant …" and ask — don't guess and assert. This applies especially to: which tenant to use, which features a tenant has, what data exists in API/CRM, and any runtime behaviour you haven't verified.

### Naming

Follow **Intention-Revealing Names** (Clean Code, Robert Martin): names should answer _"what is this for?"_, not _"what type/state is this?"_.

Avoid `is`/`has`/`can` prefixes when a more expressive name exists: prefer `loading` over `isLoading`, `authenticated` over `isAuthenticated` — unless the prefix genuinely aids clarity.

**Keep names compact.** Drop modifiers that add no information given the context. If there is only one logo in scope, it is just `logo` — not `activeMobileLogo` or `currentLogo`. If a boolean describes the only relevant state, call it `homePage` not `isCurrentlyOnHomePage`. Shorter names that still answer _"what is this for?"_ are always preferred.

**Question name drift near external data.** When working with API responses, field names often transform across layers: `lon` → `lng` → `longitude`. The goal is uniformity — align internal names to match the API field names, not the other way around.


### File & Folder Naming
- Folders: **lowercase** (`routes/`, `services/`, `lib/`, `repository/`)
- Most files: **lowercase** (`listings.ts`, `contact.ts`, `auth.ts`)
- Exception: selector classes use **PascalCase matching the class name** (`selectViewPropertyParams.ts`)
- Test files: `[subject].test.ts` suffix

### Colocation — put code where its feature already lives
- **A feature's code belongs in that feature's folder.** Before creating a new file for a helper, look for an existing folder/module that already owns the concern and put it there — do not scatter feature logic across `src/services/` when a dedicated subfolder exists. Example: cluster-scrubbing helpers belong in `src/services/scrubber/`, next to `ListingsScrubber`, **not** in a loose `src/services/listingClusters.ts`.
- **Extract to a new sibling file only when the module grows unwieldy** — and keep that file inside the feature's own folder (`scrubber/clusters.ts`), never one level up.
- **Mirror the source path in tests.** A test for `src/services/scrubber/x.ts` goes in `test/services/scrubber/x.test.ts` — same subfolder depth.
- Prefer a **method on the owning class** or a function in the owning module over a free-floating helper in a general folder. Method vs. function is a judgment call; **location is not** — it must sit with the feature it serves.
- When a helper must be reached from its own module without a circular import, use `import type` for the type-only direction rather than relocating the helper somewhere generic.

### Classes / Interfaces / Types
- Classes: **PascalCase** with descriptive suffix — `ListingsService`, `AclRepository`, `ListingsScrubber`
- Interfaces: **PascalCase, no `I`-prefix** — `AppConfig`, `AuthResponseDto`, `RplClientsClient`
- Use `interface` for object shapes; use `type` for unions, picks, and aliases
  ```ts
  export interface AuthResponseDto { ... }        // object shape → interface
  export type ApiMethod = "POST" | "GET" | ...;   // union → type
  export type UserProfile = Pick<RplClientsClient, "email" | ...>;  // alias → type
  ```
- Enums: **PascalCase** — `UserRole`, `OAuthProviders`, `ContactScheduleMethod`

### Functions & Methods
- **camelCase**, verb-first: `generateToken`, `getUserAcl`, `contactUs`, `normalizePhoneNumber`
- Common verbs: `get`, `find`, `create`, `update`, `delete`, `search`, `count`, `send`, `resolve`, `install`

### Variables & Constants
- **camelCase** for all variables and exported constants — `userProfilKeys`, `contactContactusSchema`
- No SCREAMING_SNAKE_CASE (exception: pre-existing `RplDateFormatter` in types/repliers.ts)

### Imports
- External packages first, then internal relative imports
- All relative imports use **`.ts` extension** — `import foo from "./foo.ts"`
- Existing code in the project still uses `.js` extensions (legacy, not yet migrated — do not follow this pattern for new code)
- Use `import type` for type-only imports: `import type { Middleware } from "koa-jwt"`

### Exports
- Service classes and routers: **default export** — `export default class ListingsService`
- Types, interfaces, enums, utilities: **named export** — `export interface`, `export type`, `export function`

### Async / Promises
- **async/await exclusively** — no `.then()` chains in route handlers or service methods
- Fire-and-forget patterns (e.g. events collection) may use `.then()` internally
- Declare explicit `Promise<T>` return types on public service methods

### Error Handling
- Throw `ApiError` from `src/lib/errors.ts` — never raw `Error`
- Use `ctx.throw(new ApiError(message, status))` in route handlers
- Do not wrap in try/catch inside routes — the global error middleware in `app.ts` catches all errors
- Pass context metadata via the third `opts` argument on `ApiError`

### Decorators (tsyringe + custom)
Order for injectable service classes:
```ts
@injectable()
export default class MyService {
  constructor(
    @inject("config") private config: AppConfig,  // named tokens use @inject
    private repliers: RepliersService,             // auto-resolved omit @inject
  ) {}

  @cached("namespace", ttl_ms)                    // method decorator before method
  async myMethod(): Promise<T> { ... }
}
```
- Always use `@injectable()` on services and repositories
- Use `@inject("token")` for named tokens (`"config"`, `"logger"`, `"db"`)
- Auto-resolved services (other classes) need no `@inject`
- **Transient scope:** Services resolved via `ctx.state.container.resolve()` are **new instances per request** (child container per request in `src/lib/middleware/container.ts`). Do not put one-time startup logic (config validation, warnings, diagnostics) in service constructors — it will run on every request. Place startup validation in the config/settings layer (`src/lib/settings.ts`, `src/config.ts`) or in providers (`src/providers/`).

### Route Patterns
- One Router per feature file (`new Router({ prefix: "/feature" })`)
- Validate request body with joi schema before calling service
- Resolve services per-request: `ctx.state.container.resolve(MyService)`
- Pass validated DTO directly to service methods — never raw `ctx.request.body`
- Use `router.param()` for path parameter validation
- Set `ctx.state['enable.xff'] = true` in all user-facing API routes. Omit only for SSG-only routes that are never called directly by end users.

### Validation (joi)
- Define schemas with `joi.object(...)` in `src/validate/[feature].ts`
- Export schema as named `const` and DTO as named `interface` or `type`
- Schema names follow pattern: `[feature][Action]Schema` — `contactContactusSchema`, `authLoginSchema`
- DTO names follow pattern: `[Feature][Action]Dto` — `ContactContactUsDto`, `AuthLoginDto`

### Tests
- Mocha + `assert` (Node.js built-in) — no Jest or Chai
- BDD style: `describe` / `it` blocks
- Fixtures as plain `const` objects in test file scope
- Mocks in `test/mocks/[service]/[feature].ts`
- Setup via `before` / `beforeEach` hooks
- **Always write tests alongside new code** — when existing test patterns exist (e.g. sibling `.test.ts` files), write corresponding tests as part of the implementation, not as a separate step
- **`@cached` methods in tests:** The in-memory Keyv cache persists across tests within a `describe` block. Two tests calling the same cached method with the same arguments will share the cached result — the second test hits the cache instead of the nock mock. To avoid this, use **distinct argument values per test** (e.g., different slugs, different IDs) so each test gets its own cache entry. Do not rely on nock mock setup alone to produce different responses for the same cached key.

## Key Architectural Patterns

**Dependency Injection (TSyringe):** Services use `@injectable()` + constructor injection. Container registered in `src/providers/index.ts`.

**Caching:** Use `@cached()` decorator from `src/lib/decorators/cached.ts`. Note: decorated methods return `Promise<T | Cached<T>>` in types but always return `Cached<T>` at runtime — a TypeScript decorator limitation. Backed by Redis/Keyv.

**Error Handling:** Throw `ApiError` from `src/lib/errors.ts`.

**Entry points:** `src/index.ts` (HTTP server), `src/worker.ts` (NATS consumer — runs as a separate process).

## Authentication

- **Algorithm:** RS256; key paths from `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` env vars
- **JWT payload:** `{ email, sub (= clientId as string), role?, jti?, iat, exp, iss }`
- **Roles:** `Admin`, `Agent`, `User` (defined in `src/constants.ts`); inferred from DB ACL on login
- **Flow:** Email/phone login → OTP via Repliers Messages API → redeem OTP → JWT issued
- **Middleware:** `middleware.jwt` (strict) or `middleware.jwt.passthrough` (guest-allowed) — payload lands in `ctx.state["user"]`

## MLS Data Scrubbing

The `@scrubbed("listings")` decorator on `ListingsService` methods automatically scrubs listing data based on MLS permission fields and user auth status. **Cannot be disabled per-request.**

**Permission fields on each listing (from Repliers API):**

- `displayPublic` — allowed on public internet
- `displayAddressOnInternet` — address visible online
- `displayInternetEntireListing` — show full vs. summary
- `displayOnMap` — show on map

**Scrubbing rules:**

| Condition | Guest (no JWT) | Authenticated |
| --- | --- | --- |
| `displayPublic = N` | Scrub to safe fields only | No effect |
| `displayAddressOnInternet = N` | Scrub address | Scrub address |
| `displayOnMap = N` | Drop from response | Drop from response |
| `displayInternetEntireListing = N` | Scrub nested history/comparables | Scrub nested history/comparables |

Scrubbing replaces strings with `"!scrubbed!"`, dates with `"1900-06-21T01:39:00.000Z"`, numbers with `0`.

**Scrubbing only applies** to boards listed in `settings.scrubbing.board_ids`. Listings from other boards are not scrubbed.

## NATS Worker

One stream handler: `src/streams/boss/people.ts` — syncs people between the app and Follow Up Boss.

- **Stream name:** `NATS_WORKER_CONSUMER_STREAM` (default: `"boss-people"`)
- **Consumer:** `NATS_WORKER_CONSUMER_NAME` (default: `"boss-people-worker"`)
- **Subjects:**
  - `boss-people.people.upsert` → bulk sync from external source
  - `boss-people.people.create/update/delete` → webhook events from Follow Up Boss

NATS is optional — controlled by `NATS_ENABLED`. The HTTP server runs independently; only async processing requires the worker.

## Key Environment Variables

**Required (server will not start without these):**

```text
REPLIERS_API_KEY          # Repliers MLS API key
MAPBOX_ACCESS_TOKEN       # Mapbox geocoding
JWT_PRIVATE_KEY           # Path to RSA private key (e.g. keys/private.pem)
JWT_PUBLIC_KEY            # Path to RSA public key
```

**Project / deployment:**

```text
APP_SETTINGS_PRESET       # Project preset name (e.g. "defaults")
APP_ENVIRONMENT           # "localhost" | "dev" | "prod"
PORT                      # HTTP port (default: 8080)
```

**Database:**

```text
DATABASE_URL              # Or individual: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
DB_USE_SSL                # Default: false
```

**Redis:**

```text
REDIS_URL / REDISCLOUD_URL   # Default: redis://localhost:6379
REDIS_KEYV_ENABLE            # Enable Keyv-backed caching (default: false)
```

**Auth:**

```text
JWT_EXPIRE                # Token expiry (default: "30d")
AGENT_JWT_EXPIRE          # Override for agents
AUTH_OTP_TTL_MS           # OTP valid window (default: 600000)
AUTH_OTP_RESEND_TTL_MS    # OTP rate limit (default: 60000)
DEBUG_AUTH_OTP_EXPOSE_CODE  # Expose OTP in response — dev only, asserts false in prod
```

**Repliers / boards:**

```text
REPLIERS_AGENT_ID                    # Default agent for OTP delivery
REPLIERS_UNAUTHENTICATED_CLIENT_ID   # Client ID for guest interactions
APP_DEFAULTS_BOARDIDS                # Default boards for search (comma-separated)
APP_LOCATIONS_BOARDID                # Board used for location/autosuggest
REPLIERS_API_LIMIT                   # Max Repliers API requests per interval (code default: 1; all production hosts override to 5, i.e. 300/min)
REPLIERS_API_INTERVAL_MS             # Interval window in ms for REPLIERS_API_LIMIT (default: 1000)
REPLIERS_CACHE_WARMUP_API_KEY        # Separate Repliers key for SSG-build traffic (default: "", i.e. disabled — falls back to REPLIERS_API_KEY)
REPLIERS_CACHE_WARMUP_API_LIMIT      # Rate limit for the warmup key's own throttle (default: REPLIERS_API_LIMIT)
REPLIERS_CACHE_WARMUP_API_INTERVAL_MS # Interval window for REPLIERS_CACHE_WARMUP_API_LIMIT (default: REPLIERS_API_INTERVAL_MS)
XFF_SSG_TOKEN                        # Shared secret the SSG build sends as `X-Forwarded-For-Token` to identify itself
XFF_SSR_TOKEN                        # Shared secret the frontend's SSR renders send as `X-Forwarded-For-Token`
XFF_SSR_IPADDR_OFFSET                # Which entry of the SSR `x-forwarded-for` chain is the end user, counted from the end (default: 2)
```

All outbound Repliers API calls share a single process-wide throttle (`src/providers/throttler/repliers.ts`, backed by `p-throttle`) — `REPLIERS_API_LIMIT` caps total throughput for the whole dyno, not per-request. When diagnosing Repliers latency/timeout issues in production, use the actual prod value (5 rps / 300 rpm) as the ceiling, not the `1` rps code default.

A request is identified as an SSG build when its `X-Forwarded-For-Token` header matches `XFF_SSG_TOKEN` (`XFFProvider.isSsg()`). Only once `REPLIERS_CACHE_WARMUP_API_KEY` is also set does `RepliersBase` swap it in and route the request through a second, independent throttle (`src/providers/throttler/repliersWarmup.ts`) instead of the shared one — so an SSG build never queues behind live user traffic on the local rate limiter, in addition to no longer sharing the Repliers-side quota. With no warmup key configured, an SSG request is indistinguishable from a normal one. Treat `XFF_SSG_TOKEN` and the warmup key as secrets: anyone holding the token can drain the warmup key's quota, and the warmup key should never carry broader MLS entitlements than the default key.

**Client IP forwarding — deployment topology.** Every proxy hop appends the peer that connected to it, so the shape of `x-forwarded-for` is a property of the deployment, not of the code, and `XFF_SSR_IPADDR_OFFSET` must be set to match it. One production deployment, as an example rather than a rule — a CDN is absent on some deployments, and the platform in front of the process varies:

```text
Browser → Cloudflare → router → portal-frontend    # CDN absent on some deployments
Browser →              router → portal-backend     # no CDN in front of the backend here
```

| Traffic | Chain reaching the backend | Resolved by |
| --- | --- | --- |
| Browser → backend directly | `<client>` | last entry |
| SSR, CDN present | `<client>, <cdn-edge>, <frontend-egress>` | offset 3 → index 0 |
| SSR, no CDN | `<client>, <frontend-egress>` | offset 3 is out of bounds → walks down to 2 → index 0 |

`getClientIpBehindSSR` walks the offset down until it is in bounds, which is what lets a single offset serve both shapes — do not "fix" it to fail closed without checking every deployment first. The non-SSR branch takes the last entry, which is correct only while nothing sits between the browser and this process; put a CDN in front of the backend and it starts forwarding the CDN's edge IP as the end user.

An SSR-token request that arrives with no real client in the chain is a frontend bug, not a topology to accommodate: the caller should send `XFF_SSG_TOKEN` instead when there is no user behind the render (build, ISR regeneration, warm-up scripts).

**Scrubbing:**

```text
SETTINGS_SCRUBBING_BOARDIDS                   # Boards to scrub (comma-separated)
SETTINGS_SCRUBBING_FORCE_DISPLAY_PUBLIC_YES   # Force all listings visible (demo mode)
```

**Follow Up Boss:**

```text
BOSS_ENABLED         # Default: true (set to "false" to disable)
BOSS_USERNAME        # API credentials
BOSS_PASSWORD
BOSS_SYSTEM
BOSS_SYSTEM_KEY
BOSS_WEBHOOK_ENABLED  # Default: false
```

**NATS:**

```text
NATS_ENABLED         # Default: false
NATS_SERVER          # Default: localhost:4222
```

## Known Workarounds

- Uses `@poppinss/ts-exec` instead of `tsx` — required for decorator metadata support
- Uses `ts-node@11-beta` for TypeScript 5+ compatibility
- `tsconfig` extends from `./node_modules/@tsconfig/...` due to a `ts-node@11-beta` bug
- `@cached()` decorated functions: TypeScript types say `Promise<T | Cached<T>>` but runtime always returns `Cached<T>` — access `.value` to get the actual data
