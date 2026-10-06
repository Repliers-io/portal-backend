import joi from "joi";
import { RplAggregates, RplClass, RplDateFormat, RplLastPriceChangeType, RplLastPriceChangeTypeValues, RplLastStatus, RplOperator, RplSimilarSortBy, RplSortBy, RplStandardStatus, RplStandardStatusValues, RplStatus, RplType, RplYesNo } from "../types/repliers.js";
import { appStateSchema, csvFieldValidator, dateSchema, mlsNumberSchema, rplClassSchema, rplLastStatusSchema, rplMapFlexibleSchema, rplMapSchema, rplOperatorExtendedSchema, rplOperatorSchema, rplSortBySchema, rplStatisticsSchema, rplStatusSchema, rplTypeSchema, rplYesNoSchema, stringArraySchema } from "./common.js";
import config from "../config.js";
import _ from "lodash";
import { RplLocationSource, RplLocationSourceValues, RplLocationsType, RplLocationsTypeValues } from "../services/repliers/locations.js";
export interface RplListingsAppState {
   user: Record<string, unknown>;
}
export interface RplListingsSearchDto {
   activeMaxListDate?: RplDateFormat;
   activeMinListDate?: RplDateFormat;
   addressKey?: string | string[];
   agent?: string[];
   agentId?: string[];
   aggregates?: RplAggregates[];
   aggregatesListPriceLeaseBucketSize?: number;
   aggregatesListPriceSaleBucketSize?: number;
   aggregatesUnique?: RplAggregates[];
   aggregateStatistics?: boolean;
   amenities?: string[];
   amenitiesOperator?: string;
   area?: string[];
   areaOrCity?: string | string[];
   balcony?: string[];
   basement?: string[];
   bathroomQuality?: string | string[];
   bedroomQuality?: string | string[];
   boardId?: number[];
   boardAgentId?: string[];
   brokerage?: string[];
   businessSubType?: string[];
   businessType?: string[];
   city?: string[];
   cityOrDistrict?: string | string[];
   class?: RplClass[];
   cluster?: boolean;
   clusterFields?: string;
   clusterLimit?: number;
   clusterListingsThreshold?: number;
   clusterPrecision?: number;
   clusterStatistics?: boolean;
   cooling?: string;
   coverImage?: string;
   createdOn?: RplDateFormat;
   den?: string;
   diningRoomQuality?: string | string[];
   displayAddressOnInternet?: RplYesNo;
   displayInternetEntireListing?: RplYesNo;
   displayPublic?: RplYesNo;
   district?: number[] | string[];
   driveway?: string[];
   exteriorConstruction?: string[];
   fields?: string;
   frontOfStructureQuality?: string | string[];
   fuzzySearch?: boolean;
   garage?: string[];
   hasAgents?: boolean;
   hasImages?: boolean;
   heating?: string[];
   imagesOrder?: "score" | "original";
   kitchenQuality?: string | string[];
   lastPriceChangeType?: RplLastPriceChangeType;
   lastStatus?: RplLastStatus[];
   lat?: string;
   livingRoomQuality?: string | string[];
   listDate?: RplDateFormat;
   listings?: boolean;
   locationId?: string[];
   locker?: string[];
   long?: string;
   map?: [number, number][][];
   mapOperator?: RplOperator;
   maxBaths?: number;
   maxBathrooms?: number;
   maxBeds?: number;
   maxBedrooms?: number;
   maxBedroomsPlus?: number;
   maxBedroomsTotal?: number;
   maxBedsPlus?: number;
   maxCoveredSpaces?: number;
   maxDaysOnMarket?: number;
   maxEstimate?: number;
   maxKitchens?: number;
   maxListDate?: string;
   maxLotSizeSqft?: number;
   maxLotWidth?: number;
   maxMaintenanceFee?: number;
   maxOpenHouseDate?: RplDateFormat;
   maxParkingSpaces?: number;
   maxPrice?: number;
   maxPriceChangeDateTime?: RplDateFormat;
   maxQuality?: number;
   maxRepliersUpdatedOn?: RplDateFormat;
   maxClosedDate?: RplDateFormat;
   maxSoldDate?: RplDateFormat;
   maxSoldPrice?: number;
   maxSqft?: number;
   maxStories?: number;
   maxStreetNumber?: string | string[];
   maxTaxes?: number;
   maxUnavailableDate?: RplDateFormat;
   maxUpdatedOn?: RplDateFormat;
   maxYearBuilt?: number;
   minBaths?: number;
   minBathrooms?: number;
   minBeds?: number;
   minBedrooms?: number;
   minBedroomsPlus?: number;
   minBedroomsTotal?: number;
   minBedsPlus?: number;
   minCoveredSpaces?: number;
   minDaysOnMarket?: number;
   minEstimate?: number;
   minGarageSpaces?: number;
   minKitchens?: number;
   minListDate?: RplDateFormat;
   minLotSizeSqft?: number;
   minLotWidth?: number;
   minOpenHouseDate?: RplDateFormat;
   minParkingSpaces?: number;
   minPrice?: number;
   minPriceChangeDateTime?: RplDateFormat;
   minQuality?: number;
   minRepliersUpdatedOn?: RplDateFormat;
   minClosedDate?: RplDateFormat;
   minSoldDate?: RplDateFormat;
   minSoldPrice?: number; // string in docs
   minSqft?: number;
   minStories?: number;
   minStreetNumber?: string | string[];
   minUnavailableDate?: RplDateFormat;
   minUpdatedOn?: RplDateFormat;
   minYearBuilt?: RplDateFormat;
   mlsNumber?: string[];
   neighborhood?: string[];
   officeId?: string;
   openHouseStatus?: string | string[];
   openHouseType?: string | string[];
   operator?: string | string[];
   overallQuality?: string | string[];
   pageNum?: number;
   parkingType?: string | string[];
   pets?: string | string[];
   propertySubType?: string | string[];
   propertyType?: string;
   propertyTypeOrStyle?: string | string[];
   radius?: number;
   resultsPerPage?: number;
   search?: string;
   searchFields?: string;
   searchOperator?: string;
   sortBy?: RplSortBy;
   sqft?: string[];
   standardStatus?: RplStandardStatus | RplStandardStatus[];
   statistics?: string;
   status?: RplStatus[];
   streetDirection?: string | string[];
   streetName?: string | string[];
   streetNumber?: string | string[];
   style?: string[];
   swimmingPool?: string[];
   type?: RplType[];
   unitNumber?: string | string[];
   updatedOn?: RplDateFormat;
   waterSource?: string[];
   repliersUpdatedOn?: RplDateFormat;
   sewer?: string[];
   state?: string;
   streetSuffix?: string | string[];
   waterfront?: RplYesNo;
   yearBuilt?: string[];
   zip?: string | string[];
   zoning?: string;
   body?: {
      imageSearchItems?: RplImageSearchItem[];
      map?: [number, number][][];
      queries?: RplListingsQuery[];
   };
   app_state: RplListingsAppState;
   [key: `raw.${string}`]: string | string[] | undefined;
}
export interface RplListingsDto extends Omit<RplListingsSearchDto, "app_state"> {}
export type RplListingsQuery = Omit<RplListingsDto, "body">;
const listingsCountOmittedFields = ["fields", "app_state", "listings", "resultsPerPage", "pageNum", "sortBy"];
export interface RplListingsCountDto extends Omit<RplListingsSearchDto, typeof listingsCountOmittedFields[number]> {}
export type RplListingsCountArrayDto = RplListingsCountDto[];
const listingSearchSchemaKeys = {
   app_state: appStateSchema,
   activeMaxListDate: dateSchema,
   activeMinListDate: dateSchema,
   addressKey: stringArraySchema,
   agent: stringArraySchema,
   agentId: stringArraySchema,
   aggregates: joi.string().max(1024),
   aggregatesListPriceLeaseBucketSize: joi.number().positive().integer(),
   aggregatesListPriceSaleBucketSize: joi.number().positive().integer(),
   aggregatesUnique: joi.string().max(1024),
   aggregateStatistics: joi.boolean(),
   amenities: stringArraySchema,
   amenitiesOperator: joi.string().max(16),
   area: stringArraySchema,
   areaOrCity: stringArraySchema,
   balcony: stringArraySchema,
   basement: stringArraySchema,
   bathroomQuality: stringArraySchema,
   bedroomQuality: stringArraySchema,
   boardAgentId: stringArraySchema,
   boardId: joi.array().items(joi.number()).single().default(config.settings.defaults.boardId),
   brokerage: joi.array().items(joi.string().max(70)).single(),
   businessSubType: stringArraySchema,
   businessType: stringArraySchema,
   city: stringArraySchema,
   cityOrDistrict: stringArraySchema,
   class: rplClassSchema,
   cluster: joi.boolean(),
   clusterFields: joi.string().max(512),
   clusterLimit: joi.when("aggregates", {
      is: joi.string().valid(RplAggregates.map).required(),
      then: joi.number().min(1).max(200).optional(),
      otherwise: joi.forbidden()
   }),
   clusterListingsThreshold: joi.number().positive().integer(),
   clusterPrecision: joi.when("aggregates", {
      is: joi.string().valid(RplAggregates.map).required(),
      then: joi.number().min(1).max(29).optional(),
      otherwise: joi.forbidden()
   }),
   clusterStatistics: joi.boolean(),
   coverImage: joi.string().max(20),
   cooling: joi.string().max(20),
   createdOn: dateSchema,
   den: joi.string().max(20),
   displayAddressOnInternet: rplYesNoSchema,
   displayInternetEntireListing: rplYesNoSchema,
   displayPublic: rplYesNoSchema,
   district: joi.array().items(joi.number().integer()).single(),
   diningRoomQuality: stringArraySchema,
   driveway: stringArraySchema,
   exteriorConstruction: stringArraySchema,
   fields: joi.string().max(512),
   frontOfStructureQuality: stringArraySchema,
   fuzzySearch: joi.boolean(),
   garage: stringArraySchema,
   hasAgents: joi.bool(),
   hasImages: joi.bool(),
   heating: stringArraySchema,
   imagesOrder: joi.string().valid("score", "original"),
   kitchenQuality: stringArraySchema,
   lastPriceChangeType: joi.string().valid(...RplLastPriceChangeTypeValues),
   lastStatus: rplLastStatusSchema,
   lat: joi.string(),
   listDate: dateSchema,
   listings: joi.bool(),
   livingRoomQuality: stringArraySchema,
   locationId: stringArraySchema,
   locker: stringArraySchema,
   long: joi.string(),
   map: rplMapFlexibleSchema,
   mapOperator: rplOperatorSchema,
   maxBaths: joi.number().positive().integer(),
   maxBathrooms: joi.number().positive().integer(),
   maxBeds: joi.number().positive().integer(),
   maxBedrooms: joi.number().positive().integer(),
   maxBedroomsPlus: joi.number().positive().integer(),
   maxBedroomsTotal: joi.number().positive().integer(),
   maxBedsPlus: joi.number().positive().integer(),
   maxCoveredSpaces: joi.number().positive().integer(),
   maxDaysOnMarket: joi.number().integer().min(0),
   maxEstimate: joi.number().positive().integer(),
   maxKitchens: joi.number().positive().integer(),
   maxListDate: dateSchema,
   maxLotSizeSqft: joi.number().positive().integer(),
   maxLotWidth: joi.number().positive(),
   maxMaintenanceFee: joi.number().positive().integer(),
   maxOpenHouseDate: dateSchema,
   maxParkingSpaces: joi.number().positive().integer(),
   maxPrice: joi.number().positive().integer(),
   maxPriceChangeDateTime: dateSchema,
   maxQuality: joi.number().positive(),
   maxRepliersUpdatedOn: dateSchema,
   maxClosedDate: dateSchema,
   maxSoldDate: dateSchema,
   maxSoldPrice: joi.number().positive().integer(),
   maxSqft: joi.number().positive().integer(),
   maxStories: joi.number().positive().integer(),
   maxStreetNumber: stringArraySchema,
   maxTaxes: joi.number().positive().integer(),
   maxUnavailableDate: dateSchema,
   maxUpdatedOn: dateSchema,
   maxYearBuilt: joi.number().positive().integer(),
   minBaths: joi.number().positive().integer(),
   minBathrooms: joi.number().positive().integer(),
   minBeds: joi.number().positive().integer(),
   minBedrooms: joi.number().positive().integer(),
   minBedroomsPlus: joi.number().positive().integer(),
   minBedroomsTotal: joi.number().positive().integer(),
   minBedsPlus: joi.number().positive().integer(),
   minCoveredSpaces: joi.number().positive().integer(),
   minDaysOnMarket: joi.number().integer().min(0),
   minEstimate: joi.number().positive().integer(),
   minGarageSpaces: joi.number().positive().integer(),
   minKitchens: joi.number().positive().integer(),
   minListDate: dateSchema,
   minLotSizeSqft: joi.number().positive().integer(),
   minLotWidth: joi.number().positive(),
   minOpenHouseDate: dateSchema,
   minParkingSpaces: joi.number().positive().integer(),
   minPrice: joi.number().positive().integer(),
   minPriceChangeDateTime: dateSchema,
   minQuality: joi.number().positive().allow(0),
   minRepliersUpdatedOn: dateSchema,
   minClosedDate: dateSchema,
   minSoldDate: dateSchema,
   minSoldPrice: joi.number().positive().integer(),
   minSqft: joi.number().positive().integer(),
   minStories: joi.number().positive().integer(),
   minStreetNumber: stringArraySchema,
   minUnavailableDate: dateSchema,
   minUpdatedOn: dateSchema,
   minYearBuilt: joi.number().positive().integer(),
   mlsNumber: joi.array().items(mlsNumberSchema).single(),
   neighborhood: stringArraySchema,
   officeId: joi.string(),
   openHouseStatus: stringArraySchema,
   openHouseType: stringArraySchema,
   operator: rplOperatorExtendedSchema,
   overallQuality: stringArraySchema,
   pageNum: joi.number().positive().integer(),
   parkingType: stringArraySchema,
   pets: stringArraySchema,
   propertySubType: stringArraySchema,
   propertyType: stringArraySchema,
   propertyTypeOrStyle: stringArraySchema,
   radius: joi.number().positive(),
   resultsPerPage: joi.number().positive().integer(),
   search: joi.string(),
   searchFields: joi.string(),
   searchOperator: joi.string(),
   sortBy: rplSortBySchema,
   sqft: stringArraySchema,
   standardStatus: joi.array().items(joi.string().valid(...RplStandardStatusValues)).single(),
   statistics: rplStatisticsSchema,
   //rplStatistics,
   status: rplStatusSchema,
   streetDirection: stringArraySchema,
   streetName: stringArraySchema,
   streetNumber: stringArraySchema,
   style: stringArraySchema,
   swimmingPool: stringArraySchema,
   type: rplTypeSchema,
   unitNumber: joi.string().max(32),
   updatedOn: dateSchema,
   waterSource: stringArraySchema,
   repliersUpdatedOn: dateSchema,
   sewer: stringArraySchema,
   state: joi.string(),
   streetSuffix: stringArraySchema,
   waterfront: rplYesNoSchema,
   yearBuilt: stringArraySchema,
   ["raw.featured"]: joi.string().max(20)
};
const listingQuerySchema = joi.object<RplListingsQuery>().keys({
   ..._.omit(listingSearchSchemaKeys, "app_state"),
   boardId: joi.array().items(joi.number()).single() // no default — only the top-level request is boarded
}).pattern(/^raw\./, joi.string());
const listingBodySchema = joi.object().keys({
   imageSearchItems: joi.array().items(joi.object().keys({
      type: joi.string().required(),
      value: joi.string(),
      url: joi.string(),
      boost: joi.number().sign("positive").required()
   }).or("value", "url")).min(0),
   map: rplMapSchema,
   queries: joi.array().items(listingQuerySchema)
});
export const listingSearchSchema = joi.object<RplListingsSearchDto>().keys({
   ...listingSearchSchemaKeys,
   body: listingBodySchema
})
// several values of one raw field are OR-ed by Repliers; a lone value stays a string
// (not stringArraySchema, whose .single() would wrap it)
.pattern(/^raw\./, joi.alternatives().try(joi.string(), joi.array().items(joi.string()))).with("radius", ["long", "lat"]);
// .with("radius", "state.user"); //Example: require "radius" for authorized users;

