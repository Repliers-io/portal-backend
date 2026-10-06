import { injectable } from "tsyringe";
import _debug from "debug";
import { requestInfoSchema } from "../../../validate/contact.js";
import { getBody, maybeClientId } from "../../../lib/utils.js";
import BaseEventCollectionSelector, { contactEntries, EventsCollectionPropertiesSelector } from "./baseEventCollectionSelector.js";
import { BossEventsCreateRequest } from "../../boss.ts";
const debug = _debug("repliers:services:SelectRequestInfoParams");
@injectable()
export default class SelectRequestInfoParams extends BaseEventCollectionSelector {
   select: EventsCollectionPropertiesSelector = async ctx => {
      const {
         error,
         value
      } = requestInfoSchema.validate({
         ...getBody(ctx.request.body),
         clientId: maybeClientId(ctx.state?.["user"]?.sub)
      });
      if (error) {
         debug("[selectSelectRequestInfoParams] error %O", error);
         return null;
      }
      const defaults = await this.getDefaults(ctx);
      const property = await this.getProperty(value.mlsNumber);
      const inquiryTags = this.config.eventsCollection.formTags?.inquiry;
      const inquiryTag = property.forRent ? inquiryTags?.rent : inquiryTags?.sale;
      const payload = {
         ...defaults,
         person: {
            firstName: value.name,
            ...contactEntries(value.email, value.phone),
            tags: inquiryTag ? [inquiryTag] : undefined
         },
         message: value.message,
         property,
         type: 'Inquiry'
      } as BossEventsCreateRequest;
      return payload;
   };
}