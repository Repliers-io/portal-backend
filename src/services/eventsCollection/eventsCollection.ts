import { injectable, inject } from "tsyringe";
import _debug from "debug";
import BossService, { BossEventsCreateRequest, BossNoteCreateRequest } from "../boss.js";
import type { AppConfig } from "../../config.js";
import { Context } from "koa";
import UserService from "../../services/user.js";
const debug = _debug("repliers:services:eventsCollection");
export type EventsCollectionPropertiesSelector = (ctx: Context) => Promise<BossEventsCreateRequest | null>;
export type NotesCollectionPropertiesSelector = (ctx: Context) => Promise<BossNoteCreateRequest | null>;
@injectable()
export default class EventsCollectionService {
   constructor(private boss: BossService, private userService: UserService, @inject("config")
   private config: AppConfig) {}
   eventsCreate(params: Partial<BossEventsCreateRequest>) {
      const {
         ignoreDefaultTags,
         ...rest
      } = params;
      debug("[reportEvent] params %O", params);
      this.boss.eventsCreate({
         ...this.config.eventsCollection.defaultEventFields,
         ...rest,
         person: {
            ...params.person,
            ...this.assignAgent(params.person),
            tags: ignoreDefaultTags ? params.person?.tags : this.assignTags(params.person)
         }
      }).then(r => {
         debug("[reportEvent] succeed %O", r);
      }).catch(e => {
         debug("[reportEvent] error %O", e);
      });
   }
   async noteCreate(params: BossNoteCreateRequest) {
      debug("[noteCreate] params %O", params);
      const {
         clientId,
         personId,
         ...rest
      } = params;
      this.getPersonId({
         clientId,
         personId
      }).then(personId => {
         debug("[noteCreate] personId %O", personId);
         this.boss.noteCreate({
            personId,
            ...rest
         }).then(r => {
            debug("[noteCreate] succeed %O", r);
         }).catch(e => {
            debug("[noteCreate] boss.noteCreate: error %O", e);
         });
      }).catch(e => {
         debug("[noteCreate] getPersonId: error %O", e);
      });
   }
   private async getPersonId(params: {
      personId?: string | number | undefined;
      clientId?: number | string | undefined;
   }): Promise<number> {
      if (params.personId) return +params.personId;
      if (!params.clientId) throw new Error("personId or clientId is required");
      const client = await this.userService.info(+params.clientId);
      if (client.externalId) return +client.externalId;
      // axios drops undefined params: getPeople({ email: undefined }) would match everyone.
      if (!client.email) throw new Error(`Person not found for clientId: ${params.clientId}`);
      const bossPersons = await this.boss.getPeople({
         email: client.email
      });
      const id = bossPersons?.people?.[0]?.id;
      if (!id) throw new Error(`Person not found for clientId: ${params.clientId}`);
      return id;
   }
   assignAgent(person: BossEventsCreateRequest["person"]) {
      /**
       * NOTICE: this fix now prevents leads flipping from their agent
       * which is unknown to this system to default agent
       *
       * specificalluy commenting of this line
       * assignedTo: person?.assignedTo || defaultPersonFields.assignedTo
       *
       * The same fix leads to defaultPersonFields.assignedTo not being set on new leads
       * In order for new leads to be properly assigned to the default agent, FUB API KEY
       * boss.username - should be created by Default Agent user inside FUB Dashboard
       */
      // const defaultPersonFields = this.config.eventsCollection.defaultPersonFields;

      // return person?.assignedUserId ? {
      //   assignedUserId: person.assignedUserId,
      // } : {
      //   assignedTo: person?.assignedTo || defaultPersonFields.assignedTo
      // }

      if (person?.assignedUserId) {
         return {
            assignedUserId: person.assignedUserId
         };
      } else if (person?.assignedTo) {
         return {
            assignedTo: person.assignedTo
         };
      } else {
         return {};
      }
   }
   assignTags(person: BossEventsCreateRequest["person"]) {
      const defaultPersonFields = this.config.eventsCollection.defaultPersonFields;
      return [...(defaultPersonFields.tags || []), ...(person?.tags || [])];
   }
}