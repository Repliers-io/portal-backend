import { injectable } from "tsyringe";
import _debug from "debug";
import BaseEventCollectionSelector, { EventsCollectionPropertiesSelector } from "./baseEventCollectionSelector.js";
import { searchesCreateSchema } from "../../../validate/searches.js";
import { RplSaveSearch } from "../../../services/repliers/searches.js";
import { getBody } from "../../../lib/utils.js";
import { BossEventsCreateRequest } from "../../boss.ts";
const debug = _debug("repliers:services:selectSaveSearchParams");
@injectable()
export default class SelectSaveSearchParams extends BaseEventCollectionSelector {
   select: EventsCollectionPropertiesSelector = async ctx => {
      const {
         error,
         value
      } = searchesCreateSchema.validate({
         ...getBody(ctx.request.body),
         clientId: ctx.state["user"].sub
      });
      if (error) {
         debug("[selectSaveSearchParams] error %O", error);
         return null;
      }
      const defaults = await this.getDefaults(ctx);
      const searchUrl = this.getSaveSearchUrl(ctx.body);
      const payload = {
         ...defaults,
         type: "Saved Property Search",
         pageUrl: defaults.pageReferrer,
         propertySearch: this.mapRplPropertySearchToBoss(value),
         description: searchUrl ? `Saved search url: ${searchUrl}` : undefined
      } as BossEventsCreateRequest;
      return payload;
   };
   isSearchModel(body: unknown): body is RplSaveSearch {
      return typeof body === "object" && body !== null && "searchId" in body;
   }
   getSaveSearchUrl(responseBody: unknown) {
      if (this.isSearchModel(responseBody) && this.config.eventsCollection.savedSearchUrl) {
         return this.config.eventsCollection.savedSearchUrl.replace("[SEARCH_ID]", responseBody.searchId.toString());
      }
      return null;
   }
}