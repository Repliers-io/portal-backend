import { injectable } from "tsyringe";
import RepliersBase, { ApiRequest, PagedApiResponse } from "./base.js";
import { RplBoolean, RplLocationMap, RplLocationPolygon } from "../../types/repliers.js";
export const RplLocationsTypeValues = ["area", "city", "city-alternate", "neighborhood", "neighborhood-alternate", "postalCode", "schoolDistrict", "district", "school", "property"] as const;
export type RplLocationsType = typeof RplLocationsTypeValues[number];
export const RplLocationsSortByValues = ["typedesc", "typeasc"] as const;
export type RplLocationsSortBy = typeof RplLocationsSortByValues[number];
export const RplLocationSourceValues = ["MLS", "UserDefined", "LiveBy", "PublicRecord"] as const;
export type RplLocationSource = typeof RplLocationSourceValues[number];
export interface RplLocation {
   resource?: string;
   locationId?: string;
   name?: string;
   type?: RplLocationsType;
   subType?: string;
   size?: number;
   source?: RplLocationSource;
   mlsId?: number;
   map?: {
      latitude?: string;
      longitude?: string;
      point?: string;
      geometryType?: "Polygon" | "MultiPolygon";
      boundary?: RplLocationPolygon[] | RplLocationPolygon[][];
   };
   address: {
      state?: string;
      country?: string;
      city?: string;
      area?: string;
      neighborhood?: string;
      zip?: string;
      zipPlus4?: string;
      streetAddress?: string;
   };
   // 140+ assessor fields, passed through untouched
   publicRecord?: Record<string, string | number | null>;
}
export interface RplLocationsGetRequest extends ApiRequest {
   type?: RplLocationsType[];
   state?: string[];
   area?: string[];
   city?: string[];
   neighborhood?: string[];
   locationId?: string[];
   pageNum?: number;
   resultsPerPage?: number;
   fields?: string;
   map?: RplLocationMap;
   radius?: number;
   lat?: number;
   long?: number;
   sortyBy?: RplLocationsSortBy;
   minSize?: number;
   maxSize?: number;
   source?: RplLocationSource[];
   classification?: string[];
}
export interface RplLocationsGetResponse extends PagedApiResponse {
   locations: Array<RplLocation>;
}
export interface RplLocationsAutocompleteRequest extends ApiRequest {
   search: string;
   type?: RplLocationsType[];
   state?: string[];
   area?: string[];
   city?: string[];
   boundary?: RplBoolean;
   hasBoundary?: RplBoolean | null;
   fields?: string;
   map?: RplLocationMap;
   radius?: number;
   lat?: number;
   long?: number;
   resultsPerPage?: number;
   pageNum?: number;
   minSize?: number;
   maxSize?: number;
   source?: RplLocationSource[];
   classification?: string[];
}
export interface RplLocationsAutocompleteResposnse extends PagedApiResponse {
   source: string[];
   locations: Array<RplLocation>;
}
@injectable()
export default class RepliersLocations extends RepliersBase {
   get(params: RplLocationsGetRequest) {
      return this.request<RplLocationsGetResponse>("GET", "/locations", params);
   }
   autocomplete(params: RplLocationsAutocompleteRequest) {
      return this.request<RplLocationsAutocompleteResposnse>("GET", "/locations/autocomplete", params);
   }
}