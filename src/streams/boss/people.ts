import { JsMsg } from "@nats-io/jetstream";
import { inject, injectable } from "tsyringe";
import StreamWorker from "../worker.js";
import SyncService, { PeopleSyncPayload } from "../../services/sync.js";
import type { Logger } from "pino";
import BossWebhooksService from "../../services/boss/webhook.js";
import { BossPeopleSingle } from "../../services/boss.js";
import config from "../../config.js";

/*
* Entry point for worker processing, same as router it just calls service menthod
* Each worker process single stream, however it can call different service methods
* This one handle all events related to boss people syncing including webhooks
*/
@injectable()
export class BossPeopleWorker extends StreamWorker {
   constructor(private syncService: SyncService, private bossWebhookService: BossWebhooksService, @inject("logger.global")
   private loggerGlobal: Logger // used for contexts where no request is available
   ) {
      super();
      this.eventMap = new Map([[`${config.nats.worker.consumer_stream}.people.upsert`, this.handleUpsert.bind(this)], [`${config.nats.worker.consumer_stream}.people.create`, this.handleWebhookCreate.bind(this)], [`${config.nats.worker.consumer_stream}.people.update`, this.handleWebhookUpdate.bind(this)], [`${config.nats.worker.consumer_stream}.people.delete`, this.handleWebhookDelete.bind(this)]]);
   }
   public async handleUpsert(message: JsMsg) {
      this.loggerGlobal.info("Processing people.upsert, %o", message.json());
      const t = message.json<BossPeopleUpsertDto>();
      const {
         id,
         ...params
      } = t;
      await this.syncService.processUpsert(id, params.payload);
   }
   public async handleWebhookUpdate(message: JsMsg) {
      const params = message.json<BossPeopleWebhookUpdateDto>();
      this.loggerGlobal.info({
         data: params
      }, "[BossPeopleWorker handleWebhookUpdate]: Processing people.update event");
      await this.bossWebhookService.processPeopleUpsert(params);
   }
   public async handleWebhookDelete(message: JsMsg) {
      const params = message.json<BossPeopleWebhookDeleteDto>();
      this.loggerGlobal.info({
         data: params
      }, "[BossPeopleWorker handleWebhookDelete]: Processing people.delete event");
      await this.bossWebhookService.processPeopleDelete(params);
   }
   public async handleWebhookCreate(message: JsMsg) {
      const params = message.json<BossPeopleWebhookCreateDto>();
      this.loggerGlobal.info({
         data: params
      }, "[BossPeopleWorker handleWebhookCreate]: Processing people.create event");
      await this.bossWebhookService.processPeopleUpsert(params);
   }
}
export interface BossCorrelatedPayload {
   correlationId: string;
}
export interface BossPeopleUpsertDto extends BossCorrelatedPayload {
   id: number;
   payload: PeopleSyncPayload;
}
export interface BossPeopleWebhookCreateDto extends BossCorrelatedPayload {
   id: number;
   payload: {
      person: BossPeopleSingle;
   };
}
export interface BossPeopleWebhookUpdateDto extends BossCorrelatedPayload {
   id: number;
   payload: {
      person: BossPeopleSingle;
   };
}
export interface BossPeopleWebhookDeleteDto extends BossCorrelatedPayload {
   id: number;
   payload: {
      id: number;
   };
}
export default {
   stream: {
      name: config.nats.worker.consumer_stream,
      subjects: [`${config.nats.worker.consumer_stream}.people.*`],
      max_bytes: 1024 * 1024 * 100
   },
   consumer: {
      durable_name: config.nats.worker.consumer_name
   },
   worker: BossPeopleWorker
};