const listingCountSchemaKeys = _.omit({
   ...listingSearchSchemaKeys,
   body: listingBodySchema
}, listingsCountOmittedFields);
export const listingCountSchema = joi.object<RplListingsCountDto>().keys(listingCountSchemaKeys);
export const listingCountArraySchema = joi.array<RplListingsCountArrayDto>().items(listingCountSchema);
export interface RplImageSearchItemBase {
   type: string;
   boost: number;
}
export interface RplImageSearchValue extends RplImageSearchItemBase {
   type: "text";
   value: string;
}
export interface RplImageSearchUrl extends RplImageSearchItemBase {
   type: "image";
   url: string;
}
export type RplImageSearchItem = RplImageSearchValue | RplImageSearchUrl;
export interface RplListingsSimilarDto {
   boardId?: number[];
   listPriceRange?: number;
   radius?: number;
   sortBy?: RplSimilarSortBy;
   mlsNumber: string;
   fields?: string;
   app_state: RplListingsAppState;
}
export const listingSimilarSchema = joi.object<RplListingsSimilarDto>().keys({
   boardId: joi.array().items(joi.number()).single().default(config.settings.defaults.boardId),
   listPriceRange: joi.number().positive().integer(),
   radius: joi.number().positive(),
   sortBy: joi.string().valid(...Object.values(RplSimilarSortBy)),
   mlsNumber: joi.string(),
   fields: joi.string(),
   app_state: appStateSchema
});
export interface RplListingsLocationsDto {
   area?: string;
   city?: string;
   neighborhood?: string;
   class: RplClass[];
   boardId?: number;
   dropCoordinates: boolean;
   activeCountLimit?: number;
}
export const listingsLocationsSchema = joi.object<RplListingsLocationsDto>().keys({
   area: joi.string(),
   city: joi.string(),
   neighborhood: joi.string(),
   class: rplClassSchema,
   boardId: joi.number(),
   dropCoordinates: joi.boolean(),
   activeCountLimit: joi.number().default(5)
});
const boardIdCount = config.settings.defaults.boardId.length;
export const listingsSingleSchema = joi.object<RplListingsSingleDto>().keys({
   mlsNumber: mlsNumberSchema.required(),
   boardId: boardIdCount > 1 ? joi.number().required() : joi.number().optional(),
   fields: csvFieldValidator(["raw", "reso"]),
   dynamicComparables: joi.boolean().default(false),
   locations: joi.boolean(),
   locationsSource: joi.array().items(joi.string().valid(...RplLocationSourceValues)).single(),
   locationsType: joi.array().items(joi.string().valid(...RplLocationsTypeValues)).single(),
   app_state: appStateSchema
});
export interface RplListingsSingleDto {
   mlsNumber: string;
   boardId?: number;
   fields?: string;
   dynamicComparables?: boolean;
   locations?: boolean;
   locationsSource?: RplLocationSource[];
   locationsType?: RplLocationsType[];
   app_state: RplListingsAppState;
}
export interface RplListingsHistoryDto {
   mlsNumber: string;
   app_state: RplListingsAppState;
}

/**
 * `GET /listings/history` resolves the property behind an MLS number and returns its
 * history across every board the account can read, so no `boardId` is accepted.
 */
export const listingsHistorySchema = joi.object<RplListingsHistoryDto>().keys({
   mlsNumber: mlsNumberSchema.required(),
   app_state: appStateSchema
});
export const nlpSchema = joi.object<RplNlpDto>().keys({
   app_state: appStateSchema,
   prompt: joi.string().required(),
   nlpId: joi.string().uuid(),
   nlpVersion: joi.string().default(config.settings.nlp.version).max(10),
   statistics: rplStatisticsSchema,
   aggregates: joi.string().max(1024)
});
export interface RplNlpDto {
   app_state: RplListingsAppState;
   prompt: string;
   nlpId?: string;
   nlpVersion: string;
   statistics?: string;
   aggregates: RplAggregates[];
}
export const listingsFeaturedSchema = joi.object<ListingsFeaturedDto>().keys({
   slug: joi.string().pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).required(),
   sortBy: rplSortBySchema,
   lat: joi.string(),
   long: joi.string()
});
export interface ListingsFeaturedDto {
   slug: string;
   sortBy?: RplSortBy;
   lat?: string;
   long?: string;
}