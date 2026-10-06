import { injectable } from "tsyringe";
import _debug from "debug";
import BaseEventCollectionSelector from "./baseEventCollectionSelector.js";
import { RplClientsClient } from "../../../services/repliers/clients.js";
import { BossEventsCreateRequest, CustomPeopleFields } from "../../../services/boss.js";
import { secureFubAvmLink } from "../../../lib/utils.js";
const debug = _debug("repliers:services:SelectClientRegistrationParams");
@injectable()
export default class SelectClientRegistrationParams extends BaseEventCollectionSelector {
   select = async ({
      user,
      provider,
      referer
   }: {
      user: RplClientsClient;
      provider: string;
      referer?: string;
   }): Promise<BossEventsCreateRequest | null> => {
      if (!user) {
         debug("[SelectClientRegistrationParams] user is not defined");
         return null;
      }
      const payload = {
         person: {
            ...this.envSpecificPersonFields(user, provider),
            firstName: user.fname,
            lastName: user.lname,
            emails: [{
               value: user.email,
               type: "main"
            }],
            phones: user.phone ? [{
               value: user.phone,
               type: "main"
            }] : [],
            tags: ["Registration"]
         },
         type: "Registration",
         occurredAt: new Date().toISOString(),
         pageReferrer: referer
      } as BossEventsCreateRequest;
      return payload;
   };
   envSpecificPersonFields(user: RplClientsClient, provider: string): CustomPeopleFields {
      const defaultFields = {
         customAuthType: provider
      };
      if (!this.config.boss.custom_AVM_field) {
         return defaultFields;
      }
      const fieldName = this.config.boss.custom_AVM_field;
      const clientId = user.clientId;
      return {
         ...defaultFields,
         [fieldName as string]: clientId ? secureFubAvmLink(this.config.eventsCollection.clientUrl, clientId.toString(), this.config.auth.agents_signature_salt) : undefined
      };
   }
}