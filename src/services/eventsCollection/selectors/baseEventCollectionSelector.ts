import { Context } from "koa";
import BossService, { BossEventPerson, BossEventProperty, BossEventPropertySearch, BossEventsCreateRequest } from "../../boss.js";
import RepliersService from "../../repliers.js";
import { inject, injectable } from "tsyringe";
import { type AppConfig } from "../../../config.js";
import { listingsSingleSchema } from "../../../validate/listings.js";
import _debug from "debug";
import { RplListingsSingleResponse } from "../../repliers/listings.js";
import { RplType } from "../../../types/repliers.js";
import { RplSearchesCreateDto } from "../../repliers/searches.js";
import RepliersAgents from "../../repliers/agents.js";
import { RplEstimateAddDto, RplEstimateCore } from "../../../services/repliers/estimate.js";
const debug = _debug("repliers:services:BaseEventCollectionSelector");
export type EventsCollectionPropertiesSelector = (ctx: Context) => Promise<BossEventsCreateRequest | null>;

/** An instance may make email or phone optional, and the CRM must not receive an empty entry. */
export const contactEntries = (email?: string, phone?: string): Pick<BossEventPerson, "emails" | "phones"> => ({
   ...(email ? {
      emails: [{
         value: email,
         type: "main"
      }]
   } : {}),
   ...(phone ? {
      phones: [{
         value: phone,
         type: "main"
      }]
   } : {})
});
@injectable()
export default class BaseEventCollectionSelector {
   constructor(protected repliers: RepliersService, protected agentsService: RepliersAgents, protected bossService: BossService, @inject("config")
   protected config: AppConfig) {}

   /**
    * TODO: fixme
    * 1. pass app_state from context
    * 2. fetch person details from repliers
    * 3. fetch agent from repleirs
    * 4. Set person fields
    */

   async getPerson(email: string, defaults: Partial<BossEventPerson> = {}): Promise<BossEventPerson> {
      // todo: fetch person info if needed
      // const owner = await this.repliers.clients.get(estimate.clientId);
      // const agent = await this.repliers.agents.get(owner.agentId);
      // assignedUserId: agent.externalId ? +agent.externalId : undefined,
      // assignedTo: agent.externalId ? undefined : `${agent.fname} ${agent.lname}`,
      return {
         ...defaults,
         emails: [{
            value: email,
            type: "main"
         }]
      };
   }
   async getDefaults(ctx: Context) {
      return {
         pageReferrer: ctx.request.headers.referer,
         occurredAt: new Date().toISOString(),
         person: await this.getPerson(ctx.state["user"]?.email)
      };
   }
   buildPropertyUrl(mlsNumber: number | string, boardId?: number) {
      if (boardId) {
         return this.config.eventsCollection.propertyUrl.replace("[MLS_NUMBER]", mlsNumber.toString()).replace("[BOARD_ID]", boardId.toString());
      }
      return this.config.eventsCollection.propertyUrl.replace("[MLS_NUMBER]", mlsNumber.toString()).replace("boardId=[BOARD_ID]", "");
   }
   mapRplPropertyToBoss(property: RplListingsSingleResponse): BossEventProperty {
      return {
         street: this.addressShort(property.address),
         city: property.address?.["city"] as string,
         state: property.address?.["state"] as string,
         code: property.address?.["zip"] as string,
         mlsNumber: property?.["mlsNumber"],
         price: Number(property?.["listPrice"]),
         forRent: property?.["type"]?.toLowerCase() === RplType.Lease,
         type: property?.["type"],
         bedrooms: property?.["details"]?.["numBedrooms"] as string,
         bathrooms: property?.["details"]?.["numBathrooms"] as string
      };
   }
   async getProperty(mlsNumber: string, boardId?: number): Promise<BossEventProperty> {
      const pageUrl = this.buildPropertyUrl(mlsNumber, boardId);
      const defaults = {
         mlsNumber,
         url: pageUrl
      };
      const payload = {
         mlsNumber,
         boardId: boardId || this.config.eventsCollection.defaultBoardId
      };
      const {
         error,
         value
      } = listingsSingleSchema.validate(payload);
      if (error) {
         debug("[getProperty] error %O", error);
         return defaults;
      }
      try {
         const data = await this.repliers.listings.single({
            ...value
         });
         return {
            ...defaults,
            ...this.mapRplPropertyToBoss(data)
         };
      } catch (err) {
         debug("[getProperty] error %O", err);
         return defaults;
      }
   }

