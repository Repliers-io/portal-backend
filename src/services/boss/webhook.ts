import { inject, injectable } from "tsyringe";
import ngrok from "@ngrok/ngrok";
import type { Logger } from "pino";
import _ from "lodash";
import { JetStreamClient } from "@nats-io/jetstream";
import type { AppConfig } from "../../config.js";
import BossService, { BossPeopleSingle, BossWebhookEventName } from "../boss.js";
import { BossWebhooksEventDto } from "../../validate/webhooks.js";
import { BossPeopleWebhookCreateDto, BossPeopleWebhookDeleteDto, BossPeopleWebhookUpdateDto } from "../../streams/boss/people.js";
import { WebhooksRepository } from "../../repository/webhooks.js";
import RepliersClients, { RplClientsClient } from "../../services/repliers/clients.js";
import RepliersAgents from "../../services/repliers/agents.js";
import { ApiError, ApiWarning } from "../../lib/errors.js";
import { RplOperator } from "../../types/repliers.js";
import _debug from "debug";
import { normalizePhoneNumber, secureFubAvmLink } from "../../lib/utils.js";
import { headers } from "@nats-io/transport-node";
const WEBHOOK_BASEPATH = "/api/webhooks/boss";
const WEBHOOK_BATCH_SIZE = 30;
const debug = _debug("repliers:services:boss:webhook");

/*
 * ┌─────────────┐   ┌──────────────────────────┐   ┌───────────────────────────────┐   ┌───────────────────┐
 * │             │   │                          │   │                               │   │                   │
 * │    Boss     ├──►│  BossWebhooksService     ├──►│              NATS             ├──►│  process* methods │
 * │             │   │                          │   │                               │   │    (workers)      │
 * └─────────────┘   │ - handlePeopleEvents     │   │  - boss.people.create         │   │                   │
 *                   │ - handlePeopleCreated    │   │  - boss.people.update         │   │ - processCreate   │
 *                   │ - handlePeopleUpdated    │   │  - boss.people.delete         │   │ - processUpdate   │
 *                   │ - handlePeopleDeleted    │   │                               │   │ - processDelete   │
 *                   └──────────────────────────┘   └───────────────────────────────┘   └───────────────────┘
 *
 *  1. Boss sends a webhook event (create, update, delete) to a single endpoint.
 *  2. `handlePeopleEvents` determines the event type and calls the corresponding handler:
 *     - `handlePeopleCreated` for "peopleCreated" events.
 *     - `handlePeopleUpdated` for "peopleUpdated" events.
 *     - `handlePeopleDeleted` for "peopleDeleted" events.
 *  3.  The handler creates a record in DB and publish corresponding event via NATS:
 *     - `boss.people.create`
 *     - `boss.people.update`
 *     - `boss.people.delete`
 *  4.  process* methods are executed on NATS workers side when message came from the queue
 *     process* methods updates database log for future actions if needed
 */

