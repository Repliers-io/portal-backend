import { injectable } from "tsyringe";
import RepliersBase, { ApiRequest, ApiResponse, PagedApiResponse } from "./base.js";
import { addMlsNumbers, addMlsPrefix, stripMlsNumbers } from "../listings/mlsNumberPrefix.ts";
import { RplListingsLocationsDto, RplListingsSearchDto, RplListingsSimilarDto, RplListingsSingleDto, RplNlpDto } from "../../validate/listings.js";
import { RplClass, RplLastStatus, RplListingClass, RplMonthFormat, RplStandardStatus, RplStatus, RplType, RplYearFormat, RplYesNo } from "../../types/repliers.js";
import { RplLocation } from "./locations.js";
import { constrainStandardStatus, excludeRestrictedListings } from "../listings/listingHelpers.ts";
export interface RepliersCondominium {
   amenities: string[];
   fees: {
      maintenance: number | null;
      [key: string]: unknown;
   };
   pets: string | null;
   exposure: string | null;
   [key: string]: unknown;
}
export interface RplListingPermissions {
   displayAddressOnInternet: RplYesNo;
   displayPublic: RplYesNo;
   displayInternetEntireListing: RplYesNo;
   displayOnMap?: RplYesNo;
}
export interface RplListingsSingle extends Record<string, unknown> {
   listDate: string;
   rooms: Record<string, unknown>[];
   timestamps: {
      idxUpdated?: string | null;
      listingUpdated?: string | null;
      photosUpdated?: string | null;
      conditionalExpiryDate?: string | null;
      terminatedDate?: string | null;
      suspendedDate?: string | null;
      listingEntryDate?: string | null;
      closedDate?: string | null;
      unavailableDate?: string | null;
      expiryDate?: string | null;
      extensionEntryDate?: string | null;
      possessionDate?: string | null;
      repliersUpdatedOn?: string | null;
   };
   condominium: RepliersCondominium | undefined;
   // Repliers sends null for any block the board left empty — commercial, land,
   // lease and historical listings routinely have no taxes/address/details.
   taxes: {
      annualAmount: number | null;
      assessmentYear?: number | null;
   } | null;
   office: {
      brokerageName: string;
   };
   images: string[];
   type: RplType;
   nearby: Record<string, unknown>;
   photoCount: number;
   lot: Record<string, unknown>;
   mlsNumber: string;
   openHouse: Array<Record<string, unknown>>;
   permissions: RplListingPermissions;
   soldPrice: string; // 0.00
   details: Record<string, unknown> | null;
   class: RplListingClass; // ResidentialProperty
   propertyType: string;
   style: string;
   map: {
      latitude: string;
      point: string;
      longitude: string;
   };
   address: Record<string, unknown> | null;
   resource: string;
   updatedOn: string;
   daysOnMarket: number;
   agents: Array<{
      [key: string]: unknown;
      agentId: number;
   }>;
   coopCompensation: unknown | null;
   listPrice: string;
   status: RplStatus;
   lastStatus: RplLastStatus;
   standardStatus: RplStandardStatus;
   boardId: number;
   comparables: Partial<RplListingsSingle>[] | null;
   history: Partial<RplListingsSingle>[] | null;
   raw?: Record<string, unknown>;
   estimate?: Record<string, unknown>;
}
export type RplRollingPeriodName = "grp-30-days" | "grp-90-days" | "grp-365-days";
export interface StatsMoment {
   avg: number;
   med: number;
}
export interface StatsCount {
   count: number;
}
export interface StatsMomentCount extends StatsCount, StatsMoment {}
export interface StatsFull extends StatsMomentCount {
   sum: number;
}
export type StatsMomentSum = Omit<StatsFull, "count">;
export interface RplRollingPeriod {
   [key: string]: StatsMomentCount;
}
export interface RplListingsSearchRequest extends Omit<RplListingsSearchDto, "app_state">, ApiRequest {}
export interface RplListingsSearchResponse extends PagedApiResponse {
   listings: Array<RplListingsSingle>;
   // Every block is optional: Repliers only returns the ones requested via
   // `statistics=` and omits buckets that have no matching listings.
   statistics?: {
      soldPrice?: {
         "grp-30-days"?: RplRollingPeriod;
         "grp-90-days"?: RplRollingPeriod;
         "grp-365-days"?: RplRollingPeriod;
         avg?: number;
         med?: number;
         sum?: number;
         mth?: Record<RplMonthFormat, StatsFull>;
      };
      daysOnMarket?: {
         med?: number;
         avg?: number;
         mth?: Record<RplMonthFormat, StatsMomentCount>;
      };
      tax?: {
         med?: number;
         avg?: number;
         yr?: Record<RplYearFormat, StatsMomentCount>;
      };
      new?: {
         count?: number;
         mth?: Record<RplMonthFormat, StatsCount>;
      };
   };
   aggregates?: Record<string, unknown>;
   aggregatesUnique?: Record<string, unknown>;
}
export interface RplListingsCountResponse extends ApiResponse {
   count: number;
   lastUpdatedOn?: string | undefined;
}
export type RplListingsCountResponseArray = RplListingsCountResponse[];
export interface RplListingsSimilarRequest extends RplListingsSimilarDto, ApiRequest {}
export interface RplListingsSimilarResponse extends ApiResponse {
   similar: Array<Partial<RplListingsSingle>>;
}
export interface RplListingsSingleRequest extends RplListingsSingleDto, ApiRequest {}
export interface RplListingsSingleResponse extends ApiResponse, RplListingsSingle {}

