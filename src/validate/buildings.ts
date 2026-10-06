import joi from "joi";
import { RplBuildingsSortBy, RplClass, RplType, RplYesNo } from "../types/repliers.ts";
import { rplBuildingsSortBySchema, rplClassSchema, rplMapFlexibleSchema, rplMapSchema, rplTypeSchema, rplYesNoSchema, stringArraySchema } from "./common.js";
export interface RplBuildingsDto extends Record<string, unknown> {
   pageNum?: number;
   resultsPerPage?: number;
   city?: string[];
   neighborhood?: string[];
   map?: [number, number][][];
   class?: RplClass[];
   minPrice?: number;
   maxPrice?: number;
   minBedrooms?: number;
   minBathrooms?: number;
   propertyType?: string[];
   type?: RplType[];
   area?: string[];
   buildingName?: string[];
   streetName?: string[];
   streetNumber?: string[];
   sortBy?: RplBuildingsSortBy;
   displayPublic?: RplYesNo;
   radius?: number;
   lat?: string;
   long?: string;
   minStories?: number;
   maxStories?: number;
   body?: {
      map?: [number, number][][];
   };
}
export interface BuildingsSingleDto {
   addressKey: string;
}
export const buildingsSingleSchema = joi.object<BuildingsSingleDto>().keys({
   addressKey: joi.string().max(255).required()
});
export const buildingsSchema = joi.object<RplBuildingsDto>().keys({
   pageNum: joi.number().positive().integer(),
   resultsPerPage: joi.number().positive().integer(),
   city: stringArraySchema,
   neighborhood: stringArraySchema,
   map: rplMapFlexibleSchema,
   class: rplClassSchema,
   minPrice: joi.number().positive().integer(),
   maxPrice: joi.number().positive().integer(),
   minBedrooms: joi.number().positive().integer(),
   minBathrooms: joi.number().positive().integer(),
   propertyType: stringArraySchema,
   type: rplTypeSchema,
   area: stringArraySchema,
   buildingName: stringArraySchema,
   streetName: stringArraySchema,
   streetNumber: stringArraySchema,
   sortBy: rplBuildingsSortBySchema,
   displayPublic: rplYesNoSchema,
   radius: joi.number().positive(),
   lat: joi.string(),
   long: joi.string(),
   minStories: joi.number().positive().integer(),
   maxStories: joi.number().positive().integer(),
   body: joi.object().keys({
      map: rplMapSchema
   })
}).with("radius", ["long", "lat"]);