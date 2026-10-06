import { container } from "tsyringe";
import { RplListingPermissions, RplListingsSingle } from "../../services/repliers/listings.js";
import { RplStatus, RplYesNo } from "../../types/repliers.js";
import BaseScrubber from "./base.js";
import _debug from "debug";
import { AppConfig } from "../../config.js";
import _ from "lodash";
import { RplListingsAppState } from "../../validate/listings.ts";
const debug = _debug("repliers:scrubber:listings");
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export interface ScrubberFunctionParams {
   state: {
      user?: Record<string, unknown>;
   };
}
const config = container.resolve<AppConfig>('config');
const DropFields = config.settings.scrubbing.dropFields;
const SafeFields = config.settings.scrubbing.safeFields;
const SafeAddressFields = config.settings.scrubbing.safeAddressFields;
export type ImportantFields = "status" | "address" | "duplicates" | "boardId";
type ClusterListing = Partial<RplListingsSingle>;
interface MapClustersAggregate {
   map?: {
      clusters?: Array<{
         listings?: ClusterListing[];
         [key: string]: unknown;
      }>;
      [key: string]: unknown;
   };
   [key: string]: unknown;
}

/**
 * Determines if listing address should be scrubbed
 * For authenticated users: scrub only if displayAddressOnInternet = N
 * For guests: scrub if displayAddressOnInternet = N OR displayPublic = N
 */
const shouldScrubAddress = (permissions: RplListingPermissions | undefined, isUser: boolean) => {
   return isUser ? permissions?.displayAddressOnInternet === RplYesNo.N : permissions?.displayAddressOnInternet === RplYesNo.N || permissions?.displayPublic === RplYesNo.N;
};
const isUser = (appState: RplListingsAppState) => {
   return appState?.user !== undefined && Object.keys(appState.user).length > 0;
};

/**
 * Permissions derived from a record's own status, for records that arrive without any.
 * `asGuest()` redacts on `displayPublic === N`, so a record with no permissions at all
 * would pass through with its price intact; anything not currently on the market is
 * therefore treated as non-public.
 */
export const permissionsFromLastStatus = (item: {
   status?: RplStatus;
   lastStatus?: string;
}): RplListingPermissions => {
   const {
      status,
      lastStatus
   } = item;
   const onMarket = status === RplStatus.A || lastStatus !== undefined && ["New", "Pc", "Ext", "Cs"].includes(lastStatus);
   return {
      displayAddressOnInternet: RplYesNo.Y,
      displayInternetEntireListing: RplYesNo.Y,
      displayPublic: onMarket ? RplYesNo.Y : RplYesNo.N
   };
};

//TODO: Add list of RAW fields to scrub

export class ListingsScrubber extends BaseScrubber {
   constructor(private args: any[] | [ScrubberFunctionParams, ...any[]]) {
      debug("Function call args: %O", args);
      super();
   }
   private asGuest(data: RequiredFields<Partial<RplListingsSingle>, ImportantFields>) {
      debug("Scrubbing as guest");
      debug("Data: %s, Dups: %O", data["mlsNumber"], data["duplicates"]);

      // TODO: Finish permissions.displayInternetEntireListing == N handling
      // if (data["permissions"].displayInternetEntireListing !== RplYesNo.Y) {
      //    return null;
      // }

      //TODO: Update tests to support this
      if (config.settings.scrubbing.duplicates_enabled && data["status"] === RplStatus.A && (
      // for all which have status = A AND
      !Array.isArray(data["duplicates"]) || !data["duplicates"].includes(config.settings.scrubbing.ref_board_id)) // ( if no duplicates or duplicates is array which doesn't have CREA_BOARD_RESOURCE_ID number )
      ) {
         // treat as disaplyPublic = N
         data.permissions = {
            displayInternetEntireListing: RplYesNo.Y,
            displayAddressOnInternet: RplYesNo.Y,
            displayPublic: RplYesNo.N
         };
      }
      if (data.permissions?.displayPublic === RplYesNo.N) {
         if ("address" in data) {
            data["address"] = this.objectScrubber(data["address"], SafeAddressFields);
         }
         data = this.objectScrubber(data, SafeFields);
         data = this.dropFields(data, DropFields, SafeFields);
      }

      // Truthiness, not `in`: Repliers sends `history: null` on some listings.
      if (data.history && !config.settings.scrubbing.force_display_public_yes) {
         debug("Have history");
         data.history = this.scrubNestedListings(data, "history");
      }
      if (data.comparables && !config.settings.scrubbing.force_display_public_yes) {
         debug("Have comparables");
         data.comparables = this.scrubNestedListings(data, "comparables");
      }
      return data;
   }
   private asUser(data: RequiredFields<Partial<RplListingsSingle>, ImportantFields>) {
      debug("Scrubbing as user");
      return data;
   }
   private asAnyone(data: RequiredFields<Partial<RplListingsSingle>, ImportantFields>) {
      debug("Scrubbing everything else");
      if (shouldScrubAddress(data?.permissions, isUser(this.args[0].app_state)) && "address" in data) {
         data["address"] = this.objectScrubber(data["address"], SafeAddressFields);
      }
      if (data.permissions?.displayOnMap === RplYesNo.N) {
         delete data.map;
      }

      /**
       * RESODataDictionary-2.0
       * InternetAutomatedValuationDisplayYN
       * Indicates whether or not the seller allows the listing to be displayed with an automated valuation model (AVM) on Internet sites.
       */
      if (data?.raw?.["InternetAutomatedValuationDisplayYN"] === false) {
         delete data.estimate;
      }
      return data;
   }
   private scrubNestedListings(data: RequiredFields<Partial<RplListingsSingle>, ImportantFields>, key: string) {
      const scrubbedArray = (data[key] as Partial<RplListingsSingle>[]).map((item: Partial<RplListingsSingle>) => {
         const extendedItem = this.extend(item, config.settings.scrubbing.importantFields, data);
         if (extendedItem.permissions?.displayInternetEntireListing === RplYesNo.N) {
            return null;
         }
         if (!extendedItem.permissions) {
            extendedItem.permissions = permissionsFromLastStatus(extendedItem);
         }
         debug('%o', extendedItem);
         return this.scrub(extendedItem);
      }).filter(item => item !== null);
      return scrubbedArray;
   }
   extend(data: Partial<RplListingsSingle>, fields: Array<ImportantFields>, source: RequiredFields<Partial<RplListingsSingle>, ImportantFields>) {
      const copy = JSON.parse(JSON.stringify(data)); // Make full copy not reference
      const result: Record<string, unknown> = {};
      for (const field of fields) {
         result[field] = source[field];
      }
      return {
         ...copy,
         ...result
      } as unknown as RequiredFields<Partial<RplListingsSingle>, ImportantFields>;
   }
   public scrub(data: RequiredFields<Partial<RplListingsSingle>, ImportantFields>): Partial<RplListingsSingle> {
      const clone = _.cloneDeep(data);

      // force permission value - mainly for Demo purposes
      if (config.settings.scrubbing.force_display_public_yes) {
         clone.permissions = {
            displayInternetEntireListing: RplYesNo.Y,
            displayAddressOnInternet: RplYesNo.Y,
            displayPublic: RplYesNo.Y
         };
      }
      // don't scrub if boardId is missing in settings list of boards
      if (!config.settings.scrubbing.board_ids.includes(clone.boardId)) {
         return clone;
      }
      let result;
      if (isUser(this.args[0].app_state)) {
         result = this.asUser(clone);
      } else {
         result = this.asGuest(clone);
      }
      return this.asAnyone(result);
   }