@injectable()
export default class BossWebhooksService {
   private baseUrl: string;
   private runningWebhooksIds: number[] = [];
   constructor(@inject("logger")
   private logger: Logger, @inject("logger.global")
   // used normally for each request
   private loggerGlobal: Logger, @inject("config")
   // used for contexts where no request is available
   private config: AppConfig, @inject("nats")
   private readonly jsc: Promise<JetStreamClient>, private boss: BossService, private webhooksRepo: WebhooksRepository, private repliersClients: RepliersClients, private repliersAgents: RepliersAgents) {
      this.baseUrl = this.config.boss.webhook.base_url;
   }
   async installHooks() {
      if (!this.config.boss.webhook.enabled) {
         this.loggerGlobal.info("[BossWebhooksService]: Webhooks are disabled, skipping webhook auto-installation, you can enable explicitly via BOSS_WEBHOOK_ENABLED = true in .env");
         return;
      }
      if (this.config.boss.webhook.enabled && !this.config.boss.enabled) {
         this.loggerGlobal.error("[BossWebhooksService]: Webhooks are enabled, but BOSS is disabled, skipping webhook auto-installation, you can enable explicitly via BOSS_ENABLED = true in .env");
         return;
      }
      if (this.config.boss.webhook.use_ngrok) {
         const ngrokListener = await ngrok.connect({
            addr: this.config.app.port,
            authtoken: this.config.ngrok.authtoken
         });
         const ngrokUrl = ngrokListener.url();
         if (ngrokUrl === null) {
            this.loggerGlobal.warn("Failed establishing ngrok connection");
         } else {
            this.loggerGlobal.info("Ngrok url: %s", ngrokUrl);
            this.baseUrl = ngrokUrl;
         }
      }
      await this.removeOldHooks();
      await this.installPeopleCreateWebhook();
      await this.installPeopleUpdateWebook();
      await this.installPeopleRemoveWebook();
   }
   async removeOldHooks() {
      this.loggerGlobal.info("[BossWebhooksService]: Checking for old/stale webhooks");
      const hooks = await this.boss.webhookList();
      if (!Array.isArray(hooks?.webhooks)) {
         this.loggerGlobal.info("[BossWebhooksService]: no old webhooks found");
         return;
      }
      for (const hook of hooks.webhooks) {
         this.loggerGlobal.info("[BossWebhooksService: removeOldHooks]: Removing webhook ID: %s", hook.id);
         await this.boss.webhookRemove(hook.id);
      }
   }
   async uninstallHooks() {
      if (!this.config.boss.webhook.enabled) {
         return;
      }
      this.loggerGlobal.info("[BossWebhooksService]: Uninstalling webhooks");
      for (const id of this.runningWebhooksIds) {
         this.loggerGlobal.info("[BossWebhooksService: uninstallHooks]: Removing webhook ID: %s", id);
         await this.boss.webhookRemove(id);
      }
   }
   async installPeopleCreateWebhook() {
      const webhookUrl = new URL(`${WEBHOOK_BASEPATH}/people`, this.baseUrl);
      const webhook = await this.boss.webhookCreate({
         event: "peopleCreated",
         url: webhookUrl.toString()
      });
      if (webhook && webhook.id) {
         this.loggerGlobal.info({
            data: webhook
         }, "[BossWebhooksService: installPeopleCreateWebhook]: People created webhook installed: %s", webhookUrl.toString());
         this.runningWebhooksIds.push(webhook.id);
      } else {
         this.loggerGlobal.warn("[BossWebhooksService: installPeopleCreateWebhook]: Failed to install People created webhook: %O", webhook);
      }
   }
   async installPeopleUpdateWebook() {
      const webhookUrl = new URL(`${WEBHOOK_BASEPATH}/people`, this.baseUrl);
      const webhook = await this.boss.webhookCreate({
         event: "peopleUpdated",
         url: webhookUrl.toString()
      });
      if (webhook && webhook.id) {
         this.loggerGlobal.info({
            data: webhook
         }, "[BossWebhooksService: installPeopleUpdateWebook]: People updated webhook installed: %s", webhookUrl.toString());
         this.runningWebhooksIds.push(webhook.id);
      } else {
         this.loggerGlobal.warn("[BossWebhooksService: installPeopleUpdateWebook]: Failed to install People updated webhook: %O", webhook);
      }
   }
   async installPeopleRemoveWebook() {
      const webhookUrl = new URL(`${WEBHOOK_BASEPATH}/people`, this.baseUrl);
      const webhook = await this.boss.webhookCreate({
         event: "peopleDeleted",
         url: webhookUrl.toString()
      });
      if (webhook && webhook.id) {
         this.loggerGlobal.info({
            data: webhook
         }, "[BossWebhooksService: installPeopleRemoveWebook]: People deleted webhook installed: %s", webhookUrl.toString());
         this.runningWebhooksIds.push(webhook.id);
      } else {
         this.loggerGlobal.warn("[BossWebhooksService: installPeopleRemoveWebook]: Failed to install People deleted webhook: %O", webhook);
      }
   }
   async handlePeopleEvents<EventType extends BossWebhookEventName>(body: BossWebhooksEventDto<EventType>) {
      this.logger.info({
         data: {
            webhookPayload: body
         }
      }, "[BossWebhooksService: handlePeopleEvents:] Handling event type: %s", body?.event);
      switch (body.event) {
         case "peopleUpdated":
            return this.handlePeopleUpdated(body as BossWebhooksEventDto<"peopleUpdated">);
         case "peopleCreated":
            return this.handlePeopleCreated(body as BossWebhooksEventDto<"peopleCreated">);
         case "peopleDeleted":
            return this.handlePeopleDeleted(body as BossWebhooksEventDto<"peopleDeleted">);
         default:
            this.logger.warn("[BossWebhooksService: handlePeopleEvents:] Unknown event type: %s", body.event);
            return;
      }
   }

