import { injectable } from "tsyringe";
import _debug from "debug";
import BaseEventCollectionSelector, { EventsCollectionPropertiesSelector } from "./baseEventCollectionSelector.js";
import { maybeRole } from "../../../lib/utils.js";
import { UserRole } from "../../../constants.js";
import { BossEventsCreateRequest } from "../../boss.ts";
const debug = _debug("repliers:services:SelectViewEstimateParams");
@injectable()
export default class SelectViewEstimateParams extends BaseEventCollectionSelector {
   select: EventsCollectionPropertiesSelector = async ctx => {
      try {
         const role = maybeRole(ctx.state?.["user"]?.role);
         const estimate = ctx.response.body;
         if (!this.config.eventsCollection.reportClientViewEstimate) {
            debug("reportClientViewEstimate is disabled");
            return null;
         }
         if (!estimate || !this.isEstimateModel(estimate)) {
            debug("Invalid clientId or estimate model");
            return null;
         }
         if (role && role !== UserRole.User) {
            // skipping for non-user roles
            debug("Skipping reporting view estimate for non-user roles: %s", role);
            return null;
         }
         const defaults = await this.getDefaults(ctx);
         const estimateUrl = this.getEstimateUrl(ctx.response.body);
         debug("Generating FUB params for estimate %s", estimateUrl);
         debug("Using Events Collection defaults: %O", defaults);
         const payload = {
            ...defaults,
            person: {
               ...defaults.person
            },
            type: "Visited Website - Estimate",
            description: estimateUrl ? `Estimate: ${estimateUrl}` : undefined
         } as BossEventsCreateRequest;
         return payload;
      } catch (error) {
         debug("Fail to generate FUB params due to error %O", error);
         return null;
      }
   };
}