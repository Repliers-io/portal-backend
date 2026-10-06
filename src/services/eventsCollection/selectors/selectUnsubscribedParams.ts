import { injectable } from "tsyringe";
import _debug from "debug";
import { getBody } from "../../../lib/utils.ts";
import { userUpdateSchema } from "../../../validate/user.ts";
import BaseEventCollectionSelector, { EventsCollectionPropertiesSelector } from "./baseEventCollectionSelector.ts";
import { BossEventsCreateRequest } from "../../boss.ts";
const debug = _debug("repliers:services:SelectUnsubscribedParams");
@injectable()
export default class SelectUnsubscribedParams extends BaseEventCollectionSelector {
   select: EventsCollectionPropertiesSelector = async ctx => {
      const {
         error,
         value
      } = userUpdateSchema.validate({
         ...getBody(ctx.request.body),
         clientId: ctx.state["user"].sub
      });
      if (error) {
         debug("[SelectUnsubscribedParams] error %O", error);
         return null;
      }
      if (!value.preferences?.unsubscribe) {
         return null;
      }
      const defaults = await this.getDefaults(ctx);
      const tags = this.config.eventsCollection.eventTags.SelectUnsubscribedParams;
      const payload = {
         ...defaults,
         person: {
            ...defaults?.person,
            tags: [...(defaults?.person?.tags || []), ...tags]
         },
         type: "Unsubscribed"
      } as BossEventsCreateRequest;
      return payload;
   };
}