   /*
    * handle* methods, accept payloads from webhooks, create jobs in DB and publish evens handled by process* methods
    */
   async handlePeopleUpdated(body: BossWebhooksEventDto<"peopleUpdated">) {
      const jsc = await this.jsc;
      for (let offset = 0; offset < body.resourceIds.length; offset += WEBHOOK_BATCH_SIZE) {
         const slice = body.resourceIds.slice(offset, offset + WEBHOOK_BATCH_SIZE);
         this.logger.info({
            data: {
               BATCH_SIZE: WEBHOOK_BATCH_SIZE,
               total: body.resourceIds.length,
               offset,
               slice
            }
         }, `Processing batch of people updated - offset: ${offset}`);
         const peopleUpdated = await this.boss.getPeople({
            id: slice,
            limit: WEBHOOK_BATCH_SIZE // we have to specify limit to be sure not default = 10 is used
         });
         const people = peopleUpdated.people.map(person => {
            return {
               payload: {
                  person
               },
               type: "peopleUpdated",
               status: "PENDING"
            };
         });
         if (people.length === 0) {
            this.logger.warn({
               data: {
                  webhookPayload: body,
                  apiResponse: peopleUpdated
               }
            }, "[BossWebhooksService: handlePeopleUpdated:] No people found during handleUpdate");
            return;
         }
         const events = await this.webhooksRepo.create(people);
         const h = headers();
         h.append("correlationId", body.correlationId);
         for (const event of events) {
            await jsc.publish(`${this.config.nats.worker.consumer_stream}.people.update`, JSON.stringify({
               id: event.id,
               payload: event.payload
            }), {
               headers: h
            });
         }
      }
   }
   async handlePeopleCreated(body: BossWebhooksEventDto<"peopleCreated">) {
      const jsc = await this.jsc;
      for (let offset = 0; offset < body.resourceIds.length; offset += WEBHOOK_BATCH_SIZE) {
         const slice = body.resourceIds.slice(offset, offset + WEBHOOK_BATCH_SIZE);
         this.logger.info({
            data: {
               BATCH_SIZE: WEBHOOK_BATCH_SIZE,
               total: body.resourceIds.length,
               offset,
               slice
            }
         }, `Processing batch of people created - offset: ${offset}`);
         const peopleCreated = await this.boss.getPeople({
            id: slice,
            limit: WEBHOOK_BATCH_SIZE
         });
         const people = peopleCreated.people.map(person => {
            return {
               payload: {
                  person
               },
               type: "peopleCreated",
               status: "PENDING"
            };
         });
         if (people.length === 0) {
            this.logger.warn({
               data: {
                  webhookPayload: body,
                  apiResponse: peopleCreated
               }
            }, "[BossWebhooksService: handlePeopleCreated:] No people found during handleCreate");
            return;
         }
         const events = await this.webhooksRepo.create(people);
         const h = headers();
         h.append("correlationId", body.correlationId);
         for (const event of events) {
            await jsc.publish(`${this.config.nats.worker.consumer_stream}.people.create`, JSON.stringify({
               id: event.id,
               payload: event.payload
            }), {
               headers: h
            });
         }
      }
   }
   async handlePeopleDeleted(body: BossWebhooksEventDto<"peopleDeleted">) {
      const jsc = await this.jsc;
      const people = body.resourceIds.map(id => {
         return {
            payload: {
               id
            },
            type: "peopleDeleted",
            status: "PENDING"
         };
      });
      const events = await this.webhooksRepo.create(people);
      const h = headers();
      h.append("correlationId", body.correlationId);
      for (const event of events) {
         await jsc.publish(`${this.config.nats.worker.consumer_stream}.people.delete`, JSON.stringify({
            id: event.id,
            payload: event.payload
         }), {
            headers: h
         });
      }
   }

