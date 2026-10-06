import { injectable } from "tsyringe";
import _debug from "debug";
import { agentsCreateClientSchema } from "../../../validate/agent.js";
import BaseEventCollectionSelector, { EventsCollectionPropertiesSelector } from "./baseEventCollectionSelector.js";
import { RplClientsClient } from "../../../services/repliers/clients.js";
import { Context } from "koa";
import { BossEventsCreateRequest, CustomPeopleFields } from "../../../services/boss.js";
import { getBody, secureFubAvmLink } from "../../../lib/utils.js";
const debug = _debug("repliers:services:SelectAgentClientRegistrationParams");
@injectable()
export default class SelectAgentClientRegistrationParams extends BaseEventCollectionSelector {
   select: EventsCollectionPropertiesSelector = async ctx => {
      const {
         error,
         value
      } = agentsCreateClientSchema.validate({
         ...getBody(ctx.request.body),
         status: true,
         agentId: ctx.state["user"].sub
      });
      if (error) {
         debug("[SelectAgentClientRegistrationParams] error %O", error);
         return null;
      }
      const defaults = await this.getDefaults(ctx);
      const agentProps = await this.getAgent(value.agentId);
      const payload = {
         ...defaults,
         person: {
            ...this.envSpecificPersonFields(ctx),
            firstName: value.fname,
            lastName: value.lname,
            emails: [{
               value: value.email,
               type: "main"
            }],
            phones: [{
               value: value.phone,
               type: "main"
            }],
            tags: ["Registration"],
            ...agentProps
         },
         type: "Registration",
         status: true
      } as BossEventsCreateRequest;
      return payload;
   };
   envSpecificPersonFields(ctx: Context): CustomPeopleFields {
      const defaultFields = {
         customAuthType: "Agent"
      };
      if (!this.config.boss.custom_AVM_field) {
         return defaultFields;
      }
      const fieldName = this.config.boss.custom_AVM_field;
      const clientId = (ctx["body"] as RplClientsClient).clientId;
      return {
         ...defaultFields,
         [fieldName as string]: clientId ? secureFubAvmLink(this.config.eventsCollection.clientUrl, clientId.toString(), this.config.auth.agents_signature_salt) : undefined
      };
   }
}