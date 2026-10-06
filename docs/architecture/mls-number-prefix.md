# MLS-number prefix codec

Some boards store mlsNumbers with a board prefix (NWMLS = `NWM2563312`), while the
portal deals only in clean numbers (`2563312`). The boundary between the two worlds
is `src/lib/mlsNumberPrefix.ts`, driven by `settings.mlsNumberPrefix` (`"NWM"` in the
preset of a deployment on that board; empty everywhere else, making every helper
a no-op).

## Codec surface

- `stripMlsNumbers(data, prefix)` — strips the prefix from every `mlsNumber` in a
  Repliers response (deep: listings, history, comparables, similar, cluster-inlined).
  The `raw` MLS payload is intentionally left verbatim.
- `addMlsNumbers(data, prefix)` — prefixes every `mlsNumber` in request params
  (top level and `body.queries[]`).
- `addMlsPrefix(value, prefix)` — for mlsNumbers living in URL path segments
  (`/listings/{mlsNumber}`, `/listings/{mlsNumber}/similar`); applied at call sites.
- `addMlsSearchVariant(query, prefix)` — widens free-text `search` (see below).
  Wired only in the autosuggest MLS leg (`services/autosuggest.ts`); the general
  listings search never widens.

`addMlsNumbers` / `stripMlsNumbers` / `addMlsPrefix` are wired in
`services/repliers/listings.ts` (`search`, `single`, `similar`) and
`services/repliers/favorites.ts`.

## Free-text `search` widening

Repliers `search` is a case-insensitive starts-with match per keyword, so a clean
number can never hit a stored `NWM…` value. When `search` is a single digit-only
token and `searchFields` explicitly includes `mlsNumber` without
`address.streetNumber`, `addMlsSearchVariant` rewrites `search=2563312` to
`search=2563312 NWM2563312` with `searchOperator=OR` — a strict widening of a
single-keyword query. Non-digit, multi-token, and already prefixed inputs pass
through untouched, which also makes the rewrite idempotent.

## Repliers quirk: OR + `address.streetNumber`

Verified against the NWMLS dataset (2026-08): with `searchOperator=OR` and
`address.streetNumber` present in `searchFields`, a digit keyword that matches no
street number zeroes the **whole** union — even when another keyword matches
`mlsNumber` or `address.zip` (`search=98004 NWM98004` with the four autosuggest
fields returns 0 against 283 for the unwidened zip query). An **absent**
`searchFields` behaves the same way: the widened `search=2563312 NWM2563312`
with no field list returns 0 even though the number exists. Hence the guard
above — widening is safe only for an explicit `mlsNumber`-bearing,
`streetNumber`-free field list, and everything else must stay unwidened.

## Autosuggest MLS leg

Because of the quirk above, the primary autosuggest request (whose field list
contains `address.streetNumber`) is never widened and keeps today's exact
behavior. For prefixed boards, a digit-only `q` triggers a parallel supplementary
listings request with `searchFields: "mlsNumber"` (widened at the autosuggest
call site via `addMlsSearchVariant`), merged after the primary results: short digit queries keep their
street-number/zip suggestions exactly as before, while a full MLS number — which
matches no address — surfaces from the MLS leg. A failed MLS leg degrades to
primary-only results instead of failing the endpoint.

The MLS leg inherits the autosuggest listing filters (`status`, `lastStatus`,
`type`, `class`, proximity), so an exact number of a sold, rental, or commercial
listing does not autosuggest — same as the address legs. Widening those filters
for exact-number lookups is a separate product decision (cf. UR-296).
