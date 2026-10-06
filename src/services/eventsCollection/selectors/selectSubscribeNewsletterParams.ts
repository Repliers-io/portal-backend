import { injectable } from "tsyringe";
import _debug from "debug";
import { getBody } from "../../../lib/utils.js";
import { subscribeNewsletterSchema } from "../../../validate/contact.js";
import BaseEventCollectionSelector, { EventsCollectionPropertiesSelector } from "./baseEventCollectionSelector.js";
import { BossEventsCreateRequest } from "../../boss.ts";
const debug = _debug("repliers:services:SelectSubscribeNewsletterParams");
@injectable()
export default class SelectSubscribeNewsletterParams extends BaseEventCollectionSelector {
   select: EventsCollectionPropertiesSelector = async ctx => {
      const {
         error,
         value
      } = subscribeNewsletterSchema.validate(getBody(ctx.request.body));
      if (error) {
         debug("[selectSubscribeNewsletterParams] error %O", error);
         return null;
      }
      const defaults = await this.getDefaults(ctx);
      const tags = this.config.eventsCollection.eventTags.SelectSubscribeNewsletterParams;
      const payload = {
         ...defaults,
         person: {
            emails: [{
               value: value.email,
               type: 'main'
            }],
            tags: [...(defaults?.person?.tags || []), ...tags]
         },
         message: 'Newsletter subscription',
         type: 'General Inquiry',
         pageUrl: value.pageUrl ?? ctx.request.headers.referer
      } as BossEventsCreateRequest;
      return payload;
   };
}