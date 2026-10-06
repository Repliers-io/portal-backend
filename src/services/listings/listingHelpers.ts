import { addMlsPrefix } from "./mlsNumberPrefix.ts";
import { RplStandardStatus } from "../../types/repliers.ts";

/**
 * Narrows `standardStatus` to the tenant's allowed set, in place. No filter means every allowed status, never every status.
 *
 * Applied to every query of a configured instance, so all of its callers have to speak the RESO
 * vocabulary: Repliers answers 400 to `standardStatus` sent together with `status`/`lastStatus`.
 */
export const constrainStandardStatus = (target: {
   standardStatus?: RplStandardStatus | RplStandardStatus[] | undefined;
}, allowed: RplStandardStatus[] | undefined) => {
   if (!allowed?.length) return;
   const permitted = [target.standardStatus ?? []].flat().filter(status => allowed.includes(status));
   // Repliers ignores an empty filter, which would widen the search to every status.
   target.standardStatus = permitted.length ? permitted : [...allowed];
};
interface MlsNumberScope {
   mlsNumber?: string[] | undefined;
}
interface SearchBody extends MlsNumberScope {
   queries?: MlsNumberScope[] | undefined;
}
const unionMlsNumbers = (scope: MlsNumberScope, entries: string[]) => {
   scope.mlsNumber = [...new Set([...(scope.mlsNumber ?? []), ...entries])];
};

/**
 * Excludes the instance blocklist from a listings search as `not:mlsNumber`.
 *
 * Repliers rejects a parameter given both top-level and inside `queries[]` (400 Parameter
 * conflict), and `queries[]` is a union, so an exclusion missing from one branch leaks
 * through it — hence: any branch filtering by mlsNumber → every branch, otherwise a single
 * top-level entry. Prefixing happens here because `addMlsNumbers` already ran and would
 * fold `not:` into the board prefix.
 */
export const excludeRestrictedListings = (query: MlsNumberScope, body: SearchBody, mlsNumbers: readonly string[], {
   prefix,
   usePost
}: {
   prefix: string;
   usePost: boolean;
}) => {
   if (!mlsNumbers.length) return;
   const entries = mlsNumbers.map(number => `not:${addMlsPrefix(number, prefix)}`);
   const {
      queries
   } = body;
   if (queries?.some(({
      mlsNumber
   }) => mlsNumber?.length)) {
      queries.forEach(branch => unionMlsNumbers(branch, entries));
      return;
   }
   unionMlsNumbers(query.mlsNumber?.length || !usePost ? query : body, entries);
};

/** For the endpoints Repliers cannot pre-filter — similar, history, favorites. */
export const dropRestricted = <T extends Record<string, unknown>,>(items: T[] | null | undefined, mlsNumbers: readonly string[]) => (items ?? []).filter(({
   mlsNumber
}) => typeof mlsNumber !== "string" || !mlsNumbers.includes(mlsNumber));