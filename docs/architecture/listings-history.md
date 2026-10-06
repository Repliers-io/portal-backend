# GET /listings/history

Proxies the Repliers property-history endpoint. Repliers resolves the *property* behind
the MLS number, so the answer spans every board the account can read — unlike the
`history` array nested in a listing detail, which is scoped to the board that record came
from.

## Contract

`GET /api/listings/history?mlsNumber=<mls>` → `{ "history": [ … ] }`, in the order Repliers
returns them. No `boardId` parameter: the upstream endpoint does not take one.

Two properties of that answer are worth knowing before consuming it, because this route
passes them through rather than papering over them: the records are not ordered by date and
the requested listing is among them, and a listing syndicated across boards arrives once per
board under the same MLS number. Presentation concerns — ordering, and how repeated records
are rendered — belong to the consumer; the underlying behaviour belongs to Repliers.

## Scrubbing

Records arrive with their own `boardId` and `permissions`, so each one is scrubbed on its
own merits by `ListingsScrubber.scrub()` rather than inheriting a parent listing's board
through `settings.scrubbing.importantFields`.

`scrub()` returns a record untouched when its `boardId` is outside
`settings.scrubbing.board_ids`, so a record without a board would be served with its sold
price intact. Records without a `boardId` are therefore dropped, not forwarded.

Records whose `permissions.displayInternetEntireListing` is `"N"` are dropped too, the way
`scrubNestedListings` drops them on a listing detail and `single()` refuses to serve such a
listing at all. `scrub()` itself does not implement that drop — in `asGuest()` the check is
commented out (`// TODO: Finish permissions.displayInternetEntireListing == N handling`) —
so this route applies it explicitly, in the same filter step that drops boardless records.

A record that arrives without `permissions` has them synthesized from its own `lastStatus`
through `permissionsFromLastStatus`, which yields `displayPublic: N` unless `status` is
`"A"` or `lastStatus` is one of `New`/`Pc`/`Ext`/`Cs`. Without that step, `asGuest()` has no
`displayPublic: N` to act on — that comparison is the only thing that triggers its
field-dropping branch — and a closed record's sold price would come back in the clear.
`scrubNestedListings` calls the same function for the history nested in a listing detail;
this route applies it to each record before the scrubber runs.

Scrubbing itself goes through the `@scrubbed("history")` decorator, the same path
`single()` and `search()` take, so the three services cannot drift apart. The two helpers
the route applies first — `servable`, the filter above, and `withPermissions`, the fallback
— sit next to the method in `src/services/listings.ts`.

## Route order

Registered above `/:mlsNumber` in `src/routes/listings.ts`. `@koa/router` matches in
registration order, so the parametric listing route would otherwise treat `history` as an
MLS number.

## No caching, no view event

`history()` carries no `@cached` decorator, unlike `single()` and `count()`. `@cached`'s key
is `JSON.stringify(args)` (`lib/decorators/cached.ts`), and this method's only argument
carries `app_state: { user }`. Including `app_state` in the key would scope every cache
entry to one user — useless, since the same property's history is identical for every
caller and only the *scrubbing* differs by user. Stripping it from the key to make the
cache useful would instead be unsafe: a guest-scrubbed response could be served back to an
authenticated user, or the reverse, from the same key.

`/:mlsNumber` runs the `eventsCollectionMiddleware`-wrapped `selectViewPropertyParams`
selector after a successful response, recording a property-view event. `/history` does not
run it: this route isn't a property view — it returns the property's history across boards,
not the listing currently being viewed.
