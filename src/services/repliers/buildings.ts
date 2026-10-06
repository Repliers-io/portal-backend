import { injectable } from "tsyringe";
import RepliersBase, { ApiBody, ApiRequest, PagedApiResponse } from "./base.js";
import { RplBuildingsDto } from "../../validate/buildings.ts";
import { RplListingClass } from "../../types/repliers.ts";
export interface RplBuildingSingle extends Record<string, unknown> {
   address?: Record<string, unknown>;
   nearby?: Record<string, unknown>;
   details?: Record<string, unknown>;
   map?: {
      latitude: string;
      longitude: string;
      point: string;
   };
   image?: string;
   class?: RplListingClass;
}
export interface RplBuildingsSearchRequest extends Omit<RplBuildingsDto, "app_state">, ApiRequest {}
export interface RplBuildingsSearchResponse extends PagedApiResponse {
   buildings: Array<RplBuildingSingle>;
}
@injectable()
export default class RepliersBuildings extends RepliersBase {
   public search(params: RplBuildingsSearchRequest, usePost = false) {
      const {
         body = {},
         ...query
      } = params;
      return this.request<RplBuildingsSearchResponse>(usePost ? "POST" : "GET", "/buildings", query, body as ApiBody);
   }
   public single(addressKey: string) {
      return this.request<RplBuildingSingle>("GET", `/buildings/${addressKey}`);
   }
}