/**
 * One record of a property's history. Unlike the `history` nested in a listing detail,
 * these carry their own `boardId` and `permissions` — the endpoint spans boards.
 */
export interface RplListingsHistoryItem extends Record<string, unknown> {
   mlsNumber: string;
   boardId?: number;
   status?: RplStatus;
   lastStatus?: string;
   listDate?: string;
   /** `listingEntryDate` is the sort key; the rest of the block passes through. */
   timestamps?: {
      listingEntryDate?: string | null;
      [key: string]: unknown;
   };
   permissions?: RplListingPermissions;
}

/**
 * Repliers wraps the records in the property's identity (address, coordinates, beds,
 * baths…); only `history` is proxied further.
 */
export interface RplListingsHistoryResponse extends ApiResponse {
   history: RplListingsHistoryItem[];
}
export interface RplListingsLocationsRequest extends Omit<RplListingsLocationsDto, "dropCoordinates">, ApiRequest {}
export interface RplLatLong {
   lat: number;
   lng: number;
}
export type RplLocationCoordinates = Array<Array<[number, number]>> | null;
export interface RplNeighborhood {
   name: string;
   activeCount: number;
   location: RplLocation;
   coordinates?: RplLocationCoordinates;
}
export interface RplCity {
   name: string;
   activeCount: number;
   location: RplLocation;
   coordinates?: RplLocationCoordinates;
   neighborhoods: Array<RplNeighborhood>;
}
export interface RplArea {
   name: string;
   cities: Array<RplCity>;
}
export interface RplLocationClass<Name> {
   name: Name;
   areas: Array<RplArea>;
}
export interface RplMap {
   latitude: string;
   longitude: string;
   point: string;
}
export interface RplListingsLocationsResponse extends ApiResponse {
   boards: [{
      boardId: number;
      name: string;
      updatedOn: string;
      classes: [RplLocationClass<"condo">, RplLocationClass<"residential">];
   }];
}
export interface RplNlpResponse extends ApiResponse {
   request: {
      url?: string;
      params?: Record<string, string | string[]>;
      body?: {
         imageSearchItems?: Array<{
            type?: string;
            value?: string;
            boost?: string;
         }>;
         [key: string]: unknown;
      };
      summary?: string;
      locations?: Array<RplLocation>;
      count?: number;
      statistics?: RplListingsSearchResponse["statistics"];
      aggregates?: Record<string, unknown> | undefined;
   };
   nlpId: string;
}
export const rplListingClassToRplClassMapper = {
   [RplListingClass.CondoProperty]: RplClass.condo,
   [RplListingClass.ResidentialProperty]: RplClass.residential,
   [RplListingClass.CommercialProperty]: RplClass.commercial
};
@injectable()
export default class RepliersListings extends RepliersBase {
   public async search(params: RplListingsSearchRequest, usePost = false) {
      const {
         body = {},
         ...query
      } = params;
      query.displayInternetEntireListing = RplYesNo.Y;

      // `standardStatus` and `mlsNumber` filters both live at the top level and
      // inside `body.queries[]`.
      const allowedStandardStatuses = this.config.settings.allowedListingsStandardStatuses;
      constrainStandardStatus(query, allowedStandardStatuses);
      for (const nestedQuery of body.queries ?? []) {
         constrainStandardStatus(nestedQuery, allowedStandardStatuses);
      }
      const prefix = this.config.settings.mlsNumberPrefix;
      addMlsNumbers(query, prefix);
      addMlsNumbers(body, prefix);
      excludeRestrictedListings(query, body, this.config.settings.restrictedListings, {
         prefix,
         usePost
      });
      const result = await this.request<RplListingsSearchResponse>(usePost ? "POST" : "GET", "/listings", query, body);
      return stripMlsNumbers(result, prefix);
   }
   public async similar(params: RplListingsSimilarRequest) {
      const {
         mlsNumber,
         ...otherParams
      } = params;
      const prefix = this.config.settings.mlsNumberPrefix;
      const result = await this.request<RplListingsSimilarResponse>("GET", `/listings/${addMlsPrefix(mlsNumber, prefix)}/similar`, otherParams);
      return stripMlsNumbers(result, prefix);
   }
   public locations(params: RplListingsLocationsRequest) {
      return this.request<RplListingsLocationsResponse>("GET", `/listings/locations`, params);
   }
   public async single(params: RplListingsSingleDto) {
      const {
         mlsNumber,
         ...otherParams
      } = params;
      const prefix = this.config.settings.mlsNumberPrefix;
      const result = await this.request<RplListingsSingleResponse>("GET", `/listings/${addMlsPrefix(mlsNumber, prefix)}`, otherParams);
      return stripMlsNumbers(result, prefix);
   }
   public async history(params: {
      mlsNumber: string;
   }) {
      const prefix = this.config.settings.mlsNumberPrefix;
      const result = await this.request<RplListingsHistoryResponse>("GET", "/listings/history", {
         mlsNumber: addMlsPrefix(params.mlsNumber, prefix)
      });
      return stripMlsNumbers(result, prefix);
   }

   // Maybe extract to a separate service?
   public nlp(params: RplNlpDto) {
      const {
         nlpVersion,
         ...bodyParams
      } = params;
      return this.request<RplNlpResponse>("POST", `/nlp`, {
         nlpVersion
      }, {
         ...bodyParams
      });
   }
}