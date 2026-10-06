import { injectable } from "tsyringe";
import _debug from "debug";
import BaseEventCollectionSelector, { EventsCollectionPropertiesSelector } from "./baseEventCollectionSelector.js";
import { favoritesCreateSchema } from "../../../validate/favorites.js";
import { getBody } from "../../../lib/utils.js";
import { BossEventsCreateRequest } from "../../boss.ts";
const debug = _debug("repliers:services:selectSavePropertyParams");
@injectable()
export default class SelectSavePropertyParams extends BaseEventCollectionSelector {
   select: EventsCollectionPropertiesSelector = async ctx => {
      const {
         error,
         value
      } = favoritesCreateSchema.validate({
         ...getBody(ctx.request.body),
         clientId: ctx.state["user"]?.sub
      });
      if (error) {
         debug("[selectSavePropertyParams] error %O", error);
         return null;
      }
      const {
         mlsNumber,
         boardId
      } = value;
      const pageUrl = this.buildPropertyUrl(mlsNumber, boardId);
      const defaults = await this.getDefaults(ctx);
      const payload = {
         ...defaults,
         type: 'Saved Property',
         pageUrl,
         pageReferrer: defaults.pageReferrer || pageUrl,
         property: await this.getProperty(mlsNumber, boardId)
      } as BossEventsCreateRequest;
      return payload;
   };
}