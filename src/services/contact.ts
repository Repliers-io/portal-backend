import { inject, injectable } from "tsyringe";
import RepliersService from "./repliers.js";
import type { AppConfig } from "../config.js";
import { ContactUsDto, ScheduleEstimateDto, RequestInfoDto, ScheduleDto } from "../validate/contact.js";
import { RplMessagesSendRequest } from "./repliers/messages.js";
import SelectScheduleEstimateNoteParams from "./eventsCollection/selectors/selectScheduleEstimateNoteParams.js";
import EventsCollectionService from "./eventsCollection/eventsCollection.js";
import BaseEventCollectionSelector from "./eventsCollection/selectors/baseEventCollectionSelector.js";
import SmtpService from './smtp.js';
import { ApiError } from "../lib/errors.js";
import { BossEventsCreateRequest } from "./boss.ts";
type ContactDTO = ContactUsDto | ScheduleDto | RequestInfoDto | ScheduleEstimateDto;
@injectable()
export default class ContactService {
   constructor(@inject("config")
   private config: AppConfig, private repliers: RepliersService, private selectScheduleEstimateNoteParams: SelectScheduleEstimateNoteParams, private eventsCollectionService: EventsCollectionService, private baseEstimateSelector: BaseEventCollectionSelector, private smtp: SmtpService) {}
   async contactUs(params: ContactUsDto) {
      return this.sendEmail({
         ...(await this.defaultMessageFields(params)),
         content: {
            message: `Name: ${params.name}\n
                      email: ${params.email ?? "—"}\n
                      phone: ${params.phone ?? "—"}\n
                      message: ${params.message ?? "—"}\n`
         }
      });
   }
   async schedule(params: ScheduleDto) {
      return this.sendEmail({
         ...(await this.defaultMessageFields(params)),
         content: {
            message: `Name: ${params.name}\n
                      email: ${params.email}\n
                      phone: ${params.phone}\n
                      message: I would like to schedule a tour to
                      the property
                      mlsNumber: ${params.mlsNumber}
                      method: ${params.method}
                      on date: ${params.date} at ${params.time}
                      ${params.message ? `\nnote: ${params.message}` : ""}
                      `,
            listings: [params.mlsNumber]
            //TODO: form listing URL here?
            //links: [], //[params.listingUrl]
         }
      });
   }
   async scheduleEstimate(params: ScheduleEstimateDto) {
      const defaults = await this.defaultMessageFields(params);
      const clientUrl = this.config.eventsCollection.clientUrl.replace('[CLIENT_ID]', defaults.clientId.toString());
      const estimate = await this.repliers.estimate.get({
         estimateId: +params.estimateId
      }).then(({
         estimates
      }) => estimates[0]);
      if (!estimate) {
         throw new ApiError("Estimate not found", 404);
      }
      const estimateUrl = this.baseEstimateSelector.getEstimateUrl(estimate)!;
      await this.repliers.messages.send({
         ...defaults,
         content: {
            subject: "Client requested to schedule a meeting regarding estimate",
            message: `${params.name} requested to schedule a meeting regarding the estimate. Client email: ${params.email}\n
                      ${params.phone ? ` phone: ${params.phone}\n` : ''}
                      date: ${params.date} at ${params.time}\n
                      estimate: ${estimateUrl}\n`,
            links: [estimateUrl, clientUrl]
         }
      });
      const noteParams = await this.selectScheduleEstimateNoteParams.select({
         estimate,
         date: params.date,
         time: params.time
      });
      await this.eventsCollectionService.noteCreate({
         ...noteParams,
         clientId: params.clientId || defaults.clientId
      });
      const agentId = estimate.clientId ? (await this.repliers.clients.get(estimate.clientId)).agentId : defaults.agentId;
      const agent = await this.repliers.agents.get(agentId);
      const eventCopy = !params.clientId ? {
         message: "Client requested to schedule a meeting regarding estimate",
         description: `At ${params.date} ${params.time} regarding estimate ${estimateUrl}`
      } : {};
      const event = {
         person: {
            emails: [{
               value: params.email,
               type: "home"
            }],
            phones: [{
               value: params.phone,
               type: "home"
            }],
            name: params.name,
            tags: this.config.eventsCollection.eventTags.SelectScheduleEstimateNoteParams,
            assignedUserId: agent.externalId ? +agent.externalId : undefined,
            assignedTo: agent.externalId ? undefined : `${agent.fname} ${agent.lname}`
         },
         ...eventCopy,
         // message: "Client requested to schedule a meeting regarding estimate",
         // description: `At ${params.date} ${params.time} regarding estimate ${estimateUrl}`,
         property: {
            street: estimate.payload?.address ? this.baseEstimateSelector.addressShort(estimate.payload?.address) : undefined,
            city: estimate.payload?.address?.city
         },
         type: "Property Inquiry",
         ignoreDefaultTags: true
      } as Partial<BossEventsCreateRequest>;
      this.eventsCollectionService.eventsCreate(event);
   }
   async requestInfo(params: RequestInfoDto) {
      return this.sendEmail({
         ...(await this.defaultMessageFields(params)),
         content: {
            message: `Name: ${params.name}\n
                      email: ${params.email ?? "—"}\n
                      phone: ${params.phone ?? "—"}\n
                      message: ${params.message ?? "—"}\n`,
            listings: [params.mlsNumber]
            //TODO: form listing URL here?
            //links: [], //[params.listingUrl]
         }
      });
   }
   private async defaultMessageFields(params: ContactDTO) {
      const clientId = params?.clientId || this.config.repliers.clients.unauthenticatedClientId;
      const agentId = params.clientId ? (await this.repliers.clients.get(params.clientId)).agentId : this.config.repliers.clients.defaultAgentId;
      return {
         agentId,
         clientId,
         sender: "client"
      } as Pick<RplMessagesSendRequest, "agentId" | "clientId" | "sender">;
   }
   private async sendEmail(options: RplMessagesSendRequest) {
      if (this.config.smtp.enabled && this.config.repliers.clients.defaultAgentEmail) {
         return this.smtp.send({
            to: this.config.repliers.clients.defaultAgentEmail,
            subject: options.content?.subject || "New message from client",
            text: options.content?.message || `You have a new message from a client. ${options.clientId}`
         });
      }
      return this.repliers.messages.send(options);
   }
}