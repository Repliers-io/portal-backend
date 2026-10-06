import Router from "@koa/router";
import { container } from "tsyringe";
import { bossWebhooksEventSchema } from "../../validate/webhooks.js";
import { ApiError } from "../../lib/errors.js";
import BossWebhooksService from "../../services/boss/webhook.js";
import { Logger } from "pino";
import { AsyncLocalStorage } from "node:async_hooks";
import { IAsyncLocalStore } from "../../providers/middleware/logger.js";
import { getBody } from "../../lib/utils.js";
import { Middleware } from "koa";
const router = new Router({
   prefix: "/boss"
});
const bossAuthorizer = container.resolve<Middleware>("middleware.boss.webhook.auth");
router.post('/people', bossAuthorizer, async ctx => {
   const {
      error,
      value
   } = bossWebhooksEventSchema.validate({
      ...getBody(ctx.request.body)
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const logger = ctx.state.container.resolve<Logger>("logger");
   logger.info({
      data: {
         body: value
      }
   }, "POST /people body");
   const webhooksService = ctx.state.container.resolve(BossWebhooksService);
   const store = ctx.state.container.resolve<AsyncLocalStorage<IAsyncLocalStore>>('async_local_store').getStore();
   const result = await webhooksService.handlePeopleEvents({
      ...value,
      correlationId: store?.correlationId || ''
   });
   ctx.body = result;
});
export default router;