   /*
    * proces* methods handles events came from NATS and do actual work
    */

   // It looks like this method is very similar to sync.ts:processUpsert, however the logic is a bit more complex so let's have both for now
   // CONTEXT: WORKER
   async processPeopleUpsert(params: BossPeopleWebhookUpdateDto | BossPeopleWebhookCreateDto) {
      const {
         id,
         payload
      } = params;
      debug("[Worker: processPeopleUpsert]: payload: %O", payload);
      try {
         const hasTags = BossService.checkTags(payload.person, this.config.boss.webhook.client_tags);
         if (!hasTags) {
            this.loggerGlobal.warn({
               data: {
                  id,
                  person: payload.person
               }
            }, "[BossWebhooksService: processPeopleUpsert]: Required Tags not found. Skipping creation");
            throw new ApiWarning("No tags found");
         }
         const email = BossService.getPrimaryEmail(payload.person.emails);
         const phone = BossService.getPrimaryPhone(payload.person.phones);
         if (phone === undefined && email === undefined) {
            this.loggerGlobal.warn({
               data: {
                  id,
                  person: payload.person
               }
            }, "[BossWebhooksService: processPeopleUpsert]: No email or phone found inside person. Skipping creation");
            throw new ApiWarning("[BossWebhooksService: processPeopleUpsert]: No email or phone found");
         }
         let agentId = this.config.repliers.clients.defaultAgentId;
         if (payload.person.assignedUserId) {
            const agent = await this.repliersAgents.filter({
               externalId: payload.person.assignedUserId?.toString()
            });
            agentId = agent.agents.at(0)?.agentId || agentId;
         }
         debug("[Worker: processPeopleUpsert]: agentId: %d", agentId);
         let extraFilter: Record<string, unknown> = {
            operator: RplOperator.OR
         };
         const normalizedPhoneValue = normalizePhoneNumber(phone?.value);

         // Lookup client by email first, then by phone
         if (email) {
            extraFilter["email"] = email.value;
         } else if (normalizedPhoneValue) {
            extraFilter["phone"] = normalizedPhoneValue;
         }
         debug("Extra filter: %O", extraFilter);
         let {
            clients: [client]
         } = await this.repliersClients.filter({
            externalId: payload.person.id.toString(),
            ...extraFilter
         });
         debug("[Worker: processPeopleUpsert]: found client: %O", client);
         const personClientData = {
            lname: payload.person.lastName,
            fname: payload.person.firstName,
            email: email?.value,
            phone: normalizedPhoneValue,
            tags: payload.person.tags,
            agentId,
            externalId: payload.person.id,
            data: {
               lastSyncOn: new Date().toISOString(),
               fub: {
                  addresses: payload.person.addresses
               }
            }
         };
         if (!client) {
            this.loggerGlobal.info({
               data: {
                  id,
                  person: payload.person
               }
            }, "[BossWebhooksService: processPeopleUpsert]: Matching Repliers Client NOT found - creating a new one");
            const clientData = {
               ...personClientData,
               status: true
            };
            client = await this.repliersClients.create(clientData);
            this.loggerGlobal.info({
               data: {
                  id,
                  client
               }
            }, "[BossWebhooksService: processPeopleUpsert]: Created Repliers client");
            debug("[Worker: processPeopleUpsert]: created client: %O", client);
         } else {
            this.loggerGlobal.info({
               data: {
                  id,
                  person: payload.person,
                  client
               }
            }, "[BossWebhooksService: processPeopleUpsert]: Found Matching Repliers Client - updating");
            const clientData = {
               ...personClientData,
               clientId: client.clientId,
               data: {
                  ...client.data,
                  ...personClientData.data
               }
            };
            const updatedClient = await this.repliersClients.update(clientData);
            this.loggerGlobal.info({
               data: {
                  id,
                  updatedClient
               }
            }, "[BossWebhooksService: processPeopleUpsert]: Updated Repliers client");
            debug("[Worker: processPeopleUpsert]: updated client: %O", updatedClient);
         }
         await this.makeSureAVMLink(id, payload.person, client);
         await this.webhooksRepo.update(id, {
            status: "SUCCESS"
         });
      } catch (error) {
         debug("[Worker: processPeopleUpsert]: failed with error: %O", error);
         await this.catchProcessingError(id, error);
         throw error;
      }
   }

