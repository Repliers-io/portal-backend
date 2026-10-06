import { container, inject, injectable } from "tsyringe";
import RepliersService from "./repliers.js";
import type { RplListingsCountArrayDto, RplListingsCountDto, RplListingsDto, RplListingsHistoryDto, RplListingsLocationsDto, RplListingsSearchDto, RplListingsSimilarDto, RplListingsSingleDto, RplNlpDto } from "../validate/listings.js";
import { RplArea, RplCity, RplListingsCountResponse, RplListingsCountResponseArray, RplListingsLocationsResponse, RplListingsSingleResponse, RplNeighborhood, type RplListingsHistoryItem } from "./repliers/listings.js";
import { RplClass, RplSortBy, RplYesNo } from "../types/repliers.js";
import _debug from "debug";
import cached, { Cached } from "../lib/decorators/cached.js";
import { type AppConfig } from "../config.js";
import { permissionsFromLastStatus, scrubbed } from "./scrubber/listings.js";
import { withRequiredFields } from "../lib/utils.js";
import { dropRestricted } from "./listings/listingHelpers.ts";
import { ApiError } from "../lib/errors.js";
const config = container.resolve<AppConfig>("config");
const debug = _debug("repliers:services:listings");

// Identity fields the scrubber and downstream consumers key on. Requested on
// both `fields` and `clusterFields` so cluster-inlined listings carry them.
const requiredIdentityFields = ["status", "permissions", "address", "duplicates", "boardId"];

// HELPERS
/**
 * @deprecated Listing Location HELPERS are deprecated in favor of the GET /locations.
 */
const allowedAreas = (areas: RplArea[]) => config.settings.locations.allow_all_areas ? areas : areas.filter(area => config.settings.locations.allowed_areas.includes((area.name ?? "").toLowerCase()));

/**
 * @deprecated Listing Location HELPERS are deprecated in favor of the GET /locations.
 */
const locationClassIdx = (locations: RplListingsLocationsResponse, rplClass: RplClass) => locations.boards[0].classes.findIndex(cls => cls.name === rplClass);

/**
 * @deprecated Listing Location HELPERS are deprecated in favor of the GET /locations.
 */
const locationAreas = (locations: RplListingsLocationsResponse, rplClass: RplClass) => locations.boards[0].classes[locationClassIdx(locations, rplClass)]!.areas;
export function urlToParams(url: string): Record<string, string | string[]> {
   const urlParams = new URL(url).searchParams;

   // Convert URLSearchParams to object, handling multiple values for the same key
   const paramsObj: Record<string, string | string[]> = {};
   urlParams.forEach((value, key) => {
      const allValues = urlParams.getAll(key);
      paramsObj[key] = allValues.length > 1 ? allValues : value;
   });
   return paramsObj;
}
export const servable = (item: RplListingsHistoryItem): boolean => typeof item.boardId === "number" && item.permissions?.displayInternetEntireListing !== RplYesNo.N;
export const withPermissions = (item: RplListingsHistoryItem): RplListingsHistoryItem => ({
   ...item,
   permissions: item.permissions ?? permissionsFromLastStatus(item)
});
@injectable()
export default class ListingsService {
   constructor(private repliers: RepliersService, @inject("config")
   private config: AppConfig) {}
   private ensureRequiredFields<T extends {
      fields?: string;
      clusterFields?: string;
   }>(params: T): T {
      params.fields = withRequiredFields(params.fields, requiredIdentityFields);
      if (params.clusterFields !== undefined) {
         params.clusterFields = withRequiredFields(params.clusterFields, requiredIdentityFields);
      }
      return params;
   }
   @scrubbed("listings")
   async search(params: RplListingsSearchDto) {
      const {
         app_state,
         ...rplParams
      } = params;
      this.ensureRequiredFields(rplParams);
      return this.repliers.listings.search({
         ...rplParams
      }, true);
   }
   @cached("listings:count", config.cache.listingscount.ttl_ms)
   async count(params: RplListingsCountDto): Promise<RplListingsCountResponse | Cached<RplListingsCountResponse>> {
      let rplParams: RplListingsDto = this.ensureRequiredFields(params);
      rplParams.sortBy = RplSortBy.updatedOnDesc;
      rplParams.fields = "timestamps.repliersUpdatedOn";
      const res = await this.repliers.listings.search({
         ...rplParams
      }, true);
      const response: RplListingsCountResponse = {
         count: res.count ?? 0,
         lastUpdatedOn: res.listings?.[0]?.timestamps?.repliersUpdatedOn ?? undefined
      };
      return response;
   }
   async countArray(paramsArray: RplListingsCountArrayDto): Promise<RplListingsCountResponseArray> {
      const requests = paramsArray.map(params => this.count(params));
      return (await Promise.all(requests)).map(i => i.result as RplListingsCountResponse);
   }
   @scrubbed("similar")
   async similar(params: RplListingsSimilarDto) {
      this.ensureRequiredFields(params);
      const {
         similar,
         ...rest
      } = await this.repliers.listings.similar({
         ...params
      });
      return {
         ...rest,
         similar: dropRestricted(similar, this.config.settings.restrictedListings)
      };
   }
   @scrubbed()
   async single(params: RplListingsSingleDto) {
      const listing = await this.repliers.listings.single({
         ...params
      });
      this.validateAvailability(listing);
      return listing;
   }

