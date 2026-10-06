import { injectable } from "tsyringe";
import RepliersBase, { ApiRequest, ApiResponse } from "./base.js";
import { addMlsNumbers, stripMlsNumbers } from "../listings/mlsNumberPrefix.ts";
import { RplLastStatus, RplSortBy, RplStandardStatus, RplStatus } from "../../types/repliers.js";
import { constrainStandardStatus } from "../listings/listingHelpers.ts";
export interface RplFavoritesAddDto {
   clientId: number;
   mlsNumber: string;
   boardId?: number;
}
export interface RplFavoritesGetDto {
   clientId: number;
   sortBy?: RplSortBy;
   lat?: string;
   long?: string;
   status?: RplStatus | RplStatus[];
   lastStatus?: RplLastStatus | RplLastStatus[];
   standardStatus?: RplStandardStatus | RplStandardStatus[];
}
export interface RplFavoritesAddRequest extends RplFavoritesAddDto, ApiRequest {}
export interface RplFavoritesAddResponse extends ApiResponse {}
export interface RplFavoritesDeleteResponse extends ApiResponse {}
export interface RplFavoritesGetResponse extends ApiResponse {
   page: number;
   numPages: number;
   pageSize: number;
   count: number;
   favorites: Array<{
      [key: string]: unknown;
      favoriteId: number;
   }>;
}
export type FeaturedListingsResponse = Omit<RplFavoritesGetResponse, "favorites"> & {
   listings: RplFavoritesGetResponse["favorites"];
};
@injectable()
export default class RepliersFavorites extends RepliersBase {
   add(params: RplFavoritesAddRequest) {
      const prefix = this.config.settings.mlsNumberPrefix;
      return this.request<RplFavoritesAddResponse>("POST", `/favorites`, {}, addMlsNumbers({
         ...params
      }, prefix));
   }
   delete(favoriteId: number) {
      return this.request<RplFavoritesDeleteResponse>("DELETE", `/favorites/${favoriteId}`);
   }
   async get(params: RplFavoritesGetDto) {
      let query: RplFavoritesGetDto = {
         ...params
      };
      const allowedStandardStatuses = this.config.settings.allowedListingsStandardStatuses;
      constrainStandardStatus(query, allowedStandardStatuses);
      const result = await this.request<RplFavoritesGetResponse>("GET", `/favorites`, {
         ...query
      });
      return stripMlsNumbers(result, this.config.settings.mlsNumberPrefix);
   }
}