   // CONTEXT: WORKER
   async processPeopleDelete(params: BossPeopleWebhookDeleteDto) {
      const {
         id,
         payload
      } = params;
      try {
         // No check for tags like in peopleCreate/peopleUpdate
         // because if deleted person don't have required tags we have to remove such client (as it not belongs to FUB),
         // and if tag is exist we also have to remove it
         const {
            clients: [client]
         } = await this.repliersClients.filter({
            externalId: payload.id.toString()
         });
         if (!client) {
            this.loggerGlobal.warn("[BossWebhooksService: processPeopleDelete]: Missing client on Repliers side with externalId: %s", payload.id.toString());
            throw new Error("Missing client on Repliers side");
         }
         await this.repliersClients.delete(client.clientId);
         await this.webhooksRepo.update(id, {
            status: "SUCCESS"
         });
      } catch (error) {
         debug("[Worker: processPeopleDelete]: failed with error: %O", error);
         await this.catchProcessingError(id, error);
         throw error;
      }
   }
   private async catchProcessingError(id: number, error: unknown) {
      let status = "UNKNOWN ERROR";
      if (error instanceof ApiError) {
         status = JSON.stringify({
            error: error.message,
            info: error.opts
         });
      } else if (error instanceof Error || error instanceof ApiWarning) {
         status = JSON.stringify({
            error: error.message
         });
      }
      debug("[Worker: catchProcessingError]: failed with error: %s", status);

      // TODO: fix this binding. Error Doesn't make it to Google logs
      const loggerFunc = error instanceof ApiWarning ? this.loggerGlobal.warn.bind(this.loggerGlobal) : this.loggerGlobal.error.bind(this.loggerGlobal);
      loggerFunc({
         data: {
            error,
            id
         }
      }, "[BossWebhooksService]: Failed with Error: %s", status);
      await this.webhooksRepo.update(id, {
         status
      });
   }
   private async makeSureAVMLink(id: number, person: BossPeopleSingle, client: RplClientsClient) {
      const fieldName = this.config.boss.custom_AVM_field;
      if (!fieldName) {
         return;
      }
      const link = secureFubAvmLink(this.config.eventsCollection.clientUrl, client.clientId.toString(), this.config.auth.agents_signature_salt);
      const existingValue = fieldName ? person[fieldName] : null;
      if (!_.isString(existingValue) || _.isEmpty(existingValue) || existingValue !== link) {
         debug(`[Worker: makeSureAVMLink]: existing value: "${existingValue}" updating link to "${link}"`);
         this.loggerGlobal.info({
            data: {
               id,
               person,
               client,
               existingValue,
               link
            }
         }, "[BossWebhooksService: makeSureAVMLink]: Updating AVM link for person");
         await this.boss.peopleUpdate(person.id.toString(), {
            [fieldName as string]: link
         });
      } else {
         debug(`[Worker: makeSureAVMLink]: no update needed, existing value "${existingValue}" is up to date.`);
      }
   }
}