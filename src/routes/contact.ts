import Router from "@koa/router";
import { container } from "tsyringe";
import { Middleware } from "koa-jwt";
import { ApiError } from "../lib/errors.js";
import { getBody, maybeClientId } from "../lib/utils.js";
import { contactSchema, requestInfoSchema, scheduleEstimateSchema, scheduleSchema, subscribeNewsletterSchema } from "../validate/contact.js";
import ContactService from "../services/contact.js";
import type { EventsCollectionMiddleware } from "../providers/middleware/eventsCollection.js";
import SelectContactUsParams from "../services/eventsCollection/selectors/selectContactUsParams.js";
import SelectRequestInfoParams from "../services/eventsCollection/selectors/selectRequestInfoParams.js";
import SelectScheduleParams from "../services/eventsCollection/selectors/selectScheduleParams.js";
import SelectSubscribeNewsletterParams from "../services/eventsCollection/selectors/selectSubscribeNewsletterParams.js";
const router = new Router({
   prefix: "/contact"
});
const authMiddleware = container.resolve<Middleware>("middleware.jwt.passthrough");

/**
 * @openapi
 * /api/contact/contactus:
 *    post:
 *       tags:
 *          - Contacts
 *       summary: Contact us endpoint
 *       security:
 *          - bearerAuth: []
 *       requestBody:
 *          description: Message details
 *          content:
 *             application/json:
 *                schema:
 *                   type: object
 *                   properties:
 *                      name:
 *                         $ref: '#/components/schemas/ContactName'
 *                      email:
 *                         $ref: '#/components/schemas/ContactEmail'
 *                      phone:
 *                         $ref: '#/components/schemas/ContactPhone'
 *                      message:
 *                         $ref: '#/components/schemas/ContactMessage'
 *                   required: [name, email, phone, message]
 *       responses:
 *          400:
 *             $ref: '#/components/responses/BadRequest'
 *          401:
 *             $ref: '#/components/responses/Unauthorized'
 */
