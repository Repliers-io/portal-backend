import axios, { Axios, AxiosRequestConfig } from "axios";
import { inject, injectable } from "tsyringe";
import type { AppConfig } from "../config.js";
import { ApiError } from "../lib/errors.js";
import type { Logger } from "pino";
export type ApiMethod = "POST" | "GET" | "DELETE" | "PUT";
export type BossWebhooksStatus = "Active" | unknown;
export type BossWebhookEventName = "peopleCreated" | "peopleUpdated" | "peopleDeleted" | "peopleTagsCreated" | "peopleStageUpdated" | "peopleRelationshipCreated" | "peopleRelationshipUpdated" | "peopleRelationshipDeleted" | "notesCreated" | "notesUpdated" | "notesDeleted" | "emailsCreated" | "emailsUpdated" | "emailsDeleted" | "tasksCreated" | "tasksUpdated" | "tasksDeleted" | "appointmentsCreated" | "appointmentsUpdated" | "appointmentsDeleted" | "textMessagesCreated" | "textMessagesUpdated" | "textMessagesDeleted" | "callsCreated" | "callsUpdated" | "callsDeleted" | "emEventsOpened" | "emEventsClicked" | "emEventsUnsubscribed" | "dealsCreated" | "dealsUpdated" | "dealsDeleted" | "stageCreated" | "stageUpdated" | "stageDeleted" | "eventsCreated";
export type BossCollection = "users" | "people" | "webhooks";
export interface ApiRequest {
   [key: string]: unknown;
}
export interface ApiResponse {
   [key: string]: unknown;
}
export type BossCollectionResponse<Collection extends BossCollection> = ApiResponse & {
   _metadata: {
      collection: Collection;
      offset: number;
      limit: number;
      total: number;
      next: unknown | null;
      nextLink: string | null;
   };
} & { [key in Collection]: unknown[] };
export interface BossEventPerson {
   id?: number;
   firstName?: string | undefined;
   lastName?: string | undefined;
   stage?: string | undefined;
   source?: string | undefined;
   sourceUrl?: string | undefined;
   contacted?: boolean | undefined;
   price?: number | undefined;
   assignedTo?: string | undefined;
   assignedLenderName?: string | undefined;
   assignedUserId?: number | undefined;
   emails?: Array<{
      value: string | undefined;
      type: string | undefined;
   }>;
   phones?: Array<{
      value?: string | undefined;
      type?: string | undefined;
   }>;
   addresses?: Array<{
      type?: string | undefined;
      street?: string | undefined;
      city?: string | undefined;
      state?: string | undefined;
      code?: string | undefined;
      country?: string | undefined;
   }>;
   tags?: string[] | undefined;
   [custom: string]: string | unknown;
}
export interface BossEventCampaign {
   source: string;
   medium?: string;
   term?: string;
   content?: string;
   campaign?: string;
}
export interface BossEventPropertySearch {
   type?: string | undefined;
   neighborhood?: string | undefined;
   city?: string | undefined;
   state?: string | undefined;
   code?: string[] | undefined;
   minPrice?: number | undefined;
   maxPrice?: number | undefined;
   minBedrooms?: number | undefined;
   maxBedrooms?: number | undefined;
   minBathrooms?: number | undefined;
   maxBathrooms?: number | undefined;
}
export interface BossEventProperty {
   street?: string | undefined;
   city?: string | undefined;
   state?: string | undefined;
   code?: string | undefined;
   mlsNumber?: string | undefined;
   price?: number | undefined;
   forRent?: boolean | undefined;
   url?: string | undefined;
   type?: string | undefined;
   bedrooms?: string | undefined;
   bathrooms?: string | undefined;
   area?: string | undefined;
   lot?: string | undefined;
}
export interface BossEventEstimatedProperty {
   address: string;
   style: string;
   type: string;
   yearBuilt: string | undefined;
   sqft: string | undefined;
   bedrooms: string | undefined;
   bathrooms: string | undefined;
   garageSpaces: string | undefined;
}
export type BossEventType = "Registration" | "Inquiry" | "Seller Inquiry" | "Property Inquiry" | "General Inquiry" | "Viewed Property" | "Saved Property" | "Visited Website" | "Incoming Call" | "Unsubscribed" | "Property Search" | "Saved Property Search" | "Visited Open House" | "Visited Website - Estimate" | "Viewed Page";
export interface BossEventsCreateRequest extends ApiRequest {
   source?: string | undefined;
   system?: string | undefined;
   type?: BossEventType | undefined;
   message?: string | undefined;
   description?: string | undefined;
   person?: BossEventPerson | undefined;
   property?: BossEventProperty | undefined;
   propertySearch?: BossEventPropertySearch | undefined;
   campaign?: BossEventCampaign | undefined;
   pageTitle?: string | undefined;
   pageUrl?: string | undefined;
   pageReferrer?: string | undefined;
   pageDuration?: number | undefined;
   occurredAt?: string | undefined;
   ignoreDefaultTags?: boolean | undefined;
}
export interface BossNoteCreateRequest extends ApiRequest {
   personId?: number | undefined;
   clientId?: number | undefined;
   subject: string;
   body: string;
   isHtml: boolean;
}
export interface BossEventsCreateResponse extends ApiResponse {}
export interface BossUsersGetRequest extends ApiRequest {
   limit?: number;
   offset?: number;
   sort?: string;
   role?: string; // is it static?
   name?: string;
   email?: string;
   fields?: string;
   includeDeleted?: boolean;
}
export interface BossUsersGetResponse extends BossCollectionResponse<"users"> {
   users: Array<{
      id: number;
      created: string;
      updated: string;
      name: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      role: string;
      status: string;
      timezone: string;
      beta: boolean;
      picture: Record<string, string>;
      pauseLeadDistribution: boolean;
      lastSeenIos: null | string;
      lastSeenAndroid: null | string;
      lastSeenFub2: string;
      canExport: boolean;
      canCreateApiKeys: boolean;
      isOwner: boolean;
      groups: Array<{
         id: number;
         name: string;
      }>;
      teamIds: number[];
      teamLeaderOf: unknown[];
      leadEmailAddress: string;
   }>;
}
export type CustomBossField = `custom${string}`;
export type CustomPeopleFields = {
   customAuthType?: string | undefined;
} & Record<CustomBossField, string | undefined>;
export type BossPeopleSingle = {
   id: number;
   created: string;
   updated: string;
   createdVia: string; // API | string
   lastActivity: string;
   name: string;
   firstName: string;
   lastName: string;
   stage: string; // Lead | string
   source: string;
   sourceUrl: string;
   contacted: number;
   price: number;
   timeFrameId: number;
   assignedLenderId: number | null;
   assignedLenderName: string | null;
   assignedUserId: number | null | undefined;
   assignedTo: string;
   collaborators: Array<{
      id: number;
      name: string;
      assigned: boolean;
      role: string; // Broker | string
   }>;
   emails: Array<{
      type: string;
      value: string;
      status: "Valid" | string;
      isPrimary: BossNumericBoolean;
   }>;
   phones: Array<{
      value: string;
      type: string;
      status: "Valid" | string;
      isPrimary: BossNumericBoolean;
      normalized: string;
      isLandline: boolean;
      isOnboardingNumber: boolean;
   }>;
   picture: Record<string, string> | null;
   addresses: Array<unknown>;
   tags: string[];
} & CustomPeopleFields;
export type BossNumericBoolean = 1 | 0;
export type BossContactStatus = "Valid" | "Invalid";
export type BossPeopleSort = "id" | "created" | "updated" | "name" | "firstName" | "lastName" | "price" | "stage" | "lastActivity" | "lastCommunication" | "lastReceivedEmail" | "lastSentEmail" | "lastEmail" | "emailsReceived" | "emailsSent" | "lastIncomingCall" | "lastOutgoingCall" | "lastCall" | "firstCall" | "callsIncoming" | "callsOutgoing" | "callsDuration" | "lastReceivedText" | "lastSentText" | "lastText" | "lastLeadActivity" | "lastEmEventActivity" | "lastIdxVisit" | "textsReceived" | "textsSent" | "propertiesViewed" | "propertiesSaved" | "pagesViewed" | "nextTask";
export interface BossPeopleGetRequest extends ApiRequest {
   id?: string | number[];
   sort?: BossPeopleSort;
   limit?: number;
   offset?: number;
   fields?: string;
   lastActivityAfter?: string;
   lastActivityBefore?: string;
   name?: string;
   firstName?: string;
   lastName?: string;
   email?: string;
   phone?: string;
   stage?: string;
   source?: string;
   assignedTo?: string;
   assignedUserId?: number;
   assignedLenderId?: number;
   assignedLenderName?: string;
   contacted?: boolean;
   priveAbove?: number;
   priveBelow?: number;
   smartListId?: number;
   includeTrash?: boolean;
   includeUnclaimed?: boolean;
   tags?: string;
   [custom: `custom${string}`]: string | undefined;
}
export interface BossWebhooksSingle<Event extends BossWebhookEventName = BossWebhookEventName> {
   id: number;
   status: BossWebhooksStatus;
   event: Event;
   url: string;
}
export interface BossPeopleGetResponse extends BossCollectionResponse<"people"> {
   people: Array<BossPeopleSingle>;
}
export interface BossWebhooksCreateRequest<Event extends BossWebhookEventName> extends ApiRequest {
   event: Event;
   url: string;
}
export interface BossWebookCreateResponse<Event extends BossWebhookEventName> extends ApiResponse, BossWebhooksSingle<Event> {}
export interface BossWebhooksListResponse extends BossCollectionResponse<"webhooks"> {
   webhooks: Array<BossWebhooksSingle>;
}
@injectable()
export default class BossService {
   private axios: Axios;
   private isEnabled: boolean;
   constructor(@inject("config")
   private config: AppConfig, @inject("logger.global")
   private loggerGlobal: Logger // used for contexts where no request is available
   ) {
      this.isEnabled = this.config.boss.enabled;
      this.axios = axios.create({
         baseURL: this.config.boss.base_url,
         timeout: this.config.boss.timeout_ms,
         headers: {
            "Content-Type": "application/json",
            accept: "application/json",
            "X-System": this.config.boss.system,
            "X-System-Key": this.config.boss.system_key
         },
         auth: {
            username: this.config.boss.username,
            password: this.config.boss.password
         }
      });
   }
   private async request<Response>(method: ApiMethod, url: string, params: ApiRequest): Promise<Response> {
      if (!this.isEnabled) {
         this.loggerGlobal.warn(`[BossService]: Boss API is disabled, skipping request ${method} ${url}`);
         return {} as Response;
      }
      let options: AxiosRequestConfig = {
         method,
         url
      };
      if (method === "POST" || method === "PUT") {
         options = {
            ...options,
            data: params
         };
      } else {
         options = {
            ...options,
            params
         };
      }
      return this.axios.request(options).then(axiosResponse => {
         // TODO: error handling
         return axiosResponse.data;
      }).catch(e => {
         throw new ApiError("Boss API error", e.response?.status, e.response?.data);
      });
   }
   public async eventsCreate(params: BossEventsCreateRequest) {
      return this.request<BossEventsCreateResponse>("POST", "/events", {
         ...params
      });
   }
   public async noteCreate(params: BossNoteCreateRequest) {
      return this.request<never>("POST", "/notes", {
         ...params
      });
   }
   public async getUsers(params: BossUsersGetRequest) {
      return this.request<BossUsersGetResponse>("GET", "/users", {
         ...params
      });
   }
   public async getPeople(params: BossPeopleGetRequest) {
      // defalt fields to minimize traffic, but can be owerriden
      let fields = "id,name,firstName,lastName,emails,phones,picture,tags,assignedUserId,addresses";
      const customAVMFieldName = this.config.boss.custom_AVM_field;
      if (customAVMFieldName && 0 < customAVMFieldName?.length) {
         fields += `,${customAVMFieldName}`;
      }
      return this.request<BossPeopleGetResponse>("GET", "/people", {
         fields,
         ...params
      });
   }
   public async webhookCreate<Event extends BossWebhookEventName>(params: BossWebhooksCreateRequest<Event>) {
      return this.request<BossWebookCreateResponse<Event>>("POST", "/webhooks", {
         ...params
      });
   }
   public async webhookRemove(id: number) {
      return this.request("DELETE", `/webhooks/${id}`, {});
   }
   public async webhookList() {
      return this.request<BossWebhooksListResponse>("GET", "/webhooks", {});
   }
   public async peopleUpdate(id: string, params: Partial<BossPeopleSingle>) {
      return this.request("PUT", `/people/${id}`, params);
   }
   public static getPrimaryEmail(emails: BossPeopleSingle["emails"] | null | undefined) {
      return emails?.find(email => email.status === "Valid" && email.isPrimary === 1);
   }
   public static getPrimaryPhone(phones: BossPeopleSingle["phones"] | null | undefined) {
      return phones?.find(phone => phone.status === "Valid" && phone.isPrimary === 1);
   }
   public static checkTags(person: BossPeopleSingle, config_tags: string) {
      const commonTags = (person.tags ?? []).filter(value => config_tags.split(',').includes(value));
      return commonTags.length > 0;
   }
}