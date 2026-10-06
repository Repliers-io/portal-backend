import { injectable, inject } from "tsyringe";
import _debug from "debug";
import BaseEventCollectionSelector, { EventsCollectionPropertiesSelector } from "./baseEventCollectionSelector.js";
import { AgentCreateEstimateDto, agentsCreateEstimateSchema } from "../../../validate/agent.js";
import RepliersService from "../../../services/repliers.js";
import { type AppConfig } from "../../../config.js";
import UserService from "../../../services/user.js";
import RepliersAgents from "../../../services/repliers/agents.js";
import BossService, { BossEventsCreateRequest } from "../../../services/boss.js";
import { getBody } from "../../../lib/utils.js";
const debug = _debug("repliers:services:SelectAgentEstimateParams");
@injectable()
export default class SelectAgentEstimateParams extends BaseEventCollectionSelector {
   constructor(protected usersService: UserService, protected repliers: RepliersService, protected agentsService: RepliersAgents, protected bossService: BossService, @inject("config")
   protected config: AppConfig) {
      super(repliers, agentsService, bossService, config);
   }
   select: EventsCollectionPropertiesSelector = async ctx => {
      try {
         const {
            error,
            value
         } = agentsCreateEstimateSchema.validate({
            ...getBody(ctx.request.body),
            clientId: ctx["params"].clientId,
            agentId: ctx.state["user"].sub
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
         const agentProps = await this.getAgent(value.agentId);
         const payload = {
            ...defaults,
            person: {
               ...defaults.person,
               ...(await this.getOwner(value)),
               tags: [...this.getSellIntentionTag(value), ...(defaults.person.tags || [])],
               ...agentProps
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
   async getOwner(estimate: AgentCreateEstimateDto) {
      if (estimate.clientId) {
         const client = await this.usersService.info(estimate.clientId);
         return client ? {
            emails: [{
               value: client.email,
               type: "main"
            }],
            phones: [{
               value: client.phone,
               type: "main"
            }]
         } : {};
      }
      return {};
   }
}