   /**
    * Cross-board history of the property behind `mlsNumber`. Each record is scrubbed on
    * its own merits — there is no parent listing to inherit permissions or a board from.
    * Records arrive in Repliers' own order, repeated per board for a syndicated listing,
    * and are passed through that way; see `docs/architecture/listings-history.md`.
    */
   @scrubbed("history")
   async history(params: RplListingsHistoryDto) {
      const {
         mlsNumber
      } = params;
      const history = (await this.repliers.listings.history({
         mlsNumber
      })).history ?? [];
      const eligible = dropRestricted(history.filter(servable), this.config.settings.restrictedListings);
      return {
         history: eligible.map(withPermissions)
      };
   }
   private validateAvailability(listing: RplListingsSingleResponse) {
      const statusCode = this.config.settings.hide_unavailable_listings_http_code;
      if (this.config.settings.restrictedListings.includes(listing.mlsNumber)) {
         debug(`[ListingsService: single]: %0 is restricted and cannot be returned.`, listing.mlsNumber);
         throw new ApiError(`Not found. Restricted listing`, statusCode);
      }
      if (listing.permissions?.displayInternetEntireListing === RplYesNo.N) {
         debug(`[ListingsService: single]: %0 has status displayInternetEntireListing === N and cannot be returned.`, listing.mlsNumber);
         throw new ApiError(`Not found. displayInternetEntireListing === N`, statusCode);
      }
      this.validateHiddenStatus(this.config.settings.hide_unavailable_listings_statuses, listing.lastStatus, statusCode, listing);
      this.validateHiddenStatus(this.config.settings.hide_unavailable_listings_standard_statuses, listing.standardStatus, statusCode, listing);
   }
   private validateHiddenStatus(hiddenStatuses: string[], listingStatus: string, statusCode: number, listing: RplListingsSingleResponse) {
      if (hiddenStatuses.includes(listingStatus)) {
         debug(`[ListingsService: single]: %0 has status %1 and cannot be returned. HiddenStatuses are %2`, listing.mlsNumber, listingStatus, hiddenStatuses);
         throw new ApiError(`Not found. ${listingStatus}`, statusCode);
      }
   }

   /**
    * @deprecated This method is deprecated in favor of the GET /locations.
    */
   private areaExist(area_name: string, residentalAreas: RplArea[]) {
      return residentalAreas.find(area => area.name === area_name);
   }

   /**
    * @deprecated This method is deprecated in favor of the GET /locations.
    */
   private cityExist(area_name: string, city_name: string, residentalAreas: RplArea[]) {
      const areaIdx = residentalAreas.findIndex(area => area.name === area_name);
      return residentalAreas[areaIdx]?.cities.find(city => city.name === city_name);
   }

   /**
    * @deprecated This method is deprecated in favor of the GET /locations.
    */
   private neighborhoodExist(area_name: string, city_name: string, neighborhood_name: string, residentalAreas: RplArea[]) {
      const area = residentalAreas.find(area => area.name === area_name);
      const city = area?.cities.find(city => city.name === city_name);
      return city?.neighborhoods.find(neighborhood => neighborhood.name === neighborhood_name);
   }

   /**
    * @deprecated This method is deprecated in favor of the GET /locations.
    */
   private copyArea(area: RplArea, residentalAreas: RplArea[]) {
      residentalAreas.push(area);
   }