   // Repliers sends null street parts for commercial/land listings (e.g. S6243706).
   addressShort(address: RplListingsSingleResponse["address"]) {
      const {
         streetNumber,
         streetName,
         streetSuffix,
         unitNumber
      } = address ?? {};
      const formattedUnitNumber = unitNumber ? `#${unitNumber} - ` : "";
      const formattedStreetNumber = this.sanitizedStreetNumber(streetNumber as string);
      return [formattedUnitNumber + formattedStreetNumber, this.capitalize(streetName as string), streetSuffix].filter(Boolean).join(" ");
   }
   sanitizedStreetNumber(streetNumber: string) {
      if (streetNumber === "00" || streetNumber === "0" || !streetNumber) return "";
      return streetNumber;
   }
   capitalize(str?: string | null) {
      if (!str) return "";
      return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
   }
   mapRplPropertySearchToBoss(propertySearch: RplSearchesCreateDto): BossEventPropertySearch {
      return {
         // @ts-expect-error bad type? class is an array
         type: propertySearch["class"].join(","),
         neighborhood: propertySearch["neighborhoods"],
         city: propertySearch["cities"]?.join(","),
         state: propertySearch["areas"]?.join(","),
         // not sure about this one
         minPrice: propertySearch["minPrice"],
         maxPrice: propertySearch["maxPrice"],
         minBedrooms: propertySearch["minBeds"] || propertySearch["minBedrooms"],
         maxBedrooms: propertySearch["maxBeds"] || propertySearch["maxBedrooms"],
         minBathrooms: propertySearch["minBaths"] || propertySearch["minBathrooms"],
         maxBathrooms: propertySearch["maxBaths"] || propertySearch["maxBathrooms"]
         // code?: string[]; // completely no idea about this one
      };
   }
   async getAgent(agentId: number): Promise<{
      assignedUserId?: number;
      assignedTo?: string;
   }> {
      const agent = await this.agentsService.get(agentId);
      if (agent.externalId) {
         return {
            assignedUserId: +agent.externalId
         };
      }
      const agentName = `${agent.fname} ${agent.lname}`;
      const {
         users
      } = await this.bossService.getUsers({
         name: agentName
      });
      return users?.[0] ? {
         assignedUserId: users[0].id
      } : {};
   }
   getSellIntentionTag(estimate: RplEstimateAddDto): string[] {
      const tagsMap = {
         asap: "Sell ASAP",
         "3months": "Sell in 1-3 Months",
         "6months": "Sell in 3-6 Months",
         "12months": "Sell in 6-12 Months",
         other: "Sell just Curious"
      };
      const sellingTimeline = estimate.data?.salesIntentions?.sellingTimeline as keyof typeof tagsMap;
      const intentionTag = tagsMap[sellingTimeline];
      return intentionTag ? [intentionTag] : [];
   }
   getEstimateUrl(responseBody: unknown) {
      if (this.isEstimateModel(responseBody)) {
         const useUlid = this.config.eventsCollection.estimateUrl.includes("[ULID]");
         const value = useUlid ? responseBody.ulid : responseBody.estimateId.toString();
         const key = useUlid ? "[ULID]" : "[ESTIMATE_ID]";
         return this.config.eventsCollection.estimateUrl.replace(key, value || "");
      }
      return null;
   }
   isEstimateModel(body: unknown): body is RplEstimateCore {
      return typeof body === "object" && body !== null && "estimate" in body;
   }
   stringifyIfSet(value?: string | number | null): string | undefined {
      return typeof value === "undefined" || value === null ? undefined : value.toString();
   }
   formatPrice(price?: number): string {
      if (typeof price !== "number" || isNaN(price)) {
         return "unknown price";
      }
      return new Intl.NumberFormat("en-US", {
         style: "currency",
         currency: "USD",
         notation: "compact"
      }).format(price);
   }
}