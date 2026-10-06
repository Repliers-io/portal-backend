# Restricted listings

A deployment can receive "restricted" listings that exist in its feed but may never appear
on the site. Repliers keeps no blocklist, so the portal enforces it — on the way out for
searches, and on the way back for everything else.

## Configuration

```ts
settings: {
   restrictedListings: ["X7599124"], // [] = off
}
```

MLS numbers without a board prefix, listed in the instance preset
(`src/settings/instances/`, which the open-source export already drops) or via
`SETTINGS_RESTRICTED_LISTINGS` as a comma-separated string. Instance presets replace
arrays wholesale rather than merging them, so the list is exactly what the instance
declares.

## Where it is enforced

| Exit | How |
| --- | --- |
| `search` — list, map, count, autosuggest, NLP, estimate comparables | `not:mlsNumber` on the request, so `count` and pagination stay exact |
| `single` | `validateAvailability` throws `hide_unavailable_listings_http_code` |
| `similar`, `history` | dropped from the response |
| favorites, featured listings | dropped from the response; `delete` still checks ownership against the unfiltered list, so a listing favorited before the block can still be removed |

Both helpers — `excludeRestrictedListings` and `dropRestricted` — live in
`src/services/listings/listingHelpers.ts`.

## Placing `not:` on a search

Two rules of the Repliers API decide it, both verified against a live key:

- a parameter given **both** top-level and inside `queries[]` is rejected with `400
  Parameter conflict`;
- `queries[]` is a **union**, so an exclusion missing from one branch lets the listing
  back in through that branch.

So: the moment any branch filters by `mlsNumber`, every branch gets the exclusion;
otherwise a single top-level entry covers the whole union — the request body for a POST
search, the query string for a GET, or the caller's own `mlsNumber` filter when it has
one. Also verified: a positive number and its `not:` twin can share one array (the
exclusion wins), and the numbers must be prefixed *after* `addMlsNumbers` runs, or the
MLS-prefix codec turns `not:2559393` into `NWMnot:2559393`.
