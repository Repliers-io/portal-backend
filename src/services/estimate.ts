import { injectable, inject } from "tsyringe";
import { howSimilar } from "../lib/utils.js";
import RepliersListings, { rplListingClassToRplClassMapper, RplListingsSearchRequest, RplListingsSingle } from "./repliers/listings.js";
import { DeleteEstimateDto, EstimateGetDto, EstimatePropertyDetailsDto, EstimatesByClientIdGetDto, RplEstimatePatchDto } from "../validate/estimate.js";
import { RplSortBy, RplStatus, RplYesNo } from "../types/repliers.js";
import RepliersEstimate, { RplEstimateAddDto, RplEstimateAddData, RplEstimateAddRequest, RplEstimateAddResponse, RplEstimateCore, RplEstimateSingle } from "./repliers/estimate.js";
import _debug from "debug";
import { ApiError } from "../lib/errors.js";
import type { AppConfig } from "../config.js";
import { UserRole } from "../constants.js";
import UserService from "./user.js";
import dayjs from "dayjs";
const debug = _debug("repliers:services:estimate");
type SimilarClientEstimate = {
   mostSimilar: RplEstimateSingle | undefined;
   similarity: number | undefined;
};
type EstimateBounds = {
   estimateLow: number;
   estimateHigh: number;
};
type BoundedEstimate = {
   estimate: number;
} & EstimateBounds;
type PropertyDetailsListingResponse = Partial<RplListingsSingle & RplEstimateAddDto["data"] & {
   similarity: number | undefined;
}>;
type PropertyDetailsEmptyResponse = undefined;
type CheckOwnershipParams = {
   userRole: UserRole;
   userId: number;
} & ({
   estimateId: number;
   estimate?: RplEstimateSingle | undefined;
} | {
   estimateId?: number | undefined;
   estimate: RplEstimateSingle;
});
export function estimateBounds(estimate: number, confidence: number): EstimateBounds {
   return {
      estimateLow: estimate - estimate * confidence,
      estimateHigh: estimate + estimate * confidence
   };
}
export function ownerAdjustedEstimates(estimate: number, confidence: number, data: RplEstimateAddData | undefined): BoundedEstimate {
   if (data && data.improvements) {
      const {
         maintenanceSpent = 0,
         improvementSpent = 0,
         landscapingSpent = 0
      } = data.improvements;
      const adjustedEstimate = estimate + maintenanceSpent * 0.6 + improvementSpent * 0.8 + landscapingSpent * 0.7;
      return {
         estimate: adjustedEstimate,
         ...estimateBounds(adjustedEstimate, confidence)
      };
   }
   return {
      estimate,
      ...estimateBounds(estimate, confidence)
   };
}
const isUser = (params: RplEstimateAddDto): boolean => !!("clientId" in params && params.clientId);
@injectable()
export default class EstimateService {
   private propertyDetailsFields = ['class', 'address', 'images[0]', 'listDate', 'updatedOn', 'details.propertyType', 'details.exteriorConstruction1', 'details.exteriorConstruction2', 'details.numBedrooms', 'details.numBathrooms', 'details.numGarageSpaces', 'details.numParkingSpaces', 'details.sqft', 'details.yearBuilt', 'details.swimmingPool', 'details.numFireplaces', 'details.heating', 'details.style', 'details.basement1', 'details.basement2', 'details.den', 'details.patio', 'lot.depth', 'lot.width', 'lot.measurement', 'lot.acres', 'lot.squareFeet', 'lot.features', 'taxes.annualAmount', 'condominium.fees.maintenance', 'condominium.pets', 'condominium.exposure', 'condominium.ammenities'];
   private historicalServiceEnabled = false;
   constructor(@inject("config")
   private config: AppConfig, private listings: RepliersListings, private historicalListings: RepliersListings, private estimate: RepliersEstimate, private usersService: UserService) {
      if (this.config.repliers.historical_data_key) {
         this.historicalListings.switchKey(this.config.repliers.historical_data_key);
         this.historicalServiceEnabled = true;
      }
   }
   async propertyDetails(params: EstimatePropertyDetailsDto): Promise<PropertyDetailsListingResponse | PropertyDetailsEmptyResponse> {
      debug("[propertyDetails] params %O", params);
      const foundListing = await this.findListingByAddress(params);
      if (!foundListing) {
         return this.handleEmptyResponse(params);
      }
      const listing = this.shouldAdjustTax(foundListing) ? await this.adjustPropertyTax(foundListing) : foundListing;
      const {
         mostSimilar = undefined,
         similarity = 0
      } = isUser(params) ? await this.findSimilarClientEstimate(params) : {};
      if (similarity < 0.9) {
         return listing;
      }
      return {
         ...listing,
         data: mostSimilar?.payload?.data,
         similarity
      };
   }
   private applySearchStrategy(params: EstimatePropertyDetailsDto): Pick<RplListingsSearchRequest, "streetName" | "streetSuffix"> {
      if (params.searchStrategy?.includes("streetSuffixInStreetName") && params.streetSuffix) {
         return {
            streetName: [params.streetName, `${params.streetName} ${params.streetSuffix}`]
         };
      }
      return {
         streetName: params.streetName,
         streetSuffix: params.streetSuffix
      };
   }
   private async findListingByAddress(params: EstimatePropertyDetailsDto): Promise<RplListingsSingle | undefined> {
      const searchParams: RplListingsSearchRequest = {
         listings: true,
         status: [RplStatus.U, RplStatus.A],
         city: [params.city],
         ...this.applySearchStrategy(params),
         streetNumber: params.streetNumber,
         streetDirection: params.streetDirection,
         zip: params.zip,
         unitNumber: params.unitNumber,
         displayInternetEntireListing: RplYesNo.Y,
         sortBy: RplSortBy.createdOnDesc,
         resultsPerPage: 1,
         fields: this.propertyDetailsFields.join(',')
      };
      debug("[propertyDetails] searchParams %O", searchParams);
      const response = await this.listings.search(searchParams);
      debug("[propertyDetails] response.listings %O", response.listings);
      if (response?.listings?.at(0)) {
         return response.listings.at(0);
      }
      return this.historicalServiceEnabled ? this.fetchFromHistory(searchParams) : undefined;
   }
   private async fetchFromHistory(searchParams: RplListingsSearchRequest): Promise<RplListingsSingle | undefined> {
      const historicalResponse = await this.historicalListings.search(searchParams);
      debug("[propertyDetails] historicalResponse.listings %O", historicalResponse.listings);
      return historicalResponse?.listings?.at(0);
   }
   private async handleEmptyResponse(params: EstimatePropertyDetailsDto) {
      if (this.config.settings.extended_property_details) {
         const address = await this.getAddressData(params);
         const taxes = await this.getAverageTax({
            neighborhood: address?.neighborhood,
            city: params.city
         });
         return taxes ? {
            address,
            taxes
         } : {
            address
         };
      }
      return undefined;
   }
   private shouldAdjustTax(listing: RplListingsSingle): boolean {
      const listingTaxYear = this.getListingTaxYear(listing);
      return listingTaxYear !== new Date().getFullYear() || listingTaxYear !== this.getCurrentTaxYear();
   }
   private getCurrentTaxYear(): number {
      const today = new Date();
      return today.getMonth() < 6 ? today.getFullYear() - 1 : today.getFullYear(); // we want to use prev year stats if we are before June
   }
   private getListingTaxYear(listing: RplListingsSingle): number {
      const assessmentYear = listing.taxes?.assessmentYear || listing.listDate || listing.updatedOn;
      return new Date(assessmentYear).getFullYear();
   }
   private async adjustPropertyTax(listing: RplListingsSingle): Promise<RplListingsSingle> {
      const currentTaxYear = this.getCurrentTaxYear();
      const listingTaxYear = this.getListingTaxYear(listing);
      const MINIMUM_REQUIRED_RECORDS = 15;
      const city = listing.address?.["city"] as string | undefined;
      if (!city) return listing;
      const statKey = 'avg';
      const searchParams = {
         status: [RplStatus.U, RplStatus.A],
         city: [city],
         statistics: `${statKey}-tax,grp-yr`,
         listings: false,
         class: [rplListingClassToRplClassMapper[listing.class]],
         propertyType: listing.propertyType
      };
      try {
         debug("[propertyDetails] adjustPropertyTax fetching tax stats %O", searchParams);
         const response = await (this.historicalServiceEnabled ? this.historicalListings.search(searchParams) : this.listings.search(searchParams));
         debug("[propertyDetails] adjustPropertyTax fetched tax stats %O", response);
         const yr = response.statistics?.tax?.yr;
         const listingYearStats = yr?.[`${listingTaxYear}`];
         const currentYearStats = yr?.[`${currentTaxYear}`];
         const noListingYearStats = !listingYearStats || listingYearStats.count < MINIMUM_REQUIRED_RECORDS || !listingYearStats[statKey];
         const noCurrentYearStats = !currentYearStats || currentYearStats.count < MINIMUM_REQUIRED_RECORDS || !currentYearStats[statKey];

         // if no tax for current listing, use current year med
         if (!listing.taxes?.annualAmount) {
            listing.taxes = {
               ...listing.taxes,
               annualAmount: currentYearStats?.[statKey] || 0
            };
            return listing;
         }

         // not enough stats to determine multiplier, so use tax as is
         if (noCurrentYearStats || noListingYearStats) {
            return listing;
         }
         const taxMultiplier = this.getTaxMultiplier(listingYearStats![statKey], currentYearStats![statKey]);
         listing.taxes.annualAmount = Math.round(listing.taxes.annualAmount * taxMultiplier);
         return listing;
      } catch (err) {
         debug("[propertyDetails] adjustPropertyTax error %O", err);
         return listing;
      }
   }
   private getTaxMultiplier(originalYearTax: number, targetYearTax: number) {
      return targetYearTax / originalYearTax;
   }
   private async getAddressData(params: EstimatePropertyDetailsDto) {
      const minStreetNumber = +params.streetNumber - 50;
      const maxStreetNumber = +params.streetNumber + 50;
      const searchParams = {
         listings: true,
         status: [RplStatus.U, RplStatus.A],
         city: [params.city],
         streetName: params.streetName,
         maxStreetNumber: maxStreetNumber.toString(),
         minStreetNumber: minStreetNumber > 1 ? minStreetNumber.toString() : '1',
         sortBy: RplSortBy.createdOnDesc,
         resultsPerPage: 999,
         fields: "address"
      };
      const result: {
         city: string;
         neighborhood?: string;
      } = {
         city: params.city
      };
      try {
         debug("[propertyDetails] getAddressData %O", searchParams);
         const response = await this.historicalListings.search(searchParams);
         debug("[propertyDetails] address.data %O", response);
         const listings = response["listings"];
         if (listings.length === 0) {
            return result;
         }
         const closest = this.findClosestLocation(params, listings);
         const neighborhood = closest?.address?.['neighborhood'];
         if (neighborhood) {
            result['neighborhood'] = String(neighborhood);
         }
      } catch (err) {
         debug("[propertyDetails] getAddressData error %O", err);
      } finally {
         return result;
      }
   }
   private findClosestLocation(params: EstimatePropertyDetailsDto, listings: RplListingsSingle[]): RplListingsSingle | null {
      let closest = null;
      let closestSameParity = null;
      let closestDistanceSameParity = Infinity;
      let closestDistance = Infinity;
      const targetStreetNumber = +params.streetNumber;
      const minimumSatisfactoryDistance = 5; // if we found listing withing this distance same parity, we are happy

      debug("[propertyDetails] findClosestLocation in %O listings", listings.length);
      for (const listing of listings) {
         const streetNumber = listing.address?.['streetNumber'];
         if (!streetNumber || isNaN(+streetNumber)) {
            continue;
         }
         const listingStreetNumber = +streetNumber;
         const distance = Math.abs(targetStreetNumber - listingStreetNumber);
         const isSameParity = targetStreetNumber % 2 === listingStreetNumber % 2;
         if (isSameParity && distance <= minimumSatisfactoryDistance) {
            debug("[propertyDetails] findClosestLocation found minimumSatisfactoryDistance %0", listing);
            return listing;
         }
         if (isSameParity && distance < closestDistanceSameParity) {
            closestSameParity = listing;
            closestDistanceSameParity = distance;
         } else if (distance < closestDistance) {
            closest = listing;
            closestDistance = distance;
         }
      }
      if (closestSameParity) {
         debug("[propertyDetails] findClosestLocation found same parity %0", closestSameParity);
         return closestSameParity;
      } else {
         debug("[propertyDetails] findClosestLocation found %0", closest);
         return closest;
      }
   }
   private async getAverageTax({
      city,
      neighborhood
   }: {
      neighborhood: string | undefined;
      city: string;
   }): Promise<PropertyDetailsListingResponse['taxes']> {
      const search = {
         city: [city],
         neighborhood: neighborhood ? [neighborhood] : [],
         status: [RplStatus.U, RplStatus.A],
         listings: false,
         minListDate: dayjs().subtract(12, 'months').format('YYYY-MM-DD') as `${number}-${number}-${number}`,
         statistics: 'med-tax'
      };
      try {
         debug("[getAverageTax] search %O", search);
         const response = await this.listings.search(search);
         const med = response.statistics?.tax?.med;
         if (med == null) return undefined;
         return {
            annualAmount: med,
            assessmentYear: this.getCurrentTaxYear()
         };
      } catch (err) {
         debug("[getAverageTax] error %O", err);
         return undefined;
      }
   }
   private async findSimilarClientEstimate(params: EstimatePropertyDetailsDto): Promise<SimilarClientEstimate> {
      const {
         estimates: prevEstimates
      } = await this.estimate.get({
         clientId: params.clientId
      });
      const simParams = {
         city: params.city,
         streetName: params.streetName,
         streetNumber: params.streetNumber,
         unitNumber: params.unitNumber,
         zip: params.zip
      };
      const mostSimilar = prevEstimates.sort((a, b) => {
         return howSimilar(simParams, a.payload?.address) > howSimilar(simParams, b.payload?.address) ? -1 : 1;
      }).at(0);
      const similarity = mostSimilar ? howSimilar(simParams, mostSimilar.payload?.address) : undefined;
      return {
         mostSimilar,
         similarity
      };
   }
   async add(params: RplEstimateAddDto) {
      debug("[add] params %O", params);
      const {
         data,
         ...otherParams
      } = params;
      const repliersParams: RplEstimateAddRequest = {
         ...otherParams,
         ...(isUser(params) ? {
            data,
            sendEmailNow: (params.sendEmailNow || this.config.repliers.estimatesNotificationSettings?.sendEmailNow) ?? false,
            sendEmailMonthly: (params.sendEmailMonthly || this.config.repliers.estimatesNotificationSettings?.sendEmailMonthly) ?? false
         } : {
            data: undefined
         })
      };
      let result = await this.estimate.add(repliersParams);
      if (params?.data) {
         result = {
            ...this.adjustEstimates(result, params.data),
            ...(!isUser(params) ? {
               request: {
                  ...(result as RplEstimateAddResponse).request,
                  data: params?.data
               }
            } : {})
         };
      }
      return result;
   }
   async get(params: EstimateGetDto) {
      debug("[get] params %O", params);
      const {
         clientId: _clientId,
         ...requestParams
      } = params;
      const {
         estimates
      } = await this.estimate.get(requestParams);
      if (estimates.length <= 0) {
         throw new ApiError("Not found", 404);
      }
      let result = estimates.at(0)!;
      if (result.payload?.data) {
         result = this.adjustEstimates<typeof result>(result, result.payload.data);
      }
      return result;
   }
   private adjustHistory(result: RplEstimateCore /*RplEstimateSingle | RplEstimateAddResponse*/, delta: number) {
      if (delta > 0 && result.history?.mth) {
         for (const [, estimate] of Object.entries(result.history.mth)) {
            estimate.value += delta;
         }
      }
   }
   private adjustEstimates<T extends RplEstimateCore>(result: T, data: RplEstimateAddData | undefined) {
      const unadjustedEstimate = result.estimate;
      const adjustedEstimates = ownerAdjustedEstimates(result.estimate, result.confidence, data);
      result = {
         ...result,
         ...adjustedEstimates
      };
      const delta = adjustedEstimates.estimate - unadjustedEstimate;
      this.adjustHistory(result, delta);
      return result;
   }
   async patch(params: RplEstimatePatchDto) {
      return this.estimate.patch({
         ...params
      });
   }
   async getByClientId(params: EstimatesByClientIdGetDto) {
      debug("[get] params %O", params);
      const {
         clientId
      } = params;
      const {
         estimates
      } = await this.estimate.get({
         clientId
      });
      return estimates.map(result => {
         if (result.payload?.data) {
            result = this.adjustEstimates(result, result.payload.data);
         }
         return result;
      });
   }
   async delete(params: DeleteEstimateDto) {
      debug("[delete] params %O", params);
      return await this.estimate.delete({
         estimateId: params.estimateId
      });
   }
   async checkOwnership(params: CheckOwnershipParams): Promise<boolean> {
      debug("[checkOwnership] params %O", params);
      const {
         estimateId,
         userId,
         userRole
      } = params;
      const estimate = params.estimate ?? (await this.get({
         estimateId: estimateId!
      }));
      if (!estimate) {
         return false;
      }
      if (userRole === UserRole.Agent) {
         if (!estimate.clientId) return false; // guest estimate has no owner
         const client = await this.usersService.info(estimate.clientId);
         return String(userId) === String(client.agentId);
      } else if (userRole === UserRole.User) {
         return String(userId) === String(estimate.clientId);
      }
      return false;
   }
}