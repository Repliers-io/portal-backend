import { injectable } from "tsyringe";
import RepliersBase, { ApiRequest, ApiResponse } from "./base.js";
import { RplClass, RplType } from "../../types/repliers.js";
export interface RplSearchesCreateDto {
   clientId: number;
   name?: string;
   streetNumbers?: string[];
   streetNames?: string[];
   minBeds?: number;
   minBedrooms?: number;
   maxBeds?: number;
   maxBedrooms?: number;
   maxMaintenanceFee?: number;
   minBaths?: number;
   minBathrooms?: number;
   maxBaths?: number;
   maxBathrooms?: number;
   areas?: string[];
   cities?: string[];
   neighborhoods?: string;
   notificationFrequency?: "instant" | "daily" | "weekly" | "monthly";
   minPrice: number;
   maxPrice: number;
   propertyTypes?: string[];
   styles?: string[];
   map?: string;
   status?: boolean;
   type: RplType;
   class: RplClass;
   minGarageSpaces?: number;
   minKitchens?: number;
   minParkingSpaces?: number;
   basement?: string[];
   soldNotifications?: boolean;
   priceChangeNotifications?: boolean;
   sewer?: string[];
   waterSource?: string[];
   heating?: string[];
   swimmingPool?: string[];
   minYearBuilt?: number;
   maxYearBuilt?: number;
   minSqft?: number;
   maxSqft?: number;
   minLotSizeSqft?: number;
   maxLotSizeSqft?: number;
   minLotWidth?: number;
   maxLotWidth?: number;
   keywords?: string[];
}
export interface RplSaveSearch extends RplSearchesCreateDto {
   searchId: number;
}
export interface RplSearchesCreateRequest extends RplSearchesCreateDto, ApiRequest {}
export interface RplSearchesCreateResponse extends RplSaveSearch, ApiResponse {}
export interface RplSearchesUpdateDto extends RplSearchesCreateDto {
   searchId: number;
}
export interface RplSearchesUpdateRequest extends RplSearchesUpdateDto, ApiRequest {}
export interface RplSearchesUpdateResponse extends ApiResponse {}
export interface RepliersSearchesFilterDto {
   clientId: number;
}
export interface RplSearchesFilterRequest extends RepliersSearchesFilterDto, ApiRequest {}
export interface RplSearchesFilterResponse extends ApiResponse {
   page: number;
   numPages: number;
   pageSize: number;
   count: number;
   searches: [{
      [key: string]: unknown;
      searchId: number;
   }];
}
export interface RplSearchesDeleteResponse extends ApiResponse {}
export interface RplSearchesGetResponse extends ApiResponse {
   client: Record<string, unknown>;
}
@injectable()
export default class RepliersSearches extends RepliersBase {
   create(params: RplSearchesCreateRequest) {
      return this.request<RplSearchesCreateResponse>("POST", `/searches`, {}, params);
   }
   update(params: RplSearchesUpdateRequest) {
      const {
         searchId,
         ...updates
      } = params;
      return this.request<RplSearchesUpdateResponse>("PATCH", `/searches/${searchId}`, {}, updates);
   }
   filter(params: RplSearchesFilterRequest) {
      return this.request<RplSearchesFilterResponse>("GET", `/searches`, params);
   }
   delete(searchId: number) {
      return this.request<RplSearchesDeleteResponse>("DELETE", `/searches/${searchId}`);
   }
   get(searchId: number) {
      return this.request<RplSearchesGetResponse>("GET", `/searches/${searchId}`);
   }
}