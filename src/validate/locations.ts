import joi from "joi";
import { RplLocationsAutocompleteRequest, RplLocationsGetRequest, RplLocationsSortByValues, RplLocationsTypeValues } from "../services/repliers/locations.js";
import { RplBooleanValues } from "../types/repliers.js";
import { rplMapFlexibleSchema } from "./common.ts";
export const locationsGetSchema = joi.object<LocationsGetDto>().keys({
   type: joi.array().items(joi.string().valid(...RplLocationsTypeValues)).single(),
   state: joi.array().items(joi.string()).single(),
   area: joi.array().items(joi.string()).single(),
   city: joi.array().items(joi.string()).single(),
   neighborhood: joi.array().items(joi.string()).single(),
   locationId: joi.array().items(joi.string()).single(),
   fields: joi.string(),
   resultsPerPage: joi.number().min(1).max(1000).default(100),
   pageNum: joi.number().min(1).default(1),
   map: rplMapFlexibleSchema,
   radius: joi.number().min(1),
   lat: joi.number().min(-90).max(90),
   long: joi.number().min(-180).max(180),
   sortBy: joi.string().valid(...RplLocationsSortByValues),
   hasBoundary: joi.string().valid(...RplBooleanValues),
   minSize: joi.number().positive(),
   maxSize: joi.number().positive(),
   source: joi.array().items(joi.string()).single(),
   classification: joi.array().items(joi.string()).single()
}).with("radius", ["long", "lat"]);
export interface LocationsGetDto extends RplLocationsGetRequest {}
export const locationsAutocompleteSchema = joi.object<LocationsAutocompleteDto>().keys({
   search: joi.string().min(3).required(),
   type: joi.array().items(joi.string().valid(...RplLocationsTypeValues)).single(),
   fields: joi.string(),
   map: rplMapFlexibleSchema,
   resultsPerPage: joi.number().min(1).max(10),
   pageNum: joi.number().min(1).default(1),
   radius: joi.number().min(1),
   lat: joi.number().min(-90).max(90),
   long: joi.number().min(-180).max(180),
   state: joi.array().items(joi.string()).single(),
   area: joi.array().items(joi.string()).single(),
   city: joi.array().items(joi.string()).single(),
   boundary: joi.string().valid(...RplBooleanValues),
   hasBoundary: joi.string().valid(...RplBooleanValues),
   minSize: joi.number().positive(),
   maxSize: joi.number().positive(),
   source: joi.array().items(joi.string()).single(),
   classification: joi.array().items(joi.string()).single()
}).with("radius", ["long", "lat"]);
export interface LocationsAutocompleteDto extends RplLocationsAutocompleteRequest {}