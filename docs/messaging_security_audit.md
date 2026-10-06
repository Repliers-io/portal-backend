# Attack paths to agent message-delivery via public API

## Context

Security analysis of the Repliers portal-backend to identify how an attacker could abuse the public HTTP API to deliver messages (email/SMS/CRM notes) to real-estate agents inside the Repliers system.

Three OTP/messaging sinks exist inside the service layer, all backed by the Repliers Messages API (a real delivery channel that reaches real humans):

- [src/services/auth.ts:169](../src/services/auth.ts#L169) — `messages.send()` for OTP delivery
- [src/services/contact.ts:70](../src/services/contact.ts#L70) and [src/services/contact.ts:157](../src/services/contact.ts#L157) — `messages.send()` for inquiries
- [src/services/agent.ts:60](../src/services/agent.ts#L60) — agent→client messaging (agent-authenticated, out of scope)

The front-door protections are minimal. [src/app.ts](../src/app.ts) has no rate limiter, no captcha, no bot-protection middleware. The only OTP throttle is a 60-second per-`clientId` cooldown in [src/services/auth.ts:180-186](../src/services/auth.ts#L180-L186). Contact endpoints have no throttle at all.

## Attack surface summary

| # | Endpoint | Auth | Recipient-choice primitive | Content-choice primitive | Rate limit |
|---|---|---|---|---|---|
| A1 | `POST /api/auth/signup` | public | attacker-supplied `email` / `phone` | fixed OTP template | **none** (per-clientId limit is bypassed by rotating email) |
| A2 | `POST /api/auth/login` | public | any known `email` / `phone` | fixed OTP template | 60s per-`clientId` (trivially parallelised across emails) |
| A3 | `POST /api/contact/contactus` | passthrough | `clientId` → agent lookup | **full body text** via `name`/`email`/`phone`/`message` | **none** |
| A4 | `POST /api/contact/schedule` | passthrough | `clientId` → agent OR MLS lookup | **full body text** (same fields) | **none** |
| A5 | `POST /api/contact/schedule/estimate` | passthrough | any `estimateId` → estimate owner's agent | **full body text** | **none** |
| A6 | `POST /api/contact/requestinfo` | passthrough | `clientId` → agent | **full body text** | **none** |

## Attack A1 — Unlimited OTP spam to arbitrary inboxes via `/auth/signup`

**Primitive.** [src/routes/auth.ts:332-347](../src/routes/auth.ts#L332-L347) → [src/services/auth.ts:261-286](../src/services/auth.ts#L261-L286). Signup is fully anonymous. It calls `clients.create({ email, fname, lname, phone? })` in Repliers, then chains into `login() → sendOtp()` at [src/services/auth.ts:279](../src/services/auth.ts#L279), which calls `messages.send()` through the Repliers Messages API — delivering a real email/SMS to whatever address the attacker supplied.

**Why the 60s rate limit does not apply.** The OTP throttle key is `otp_sent_${clientId}` ([src/services/auth.ts:188-190](../src/services/auth.ts#L188-L190)). Signup mints a **new** `clientId` for every unique email, so every fresh attacker-supplied email bypasses the cooldown entirely.

**Request:**
```http
POST /api/auth/signup
Content-Type: application/json

{ "fname": "a", "lname": "b", "email": "victim@example.com" }
```

**Impact:**
- Mass-mail any address via Repliers' trusted sending infrastructure (bypasses attacker-side SPF/DKIM/reputation).
- Every request permanently creates a client record in the Repliers tenant — poisons the CRM and database.
- On tenants where `AUTH_OTP_MESSAGE_TYPE = link_and_code` (default), the attacker can't steal codes (they go to the victim), but the victim receives a plausible branded message naming the tenant's default agent (`REPLIERS_AGENT_ID` via [src/services/auth.ts:264](../src/services/auth.ts#L264)) — a strong phishing precursor.
- The `fname`/`lname` fields on signup ([src/validate/auth.ts:33-34](../src/validate/auth.ts#L33-L34)) are **unbounded strings** — joi only requires `string()`, no `max()`. Large payloads pass validation and land in Repliers.

## Attack A2 — Enumerate + spam existing users via `/auth/login`

**Primitive.** [src/routes/auth.ts:179-191](../src/routes/auth.ts#L179-L191) → [src/services/auth.ts:129-158](../src/services/auth.ts#L129-L158). Login looks the email up via `clients.filter()`; on miss it returns 404, on hit it mints a new OTP (not reused, [src/services/auth.ts:162](../src/services/auth.ts#L162)) and sends it to the user.

**Enumeration.** The `User not found` 404 at [src/services/auth.ts:140](../src/services/auth.ts#L140) differs in both status and body from success. Attacker probes any email list → gets list of registered clients. No captcha, no throttle on this endpoint.

**Spam.** For each known email, attacker triggers one OTP per 60 seconds. With N known emails, the attacker generates N OTP messages per minute. Each OTP is a real email/SMS sent through Repliers.

**Secondary.** The flow also calls `ensureMailingAllowed()` at [src/services/auth.ts:148](../src/services/auth.ts#L148) which **writes** to the user record flipping `preferences.email: true, unsubscribe: false`. This silently re-subscribes users who previously opted out — a compliance concern (CAN-SPAM / CASL).

## Attack A3/A4/A6 — Agent-targeted phishing via contact endpoints

**Primitive.** All three contact handlers ([src/routes/contact.ts:48](../src/routes/contact.ts#L48), [110](../src/routes/contact.ts#L110), [181](../src/routes/contact.ts#L181)) are mounted behind `middleware.jwt.passthrough` ([src/routes/contact.ts:15](../src/routes/contact.ts#L15)) — anonymous requests are allowed.

They funnel into `ContactService.sendEmail()` ([src/services/contact.ts:147-158](../src/services/contact.ts#L147-L158)), which either (a) sends SMTP email to `defaultAgentEmail` or (b) delivers via Repliers Messages API to the resolved agent.

**Content-injection.** The email body is built by string interpolation with zero escaping:

```ts
// src/services/contact.ts:28-33
`Name: ${params.name}\n
 email: ${params.email}\n
 phone: ${params.phone}\n
 message: ${params.message}\n`
```

Joi caps `message` at 1024 chars and `name` at 70 ([schemas at src/validate/contact.ts:27-34](../src/validate/contact.ts#L27-L34)) — plenty of room for a phishing link + pretext. Because the message arrives **from the tenant's trusted agent channel**, the agent sees an inbound lead that looks legitimate. Embedding a payload like `message: "Hi, here are the documents: https://attacker.tld/…"` yields a highly effective phishing vector aimed at the agent (who has CRM/admin privileges).

**Recipient-choice.** [src/services/contact.ts:134-145](../src/services/contact.ts#L134-L145) resolves `agentId` from `(await clients.get(clientId)).agentId` when `clientId` is supplied in the body. Since `clientId` is part of the joi schema ([src/validate/contact.ts:32](../src/validate/contact.ts#L32)) and **not** overridden by the authenticated user's id (route spreads body first, then overrides only if `ctx.state.user.sub` exists — but for anonymous callers nothing overrides), any anonymous attacker who knows or guesses a valid `clientId` can route the phishing message to that client's assigned agent.

**Follow Up Boss amplification.** Every contact endpoint chains into an `eventsCollection` middleware ([src/routes/contact.ts:62-68](../src/routes/contact.ts#L62-L68), [125-130](../src/routes/contact.ts#L125-L130), [195-201](../src/routes/contact.ts#L195-L201)) with `allowIncognito: true`, creating a real FUB person + event per request. Attacker gets an extra persistence sink into the agent's CRM, also surfacing attacker-controlled fields.

**Request:**
```http
POST /api/contact/contactus
Content-Type: application/json

{
  "name": "Jane Buyer",
  "email": "attacker@evil.tld",
  "phone": "14165551234",
  "message": "I'm very interested — here are my docs: https://evil.tld/steal",
  "clientId": 12345
}
```

## Attack A5 — Cross-agent targeting via `/contact/schedule/estimate`

**Primitive.** [src/routes/contact.ts:132-145](../src/routes/contact.ts#L132-L145) → [src/services/contact.ts:58-116](../src/services/contact.ts#L58-L116). The handler takes an `estimateId` ([src/validate/contact.ts:88](../src/validate/contact.ts#L88)) and performs **no ownership check** on the estimate.

At [src/services/contact.ts:63-81](../src/services/contact.ts#L63-L81) the service:
1. Loads the estimate by attacker-supplied `estimateId`.
2. Sends a Repliers message (**bypasses the SMTP branch** — unconditionally calls `repliers.messages.send`) with attacker-controlled `name`/`phone`/`date`/`time` and the estimate URL.
3. At [src/services/contact.ts:94-114](../src/services/contact.ts#L94-L114), when `clientId` is absent, it looks up `estimate.clientId → owner.agentId` and posts to that agent's FUB inbox with `assignedUserId` set.

**Why it matters.** Unlike A3/A4/A6 (where `clientId` must be known), here the attacker only needs an **estimateId**. Estimate IDs are numeric and likely sequential (created via `POST /api/estimate` which is also public). By incrementing `estimateId` the attacker can route messages to **every agent in the tenant who has ever had a client create an estimate** — without knowing any emails, client IDs, or agent IDs up front.

**Request:**
```http
POST /api/contact/schedule/estimate
Content-Type: application/json

{
  "name": "Mr Fake",
  "email": "a@b.c",
  "phone": "14165551234",
  "date": "2026-05-01",
  "time": "10:00",
  "estimateId": 1
}
```

Iterate `estimateId` from 1 upward: each success is a message delivered to a distinct agent inbox (Repliers) plus a FUB note with the phishing-candidate text.

## Supporting weaknesses

- **No global rate limiter.** [src/app.ts:64-79](../src/app.ts#L64-L79) does not install koa-ratelimit or any throttling middleware. All "per-user" limits are application-level and keyed on identifiers the attacker can rotate.
- **Unbounded signup fields.** [src/validate/auth.ts:32-38](../src/validate/auth.ts#L32-L38) — `fname`/`lname` are `string()` with no `max()`.
- **CORS permissive in non-prod.** [src/providers/middleware/cors.ts](../src/providers/middleware/cors.ts) returns `*` when `NODE_ENV !== "production"`. Endpoints at dev/staging URLs can be called from any browser origin, enabling CSRF-style weaponisation against contact endpoints (no auth required).
- **Account-enumeration 404.** [src/services/auth.ts:139-140](../src/services/auth.ts#L139-L140).
- **Silent re-subscribe on login.** [src/services/auth.ts:146-154](../src/services/auth.ts#L146-L154) flips `preferences.email` / `unsubscribe` — re-opts in users who had unsubscribed before an attacker hits `/auth/login` for their email.
- **`DEBUG_AUTH_OTP_EXPOSE_CODE` production guard is substring-matched.** [src/config.ts:650-652](../src/config.ts#L650-L652) asserts against `APP_ENVIRONMENT?.includes("prod")`. Environments named `staging`, `uat`, `demo` are uncovered — if the flag ever leaks into such an env, OTPs are returned in the response body (full account takeover primitive).
- **OTP is 6 digits, uniformly `Math.random`.** [src/services/auth/codegen.ts](../src/services/auth/codegen.ts). Combined with the lack of lockout on `POST /auth/otp` ([src/routes/auth.ts:230](../src/routes/auth.ts#L230) — no rate-limit on code submission), an attacker can brute-force a valid code during its 10-min TTL (`AUTH_OTP_TTL_MS=600000`) — ~10⁶ keyspace, 600s window.

## Verification (how to confirm without deploying fixes)

1. **Confirm `/auth/signup` bypass of OTP throttle**: against a disposable tenant (e.g. `sample_data` preset), POST 10 signups with distinct random emails in <10 seconds. All should return 200 and trigger 10 Repliers message deliveries.
2. **Confirm `/contact/schedule/estimate` ownership bypass**: create an estimate from one anonymous session; from a second, unrelated session post to `/contact/schedule/estimate` with that estimate's numeric id. The note should appear in the original agent's FUB and a Repliers message be sent to that agent.
3. **Confirm account enumeration**: `curl /api/auth/login` with `{"email": "known@x"}` → 200; with `{"email": "noone@nowhere.invalid"}` → 404 + `User not found`.
4. **Confirm content reflection**: POST to `/api/contact/contactus` with `"message": "TEST-MARKER-<script>alert(1)</script>"` and check the delivered email body — the marker appears verbatim (HTML-escaping is handled, if at all, only by the downstream mail client).

## Critical files

- [src/app.ts](../src/app.ts) — global middleware order; insertion point for rate limiter / captcha
- [src/routes/auth.ts](../src/routes/auth.ts) — `/signup`, `/login`, `/otp`, `/repliers-token`
- [src/routes/contact.ts](../src/routes/contact.ts) — all four contact endpoints
- [src/services/auth.ts](../src/services/auth.ts) — `login`, `signup`, `sendOtp`, `otpSendRateOpened`
- [src/services/contact.ts](../src/services/contact.ts) — `contactUs`, `schedule`, `scheduleEstimate`, `requestInfo`, `defaultMessageFields`, `sendEmail`
- [src/validate/auth.ts](../src/validate/auth.ts) — signup/login/OTP schemas (unbounded fname/lname)
- [src/validate/contact.ts](../src/validate/contact.ts) — joi schemas allowing `clientId` from body
- [src/services/auth/codegen.ts](../src/services/auth/codegen.ts) — OTP generator (Math.random, 6 digits)

## Recommended mitigations (not yet scoped)

1. Add a per-IP rate limiter (koa-ratelimit, backed by the existing Redis) to `/auth/signup`, `/auth/login`, `/auth/otp`, `/contact/*`.
2. Add captcha (Turnstile or hCaptcha) on the four contact endpoints and `/auth/signup`.
3. Cap signup by email/phone fingerprint at the service layer (not just clientId) — reject if the same email has seen N OTPs in M minutes regardless of whether each attempt minted a new clientId.
4. Add ownership check on `/contact/schedule/estimate` — require the caller's JWT `sub` to match `estimate.clientId`, or require a one-time unguessable token minted with the estimate.
5. Normalise `/auth/login` response for known and unknown accounts (same status, same body, same timing).
6. Strip / neutralise URLs and suspicious patterns in `name`/`message` fields, or mark messages originating from public anonymous inquiries as "unverified" in the Repliers / FUB view.
7. Add `max()` to `fname`/`lname` in signup schema.
8. Harden the `DEBUG_AUTH_OTP_EXPOSE_CODE` guard to an exact-match allowlist of non-prod env names, and fail closed.
9. Lock out OTP submission after N failed `/auth/otp` attempts per IP within the 10-min TTL window to close the brute-force path.
