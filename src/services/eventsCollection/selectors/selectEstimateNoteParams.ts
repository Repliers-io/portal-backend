import { injectable } from "tsyringe";
import _debug from "debug";
import BaseEventCollectionSelector from "./baseEventCollectionSelector.js";
import { RplEstimateAddResponse, RplEstimateSingle } from "../../repliers/estimate.js";
import { NotesCollectionPropertiesSelector } from "../eventsCollection.js";
import { BossNoteCreateRequest } from "../../boss.ts";
const debug = _debug("repliers:services:SelectEstimateNoteParams");
export interface EstimateNoteParams {
   estimate: RplEstimateSingle | RplEstimateAddResponse;
}
@injectable()
export default class SelectEstimateNoteParams {
   constructor(private baseEventCollectionSelector: BaseEventCollectionSelector) {}
   select: NotesCollectionPropertiesSelector = async ctx => {
      debug("[SelectEstimateNoteParams] estimateParams %O", ctx.response.body);
      try {
         const details = this.getEstimatedPropertyNoteOptions(ctx.response.body);
         if (!details) {
            debug("Estimate details are missing or invalid", ctx.response.body);
            return null;
         }
         const printDetails = (value: string | undefined | null, fallback = 'N/A') => {
            return value !== undefined && value !== null ? value : fallback;
         };
         const estimateUrl = this.baseEventCollectionSelector.getEstimateUrl(ctx.response.body);
         if (!estimateUrl) {
            debug("Estimate URL is missing for the provided estimate", ctx.response.body);
         }
         const payload = {
            subject: `Seller Inquire details for ${details.type} property at ${details.address}`,
            clientId: details.clientId,
            body: `
                  <p>Valuation Amount: ${this.baseEventCollectionSelector.formatPrice(details.estimatedPrice)}</p>
                  <p>Style of Home: ${printDetails(details.style)}</p>
                  <p>Square Footage: ${printDetails(details.sqft)} sqft</p>
                  <p>Year Built: ${printDetails(details.yearBuilt)}</p>
                  <p>Bedrooms: ${printDetails(details.bedrooms)}</p>
                  <p>Bathrooms: ${printDetails(details.bathrooms)}</p>
                  <p>Garage Spaces: ${printDetails(details.garageSpaces)}</p>
                  ${estimateUrl ? `<p>
                      <a href="${estimateUrl}" target="__blank">Click here</a> to view estimate details.
                  </p>` : ""}
             `,
            isHtml: true
         } as BossNoteCreateRequest;
         return payload;
      } catch (error) {
         debug("Failed to generate note params due to error %O", error);
         return null;
      }
   };
   private getEstimatedPropertyNoteOptions(estimate: unknown) {
      const estimateDetails = this.getEstimateDetails(estimate);
      if (!estimateDetails || !estimateDetails.details || !estimateDetails.address || !estimateDetails.clientId) {
         debug("Invalid estimate format", estimate);
         return null;
      }
      const {
         address,
         details,
         clientId
      } = estimateDetails;
      return {
         clientId,
         address: `${this.baseEventCollectionSelector.addressShort(address)}, ${address.city}, ${address.zip}`,
         style: details.style,
         type: details.propertyType,
         sqft: this.baseEventCollectionSelector.stringifyIfSet(details.sqft),
         bedrooms: this.baseEventCollectionSelector.stringifyIfSet(details.numBedrooms),
         bathrooms: this.baseEventCollectionSelector.stringifyIfSet(details.numBathrooms),
         yearBuilt: this.baseEventCollectionSelector.stringifyIfSet(details.yearBuilt),
         garageSpaces: this.baseEventCollectionSelector.stringifyIfSet(details.numGarageSpaces),
         estimatedPrice: estimateDetails.estimate
      };
   }
   private getEstimateDetails(estimate: unknown) {
      if (this.isRplEstimateSingle(estimate)) {
         return {
            address: estimate.payload.address,
            details: estimate.payload.details,
            estimate: estimate.estimate,
            clientId: estimate.clientId
         };
      } else if (this.isRplEstimateAddResponse(estimate)) {
         return {
            address: estimate.request.address,
            details: estimate.request.details,
            estimate: estimate.estimate,
            clientId: estimate.request.clientId
         };
      }
      return null;
   }
   private isRplEstimateSingle(estimate: unknown): estimate is RplEstimateSingle {
      return (estimate as RplEstimateSingle).payload !== undefined;
   }
   private isRplEstimateAddResponse(estimate: unknown): estimate is RplEstimateAddResponse {
      return (estimate as RplEstimateAddResponse).request !== undefined;
   }
}