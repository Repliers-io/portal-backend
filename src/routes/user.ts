import Router from "@koa/router";
import { container } from "tsyringe";
import { Middleware } from "koa-jwt";
import { ApiError } from "../lib/errors.js";
import UserService from "../services/user.js";
import { userUpdateSchema } from "../validate/user.js";
import assets from './user/assets.js';
import social from './user/social.js';
import boss from './user/boss.js';
import { getBody } from "../lib/utils.js";
import type { EventsCollectionMiddleware } from "../providers/middleware/eventsCollection.js";
import SelectUnsubscribedParams from "../services/eventsCollection/selectors/selectUnsubscribedParams.js";
const router = new Router({
   prefix: "/user"
});
const authMiddleware = container.resolve<Middleware>("middleware.jwt");
const pathThroughMiddleware = container.resolve<Middleware>("middleware.jwt.passthrough");

/**
 * @openapi
 * /api/user:
 *    patch:
 *       tags:
 *          - User
 *       summary: User update
 *       security:
 *          - bearerAuth: []
 *       requestBody:
 *          description: Message details, clientId is not required but taken from jwt token
 *          content:
 *             application/json:
 *                schema:
 *                   type: object
 *                   properties:
 *                      fname:
 *                         type: string
 *                      lname:
 *                         type: string
 *                      phone:
 *                         type: string
 *                      status:
 *                         type: boolean
 *                      tags:
 *                         type: array
 *                         items:
 *                            type: string
 *                      preferences:
 *                         type: object
 *                         properties:
 *                            email:
 *                               type: boolean
 *                            sms:
 *                               type: boolean
 *                            unsubscribe:
 *                               type: boolean
 *       responses:
 *          400:
 *             $ref: '#/components/responses/BadRequest'
 *          401:
 *             $ref: '#/components/responses/Unauthorized'
 */
router.patch("/", authMiddleware, async (ctx, next) => {
   ctx.state['enable.xff'] = true;
   const {
      error,
      value
   } = userUpdateSchema.validate({
      ...getBody(ctx.request.body),
      clientId: ctx.state["user"].sub
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const userService = ctx.state.container.resolve(UserService);
   ctx.body = await userService.update(value);
   next();
}, (ctx, next) => {
   const eventsCollectionMiddleware = ctx.state.container.resolve<EventsCollectionMiddleware>("middleware.eventsCollection");
   const selector = ctx.state.container.resolve(SelectUnsubscribedParams);
   const collector = eventsCollectionMiddleware({
      selector: selector.select,
      options: {
         allowIncognito: false
      }
   });
   return collector(ctx, next);
});

/**
 * @openapi
 * /api/user/me:
 *    get:
 *       tags:
 *          - User
 *       summary: Return user profile from repliers
 *       responses:
 *          200:
 *             description: Return content of jwt string
 *             content:
 *                application/json:
 *                   schema:
 *                      type: object
 *                      properties:
 *                         clientId:
 *                            type: number
 *                         agentId:
 *                            type: number
 *                         fname:
 *                            type: string
 *                         lname:
 *                            type: string
 *                         phone:
 *                            type: string
 *                            nullable: true
 *                         email:
 *                            type: string
 *                            format: email
 *                         proxyEmail:
 *                            type: string
 *                         status:
 *                            type: boolean
 *                         lastActivity:
 *                            type: string
 *                         tags:
 *                            type: string
 *                         communities:
 *                            type: array
 *                            items:
 *                               type: string
 *                         preferences:
 *                            type: object
 *                            properties:
 *                               email:
 *                                  type: boolean
 *                               sms:
 *                                  type: boolean
 *                               unsubscribe:
 *                                  type: boolean
 *                               whatsapp:
 *                                  type: boolean
 *                         expiryDate:
 *                            type: string
 *                         createdOn:
 *                            type: string
 *                         searches:
 *                            type: array
 *                            items:
 *                               $ref: '#/components/schemas/RplSavedSearch'
 *
 *          401:
 *             $ref: '#/components/responses/Unauthorized'
 */
router.get("/me", authMiddleware, async ctx => {
   ctx.state["enable.xff"] = true;
   const userService = ctx.state.container.resolve(UserService);
   ctx.body = await userService.info(ctx.state["user"].sub);
});
router.get("/agent", pathThroughMiddleware, async ctx => {
   ctx.state["enable.xff"] = true;
   const userService = ctx.state.container.resolve(UserService);
   const agent = await userService.agent(ctx.state["user"]?.sub);
   if (!agent) {
      ctx.throw(new ApiError("Agent not found", 404));
      return;
   }
   ctx.body = agent;
});
router.use(assets.routes(), assets.allowedMethods());
router.use(social.routes(), social.allowedMethods());
router.use(boss.routes(), boss.allowedMethods());
export default router;