router.post("/contactus", authMiddleware, async (ctx, next) => {
   ctx.state['enable.xff'] = true;
   const {
      error,
      value
   } = contactSchema.validate({
      ...getBody(ctx.request.body),
      clientId: maybeClientId(ctx.state?.["user"]?.sub)
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const contactService = ctx.state.container.resolve(ContactService);
   await contactService.contactUs(value);
   ctx.body = "OK";
   next();
}, (ctx, next) => {
   const eventsCollectionMiddleware = ctx.state.container.resolve<EventsCollectionMiddleware>("middleware.eventsCollection");
   const selectContactUsParams = ctx.state.container.resolve(SelectContactUsParams);
   const contactUsCollector = eventsCollectionMiddleware({
      selector: selectContactUsParams.select,
      options: {
         allowIncognito: true
      }
   });
   return contactUsCollector(ctx, next);
});

/**
 * @openapi
 * /api/contact/schedule:
 *    post:
 *       tags:
 *          - Contacts
 *       summary: /api/contact/schedule, please fill more detailed summary
 *       security:
 *          - bearerAuth: []
 *       requestBody:
 *          description: Message details
 *          content:
 *             application/json:
 *                schema:
 *                   type: object
 *                   properties:
 *                      name:
 *                         $ref: '#/components/schemas/ContactName'
 *                      email:
 *                         $ref: '#/components/schemas/ContactEmail'
 *                      phone:
 *                         $ref: '#/components/schemas/ContactPhone'
 *                      method:
 *                         $ref: '#/components/schemas/ContactScheduleMethod'
 *                      date:
 *                         $ref: '#/components/schemas/RplDate'
 *                      time:
 *                         type: string
 *                         minLength: 4
 *                         maxLength: 12
 *                      mlsNumber:
 *                         $ref: '#/components/schemas/mlsNumber'
 *                      clientId:
 *                         type: integer
 *       responses:
 *          400:
 *             $ref: '#/components/responses/BadRequest'
 *          401:
 *             $ref: '#/components/responses/Unauthorized'
 */
router.post("/schedule", authMiddleware, async (ctx, next) => {
   ctx.state['enable.xff'] = true;
   const {
      error,
      value
   } = scheduleSchema.validate({
      ...getBody(ctx.request.body),
      clientId: maybeClientId(ctx.state?.["user"]?.sub)
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const contactService = ctx.state.container.resolve(ContactService);
   await contactService.schedule(value);
   ctx.body = "OK";
   next();
}, (ctx, next) => {
   const eventsCollectionMiddleware = ctx.state.container.resolve<EventsCollectionMiddleware>("middleware.eventsCollection");
   const selectScheduleParams = ctx.state.container.resolve(SelectScheduleParams);
   const scheduleCollector = eventsCollectionMiddleware({
      selector: selectScheduleParams.select,
      options: {
         allowIncognito: true
      }
   });
   return scheduleCollector(ctx, next);
});
router.post("/schedule/estimate", authMiddleware, async ctx => {
   ctx.state['enable.xff'] = true;
   const {
      error,
      value
   } = scheduleEstimateSchema.validate({
      ...getBody(ctx.request.body),
      clientId: maybeClientId(ctx.state?.["user"]?.sub)
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const contactService = ctx.state.container.resolve(ContactService);
   await contactService.scheduleEstimate(value);
   ctx.body = "OK";
});

/**
 * @openapi
 * /api/contact/requestinfo:
 *    post:
 *       tags:
 *          - Contacts
 *       summary: /api/contact/requestinfo, please fill more deatailed summary
 *       security:
 *          - bearerAuth: []
 *       requestBody:
 *          description: Message details
 *          content:
 *             application/json:
 *                schema:
 *                   type: object
 *                   properties:
 *                      name:
 *                         $ref: '#/components/schemas/ContactName'
 *                      email:
 *                         $ref: '#/components/schemas/ContactEmail'
 *                      phone:
 *                         $ref: '#/components/schemas/ContactPhone'
 *                      message:
 *                         $ref: '#/components/schemas/ContactMessage'
 *                      mlsNumber:
 *                         $ref: '#/components/schemas/mlsNumber'
 *                      clientId:
 *                         type: integer
 *       responses:
 *          400:
 *             $ref: '#/components/responses/BadRequest'
 *          401:
 *             $ref: '#/components/responses/Unauthorized'
 */
router.post("/requestinfo", authMiddleware, async (ctx, next) => {
   ctx.state['enable.xff'] = true;
   const {
      error,
      value
   } = requestInfoSchema.validate({
      ...getBody(ctx.request.body),
      clientId: maybeClientId(ctx.state?.["user"]?.sub)
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const contactService = ctx.state.container.resolve(ContactService);
   await contactService.requestInfo(value);
   ctx.body = "OK";
   next();
}, (ctx, next) => {
   const eventsCollectionMiddleware = ctx.state.container.resolve<EventsCollectionMiddleware>("middleware.eventsCollection");
   const selectRequestInfoParams = ctx.state.container.resolve(SelectRequestInfoParams);
   const requestInfoCollector = eventsCollectionMiddleware({
      selector: selectRequestInfoParams.select,
      options: {
         allowIncognito: true
      }
   });
   return requestInfoCollector(ctx, next);
});
router.post("/subscribe/newsletter", authMiddleware, async (ctx, next) => {
   ctx.state['enable.xff'] = true;
   const {
      error
   } = subscribeNewsletterSchema.validate(getBody(ctx.request.body));
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   ctx.body = "OK";
   next();
}, (ctx, next) => {
   const eventsCollectionMiddleware = ctx.state.container.resolve<EventsCollectionMiddleware>("middleware.eventsCollection");
   const selectSubscribeNewsletterParams = ctx.state.container.resolve(SelectSubscribeNewsletterParams);
   const subscribeNewsletterCollector = eventsCollectionMiddleware({
      selector: selectSubscribeNewsletterParams.select,
      options: {
         allowIncognito: true
      }
   });
   return subscribeNewsletterCollector(ctx, next);
});
export default router;