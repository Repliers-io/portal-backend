import { injectable } from "tsyringe";
import _debug from "debug";
import BaseEventCollectionSelector, { EventsCollectionPropertiesSelector } from "./baseEventCollectionSelector.js";
import { RplListingsSingleResponse } from "../../../services/repliers/listings.js";
import { BossEventsCreateRequest } from "../../boss.ts";
@injectable()
export default class SelectViewPropertyParams extends BaseEventCollectionSelector {
   select: EventsCollectionPropertiesSelector = async ctx => {
      const defaults = await this.getDefaults(ctx);
      const property = ctx.body as RplListingsSingleResponse;
      const pageUrl = this.buildPropertyUrl(property?.mlsNumber, property?.boardId);
      // A client asked to report only Viewed Property; Visited Open House is experimentally off for all clients
      // const hasOpenHouse = !!property.openHouse && !!Object.values(property.openHouse).find(openHouse => openHouse["date"]); // perhaps a helper function? not sure about location

      const payload = {
         ...defaults,
         type: 'Viewed Property',
         pageUrl,
         property: this.mapRplPropertyToBoss(property),
         pageReferrer: defaults.pageReferrer || pageUrl
      } as BossEventsCreateRequest;
      return payload;
   };
}