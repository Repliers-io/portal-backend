import { injectable } from "tsyringe";
import RepliersBase, { ApiRequest, ApiResponse } from "./base.js";
import { RplYesNo, RplDateFormat } from "../../types/repliers.js";
export interface RplEstimateAddCondominium {
   ammenities?: string[];
   amenities?: string[];
   exposure?: string;
   fees?: {
      cableIncl?: RplYesNo;
      heatIncl?: RplYesNo;
      hydroIncl?: RplYesNo;
      maintenance?: number;
      parkingIncl?: RplYesNo;
      taxesIncl?: RplYesNo;
      waterIncl?: RplYesNo;
   };
   parkingType?: string | string[];
   pets?: string | string[];
   stories?: number;
}
export interface RplEstimateAddDataRoomsAdded {
   count: number;
   year: RplDateFormat;
}
export interface RplEstimateAddDataImprovements {
   maintenanceSpent?: number;
   improvementSpent?: number;
   landscapingSpent?: number;
   kitchenRenovated?: boolean;
   kitchenRenewalYear?: RplDateFormat;
   bedroomsAdded?: RplEstimateAddDataRoomsAdded;
   bathroomsAdded?: RplEstimateAddDataRoomsAdded;
}
export interface RplEstimateAddDataSalesIntentions {
   sellingTimeline?: string;
}
export interface RplEstimateMortgage {
   balance?: number;
}
export interface RplEstimateAddData {
   purchasePrice?: number;
   purchaseDate?: RplDateFormat;
   improvements?: RplEstimateAddDataImprovements;
   imageUrl?: string;
   salesIntentions?: RplEstimateAddDataSalesIntentions;
   mortgage?: RplEstimateMortgage;
}
export interface RplEstimateAddDto {
   clientId?: number;
   boardId?: number;
   address?: {
      city: string;
      streetName: string;
      streetNumber: string;
      streetSuffix: string;
      streetDirection?: string;
      unitNumber?: string;
      zip: string;
      neighborhood?: string;
      district?: string;
      majorIntersection?: string;
      communityCode?: string;
   };
   condominium?: RplEstimateAddCondominium;
   details?: {
      basement1?: string | string[];
      basement2?: string | string[];
      driveway?: string | string[];
      exteriorConstruction1?: string | string[];
      exteriorConstruction2?: string | string[];
      extras?: string;
      garage?: string | string[];
      heating?: string | string[];
      numBathrooms: number;
      numBathroomsPlus?: number;
      numBedrooms: number;
      numBedroomsPlus?: number;
      numFireplaces?: RplYesNo;
      numGarageSpaces?: number;
      numParkingSpaces?: number;
      propertyType: string;
      sqft: number;
      style: string;
      swimmingPool?: string | string[];
      yearBuilt?: string | number;
   };
   lot?: {
      acres?: string;
      depth?: number;
      width?: number;
   };
   sendEmailNow?: boolean;
   sendEmailMonthly?: boolean;
   taxes?: {
      annualAmount: number;
   };
   data?: RplEstimateAddData | undefined;
}
export interface RplEstimateAddRequest extends RplEstimateAddDto, ApiRequest {}
export interface RplEstimateCore {
   estimateId: number;
   estimate: number;
   ulid?: string;
   estimateLow: number;
   estimateHigh: number;
   confidence: number;
   history?: {
      mth?: Record<string, {
         value: number;
      }>;
   } | null;
}
export interface RplEstimateSingle extends RplEstimateCore {
   clientId?: number; // absent on guest estimates
   createdOn: string;
   updatedOn: string | null;
   sendEmailMonthly: boolean;
   payload: RplEstimateAddRequest;
}
export interface RplEstimateAddResponse extends RplEstimateCore, ApiResponse {
   request: RplEstimateAddRequest;
}
export interface RplEstimateGetRequest extends ApiRequest {
   ulid?: string;
   clientId?: number;
   estimateId?: number;
   pageNum?: number;
   resultsPerPage?: number;
}
export interface RplEstimateGetResponse extends ApiRequest {
   page: number;
   numPages: number;
   pageSize: number;
   count: number;
   estimates: RplEstimateSingle[];
}
export interface RplEstimateDeleteResponse extends ApiRequest {
   estimateId: number;
}
interface RplEsitmatePatchRequest extends Omit<RplEstimateAddRequest, "boardId"> {
   estimateId: number;
}
@injectable()
export default class RepliersEstimate extends RepliersBase {
   add(params: RplEstimateAddRequest) {
      return this.request<RplEstimateAddResponse | RplEstimateSingle>("POST", `/estimates`, {}, params);
   }
   get(params: RplEstimateGetRequest) {
      return this.request<RplEstimateGetResponse>("GET", '/estimates', params);
   }
   delete(params: RplEstimateDeleteResponse) {
      return this.request<RplEstimateGetResponse>("DELETE", `/estimates/${params.estimateId}`);
   }
   patch(params: RplEsitmatePatchRequest) {
      const {
         estimateId,
         ...data
      } = params;
      return this.request<RplEstimateGetResponse>("PATCH", `/estimates/${params.estimateId}`, {}, data);
   }
}