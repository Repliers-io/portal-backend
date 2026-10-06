import { injectable } from "tsyringe";
import _debug from "debug";
import BaseEventCollectionSelector, { EventsCollectionPropertiesSelector } from "./baseEventCollectionSelector.js";
import { getBody, maybeClientId } from "../../../lib/utils.js";
import { estimateAddSchema } from "../../../validate/estimate.js";
import { BossEventsCreateRequest } from "../../boss.ts";
const debug = _debug("repliers:services:SelectEstimateParams");
@injectable()
export default class SelectEstimateParams extends BaseEventCollectionSelector {
   select: EventsCollectionPropertiesSelector = async ctx => {
      try {
         const {
            error,
            value
         } = estimateAddSchema.validate({
            ...getBody(ctx.request.body),
            clientId: maybeClientId(ctx.state?.["user"]?.sub)
         });
         if (error) {
            throw error; // goto is fine here
         }
         const defaults = await this.getDefaults(ctx);
         const {
            address,
            details
         } = value;
         const price = this.isEstimateModel(ctx.response.body) ? ctx.response.body.estimate : undefined;
         const payload = {
            ...defaults,
            person: {
               ...defaults.person,
               tags: this.getSellIntentionTag(value)
            },
            property: {
               street: `${address?.streetNumber} ${address?.streetName} ${address?.streetSuffix}`,
               city: address?.city,
               code: address?.zip,
               price,
               type: details?.style,
               bedrooms: this.stringifyIfSet(details?.numBedrooms),
               bathrooms: this.stringifyIfSet(details?.numBathrooms),
               area: this.stringifyIfSet(details?.sqft)
            },
            type: "Seller Inquiry"
         } as BossEventsCreateRequest;
         return payload;
      } catch (error) {
         debug("Fail to generate FUB params due to error %O", error);
         return null;
      }
   };
}