   /**
    * Scrubs listings inlined into map clusters. The top-level `listings` array is
    * scrubbed via `scrub()`, but the cluster aggregate bypasses it, so a
    * restricted listing inlined from a small cluster would leak its real
    * price/address/images. Runs each cluster listing through the same scrubber
    * (which gates on the listing's `boardId`). Mutates in place; a no-op when the
    * result carries no map-cluster aggregates.
    */
   public scrubClusters(aggregates: MapClustersAggregate | undefined): void {
      const clusters = aggregates?.map?.clusters;
      if (!Array.isArray(clusters)) {
         return;
      }
      for (const cluster of clusters) {
         if (!Array.isArray(cluster.listings)) {
            continue;
         }
         cluster.listings = cluster.listings.map(listing => this.scrub(listing as RequiredFields<ClusterListing, ImportantFields>));
      }
   }
}

// TODO: Finish permissions.displayInternetEntireListing == N handling

// export const scrubListings = (result: any, key?: string, ...args: any[] | [ScrubberFunctionParams, ...any[]]) => {
//    let scrubbingArray = key ? result[key] : [result]; // single or array
//    const scrubber = new ListingsScrubber(args);
//    scrubbingArray = scrubbingArray || [];
//    const scrubbedData = scrubbingArray.map(scrubber.scrub.bind(scrubber)).filter((item: any) => item !== null);
//    return key ? { ...result, [key]: scrubbedData } : scrubbedData.at(0);
// }

// export const scrubbed = (key?: string) => {
//    return (_target: any, memberName: string, propertyDescriptor: PropertyDescriptor) => {
//       return {
//          get() {
//             // function may accept params with state or w/o state property
//             const wrapperFn = (...args: any[] | [ScrubberFunctionParams, ...any[]]) => {
//                return propertyDescriptor.value.apply(this, args).then((result: any) => {
//                   return scrubListings(result, key, ...args);
//                });
//             };

//             Object.defineProperty(this, memberName, {
//                value: wrapperFn,
//                configurable: true,
//                writable: true,
//             });
//             return wrapperFn;
//          },
//       };
//    };
// };

export const scrubbed = (key?: string) => {
   return (_target: any, memberName: string, propertyDescriptor: PropertyDescriptor) => {
      return {
         get() {
            // function may accept params with state or w/o state property
            const wrapperFn = (...args: any[] | [ScrubberFunctionParams, ...any[]]) => {
               return propertyDescriptor.value.apply(this, args).then((result: any) => {
                  let scrubbingArray = key ? _.get(result, key) : [result];
                  const scrubber = new ListingsScrubber(args);
                  scrubbingArray = scrubbingArray || [];
                  const scrubbedData = scrubbingArray.map(scrubber.scrub.bind(scrubber));
                  // Cluster-inlined listings bypass `key`; scrub them with the same
                  // scrubber. No-op unless the result carries map-cluster aggregates.
                  scrubber.scrubClusters(result?.aggregates);
                  return key ? {
                     ...result,
                     [key]: scrubbedData
                  } : scrubbedData.at(0);
               });
            };
            Object.defineProperty(this, memberName, {
               value: wrapperFn,
               configurable: true,
               writable: true
            });
            return wrapperFn;
         }
      };
   };
};