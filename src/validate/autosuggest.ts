import joi from "joi";
import config from "../config.js";
import { RplType } from "../types/repliers.js";
import type { RplLocationSource } from "../services/repliers/locations.ts";
import { RplListingsAppState } from "./listings.ts";
import { appStateSchema, rplTypeSchema } from "./common.ts";

// Base interface with common properties
export interface BaseAutosuggestDto {
   q: string;
   lat: string;
   long: string;
   radius: number;
   /**
    * @deprecated Use new {@link searchSession} field instead.
    */
   mapboxSearchSession: string;
   searchSession: string;
}

// Derived interfaces
export interface AutosuggestDto extends BaseAutosuggestDto {
   resultsPerPage: number;
   boundary?: boolean;
   hasBoundary?: boolean;
   type?: RplType[];
   app_state: RplListingsAppState;
   source?: RplLocationSource[];
}
export interface AutosuggestAddressDto extends BaseAutosuggestDto {}

// Base schema for common properties
const baseAutosuggestSchema = {
   lat: joi.string().regex(/^(-?\d+(\.\d+)?)$/).default(config.repliers.autosuggest.lat),
   long: joi.string().regex(/^(-?\d+(\.\d+)?)$/).default(config.repliers.autosuggest.long),
   radius: joi.number().integer().positive().default(config.repliers.autosuggest.radius),
   mapboxSearchSession: joi.string().uuid(),
   searchSession: joi.string().uuid()
};
export const autosuggestSchema = joi.object<AutosuggestDto>().keys({
   ...baseAutosuggestSchema,
   q: joi.string().min(3),
   resultsPerPage: joi.number().positive().max(config.repliers.autosuggest.max_results).default(config.repliers.autosuggest.max_results_default),
   boundary: joi.boolean().default(false),
   hasBoundary: joi.boolean().default(null),
   type: rplTypeSchema,
   app_state: appStateSchema,
   // Restrict the locations block to specific sources
   // e.g. `UserDefined`, LiveBy, MLS). `.single()` accepts `?source=UserDefined` as one value.
   // Mirrors the `/locations` endpoint.
   source: joi.array().items(joi.string()).single()
}).or('mapboxSearchSession', 'searchSession');
export const autosuggestAddressSchema = joi.object<AutosuggestAddressDto>().keys({
   ...baseAutosuggestSchema,
   q: joi.string().min(1)
}).or('mapboxSearchSession', 'searchSession');