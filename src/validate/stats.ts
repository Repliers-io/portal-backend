import joi from "joi";
import { RplClass } from "../types/repliers.js";
import { rplClassSchema, rplMapFlexibleSchema } from "./common.js";
import communities from "../services/stats/communities.js";
import config from "../config.js";
import _ from "lodash";
import { listingBodySchema, listingSearchSchemaKeys, type RplListingsSearchDto } from "./listings.js";
export const statsWidgetsSchema = joi.object<StatsWidgetsDto>().keys({
   map: rplMapFlexibleSchema,
   class: joi.alternatives(joi.array().items(joi.string().valid(...Object.values(RplClass)).required()).single(), joi.string().custom((value, helpers) => {
      if (value === "all") {
         return [RplClass.condo, RplClass.residential];
      } else {
         return helpers.error("Invalid value for class");
      }
   })),
   area: joi.array().items(joi.string().max(100)).single(),
   city: joi.array().items(joi.string().max(100)).single(),
   neighborhood: joi.array().items(joi.string().max(100)).single(),
   district: joi.array().items(joi.string().max(100)).single(),
   community: joi.string().valid(...Object.keys(communities)),
   historyMonthsCount: joi.number().default(3).max(12)
});
export interface StatsWidgetsDto {
   map: [number, number][][];
   class: RplClass[];
   area: string[];
   city: string[];
   neighborhood: string[];
   district: string[];
   community: string;
   historyMonthsCount: number;
}
export const statsNeighborhoodsrankingSchema = joi.object<StatsNeighborhoodsrankingDto>().keys({
   // city: joi.string().required(),
   class: rplClassSchema.required(),
   limit: joi.number().default(config.app.stats_top_n),
   sorting: joi.string().valid("gainLowToHigh", "gainHighToLow", "avgHighToLow", "avgLowToHigh").default("gainHighToLow") // @see StatsNeighborhoodsrankingDto.sorting
});
export interface StatsNeighborhoodsrankingDto {
   // city: string;
   class: RplClass[];
   limit: number;
   sorting: "gainLowToHigh" | "gainHighToLow" | "avgHighToLow" | "avgLowToHigh";
}
export const statsCommunitiesSchema = joi.object<StatsCommunitiesDto>().keys({
   districtId: joi.number()
});
export interface StatsCommunitiesDto {
   districtId?: number;
}

// A cached, aggregates-only twin of /listings/search: same filters, statistics and groupings,
// `listings` pinned to false so the response never carries per-user data.
export const statsGraphSchema = joi.object<StatsGraphDto>().keys({
   ..._.omit(listingSearchSchemaKeys, "app_state", "listings"),
   listings: joi.boolean().valid(false).default(false),
   body: listingBodySchema
}).pattern(/^raw\./, joi.alternatives().try(joi.string(), joi.array().items(joi.string()))).with("radius", ["long", "lat"]);
export type StatsGraphDto = Omit<RplListingsSearchDto, "app_state" | "listings"> & {
   listings: false;
};