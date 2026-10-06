import { injectable } from "tsyringe";
import _debug from "debug";
import { getBody, maybeClientId } from "../../../lib/utils.js";
import { contactSchema } from "../../../validate/contact.js";
import BaseEventCollectionSelector, { contactEntries, EventsCollectionPropertiesSelector } from "./baseEventCollectionSelector.js";
import { BossEventsCreateRequest } from "../../boss.ts";
const debug = _debug("repliers:services:SelectContactUsParams");
@injectable()
export default class SelectContactUsParams extends BaseEventCollectionSelector {
   select: EventsCollectionPropertiesSelector = async ctx => {
      const {
         error,
         value
      } = contactSchema.validate({
         ...getBody(ctx.request.body),
         clientId: maybeClientId(ctx.state?.["user"]?.sub)
      });
      if (error) {
         debug("[selectContactUsParams] error %O", error);
         return null;
      }
      const defaults = await this.getDefaults(ctx);
      const payload = {
         ...defaults,
         person: {
            firstName: value.name,
            ...contactEntries(value.email, value.phone),
            tags: value.tags?.length ? value.tags : undefined
         },
         message: value.message,
         type: 'General Inquiry',
         pageUrl: value.pageUrl ?? ctx.request.headers.referer
      } as BossEventsCreateRequest;
      return payload;
   };
}