   /**
    * @deprecated This method is deprecated in favor of the GET /locations.
    */
   private copyCity(area_name: string, city: RplCity, residentalAreas: RplArea[]) {
      const areaIdx = residentalAreas.findIndex(area => area.name === area_name);
      residentalAreas[areaIdx]?.cities.push(city);
   }

   /**
    * @deprecated This method is deprecated in favor of the GET /locations.
    */
   private copyNeighborhood(area_name: string, city_name: string, neighborhood: RplNeighborhood, residentalAreas: RplArea[]) {
      const areaIdx = residentalAreas.findIndex(area => area.name === area_name);
      if (areaIdx === undefined) {
         return;
      }
      const cityIdx = residentalAreas[areaIdx]?.cities.findIndex(city => city.name === city_name);
      if (cityIdx === undefined) {
         return;
      }
      neighborhood.coordinates = null;
      debug("Copy neighborhood, area: %s, city: %s, neighborhood: %o ", area_name, city_name, neighborhood);
      residentalAreas[areaIdx]?.cities[cityIdx]?.neighborhoods.push(neighborhood);
   }

   // by ref
   /**
    * @deprecated This method is deprecated in favor of the GET /locations.
    */
   private removeEmptyNeighborhoods(neighborhoods: Array<RplNeighborhood>, limit: number = 0) {
      for (let hoodIdx = 0; hoodIdx < neighborhoods.length; hoodIdx++) {
         const hood = neighborhoods[hoodIdx]!;
         if (hood.activeCount <= limit) {
            debug("removing hood: %s", hood.name);
            neighborhoods.splice(hoodIdx, 1);
            hoodIdx -= 1;
         }
      }
   }

   /**
    * @deprecated This method is deprecated in favor of the GET /locations.
    */
   private removeEmptyCities(cities: Array<RplCity>, limit: number = 0) {
      for (let cityIdx = 0; cityIdx < cities.length; cityIdx++) {
         const city = cities[cityIdx]!;
         if (city.activeCount <= limit) {
            // debug("removing city: %s", city.name);
            cities.splice(cityIdx, 1);
            cityIdx -= 1;
            continue;
         }
         this.removeEmptyNeighborhoods(city.neighborhoods, limit);

         // Drop city based only if it had only activeCount === 0 hoods
         if (limit === 0) {
            if (0 == city.neighborhoods.length) {
               cities.splice(cityIdx, 1);
               cityIdx -= 1;
            }
         }
      }
   }

   // by ref
   /**
    * @deprecated This method is deprecated in favor of the GET /locations.
    */
   private removeEmptyLocations(locations: RplListingsLocationsResponse, limit: number = 0) {
      const residentalIdx = locations.boards[0].classes.findIndex(cls => cls.name === RplClass.residential);
      const residentalAreas = locations.boards[0].classes[residentalIdx]!.areas;
      for (let areaIdx = 0; areaIdx < residentalAreas.length; areaIdx++) {
         const area = residentalAreas[areaIdx]!;
         this.removeEmptyCities(area.cities, limit);
         if (0 == area.cities.length) {
            residentalAreas.splice(areaIdx, 1);
            areaIdx -= 1;
         }
      }
   }

   // by ref
   /**
    * @deprecated This method is deprecated in favor of the GET /locations.
    */
   private removeCoordinates(locations: RplListingsLocationsResponse) {
      const residentalAreas = locationAreas(locations, RplClass.residential);
      for (let areaIdx = 0; areaIdx < residentalAreas.length; areaIdx++) {
         const area = residentalAreas[areaIdx]!;
         if (area.cities.length === 0) continue;
         for (let cityIdx = 0; cityIdx < area.cities.length; cityIdx++) {
            const city = area.cities[cityIdx]!;
            city.coordinates = null;
            if (city.neighborhoods.length === 0) continue;
            for (let hoodIdx = 0; hoodIdx < city.neighborhoods.length; hoodIdx++) {
               const hood = city.neighborhoods[hoodIdx]!;
               hood.coordinates = null;
            }
         }
      }
   }

