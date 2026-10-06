---
name: boss-undefined-filter-hazard
description: BossService GET helpers pass params through axios, which drops undefined keys — getPeople({ email: undefined }) becomes an unfiltered list and people[0] is a random person
metadata:
  type: project
---

`BossService.request` sends GET params via axios `params`, and axios omits `undefined`/`null` values. A filter built from a possibly-missing field (`{ email: client.email }`, `{ id: user.externalId }`) silently turns into "list everyone", and callers then take `people[0].id`.

Seen 2026-10-01 in `eventsCollection.getPersonId` and `routes/agent.ts` estimate-send note (both pre-existing, preserved by the null-safety branch).

**How to apply:** When reviewing any `boss.getPeople`/`getUsers` call, check the filter value is guaranteed non-empty before the call, not just that the response is guarded. Related: [[review-tooling-gaps]].