   // by ref
   /**
    * @deprecated This method is deprecated in favor of the GET /locations.
    */
   private removeExtraBoards(locations: RplListingsLocationsResponse) {
      const boards = locations.boards;
      for (let boardIdx = 0; boardIdx < boards.length; boardIdx++) {
         if (boards[boardIdx]!.boardId !== config.settings.locations.boardId) {
            boards.splice(boardIdx, 1);
            boardIdx -= 1;
         }
      }
   }

   // by ref
   /**
    * @deprecated This method is deprecated in favor of the GET /locations.
    */
   private removeExtraAreas(locations: RplListingsLocationsResponse, cls: number) {
      if (config.settings.locations.allow_all_areas) return;
      const areas = locations.boards[0].classes[cls]!.areas;
      for (let areaIdx = 0; areaIdx < areas.length; areaIdx++) {
         const area = areas[areaIdx]!;
         if (!config.settings.locations.allowed_areas.includes((area.name ?? "").toLowerCase())) {
            areas.splice(areaIdx, 1);
            areaIdx -= 1;
         }
      }
   }

   /**
    * @deprecated This method is deprecated in favor of the GET /locations.
    */
   @cached("listings:autosuggest:locations", config.cache.statswidget.ttl_ms)
   async locations(params: RplListingsLocationsDto): Promise<RplListingsLocationsResponse | Cached<RplListingsLocationsResponse>> {
      const {
         dropCoordinates,
         ...repliersParams
      } = params;
      const locations = await this.repliers.listings.locations({
         ...repliersParams
      });
      if (!locations.boards.length) {
         return locations;
      }
      this.removeExtraBoards(locations);

      // by ref
      const allCondoAreas = -1 < locationClassIdx(locations, RplClass.condo) ? locationAreas(locations, RplClass.condo) : [];
      const allResidentalAreas = -1 < locationClassIdx(locations, RplClass.residential) ? locationAreas(locations, RplClass.residential) : [];
      if (!allCondoAreas.length || !allResidentalAreas.length) {
         return locations;
      }
      const condoAreas = allowedAreas(allCondoAreas);
      const residentalAreas = allowedAreas(allResidentalAreas);
      for (const area of condoAreas) {
         if (this.areaExist(area.name, residentalAreas)) {
            debug("Area exist: %s", area.name);
            for (const city of area.cities) {
               if (this.cityExist(area.name, city.name, residentalAreas)) {
                  debug("City exist: %s, area: %s", city.name, area.name);
                  for (const neighborhood of city.neighborhoods) {
                     if (!this.neighborhoodExist(area.name, city.name, neighborhood.name, residentalAreas)) {
                        this.copyNeighborhood(area.name, city.name, neighborhood, residentalAreas);
                     }
                  }
               } else {
                  debug("City not exist: %s, area: %s", city.name, area.name);
                  this.copyCity(area.name, city, residentalAreas);
               }
            }
         } else {
            debug("Area not exist: %s", area.name);
            this.copyArea(area, residentalAreas);
         }
      }

      // drop condos class
      if (-1 < locationClassIdx(locations, RplClass.condo)) {
         locations.boards[0].classes.splice(locationClassIdx(locations, RplClass.condo), 1);
      }

      // drop extra areas

      if (-1 < locationClassIdx(locations, RplClass.residential)) {
         this.removeExtraAreas(locations, locationClassIdx(locations, RplClass.residential));
      }
      this.removeEmptyLocations(locations, params.activeCountLimit);
      if (dropCoordinates) {
         this.removeCoordinates(locations);
      }
      return locations;
   }
   async nlp(params: RplNlpDto) {
      const result = await this.repliers.listings.nlp({
         ...params,
         nlpVersion: config.settings.nlp.version
      });
      if (result?.request?.url) {
         result.request.params = urlToParams(result.request.url);
         delete result.request.url;
      }
      if (result.request?.body?.imageSearchItems) {
         for (const item of result.request?.body?.imageSearchItems) {
            if (!item.boost) {
               item.boost = "1";
            }
         }
      }
      if (result?.request?.params && (params?.statistics || params?.aggregates)) {
         const searchParams = {
            app_state: params.app_state,
            ...result.request.params,
            listings: false,
            statistics: params?.statistics,
            aggregates: params?.aggregates
         } as RplListingsSearchDto;
         const listingRes = await this.search(searchParams);
         result.request.count = listingRes?.count;
         result.request.statistics = listingRes?.statistics;
         result.request.aggregates = listingRes?.aggregates;
      }
      return result;
   }
}