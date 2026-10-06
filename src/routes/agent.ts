import Router from "@koa/router";
import { container } from "tsyringe";
import { Middleware } from "koa-jwt";
import { Next, Context } from "koa";
import { ApiError } from "../lib/errors.js";
import { RoleMiddlewareCreator } from "../providers/middleware/role.js";
import { UserRole } from "../constants.js";
import AgentService from "../services/agent.js";
import { agentsCreateClientSchema, agentsCreateEstimateSchema, agentsGetEstimateSchema, agentsSendEstimateSchema, agentsCreateMessageSchema, agentsGetMessagesSchema, agentsUpdateEstimateSchema, agentGetBossPeopleSchema, agentGetClientsSchema, agentUpdateClientSchema, agentsDeleteEstimateSchema, agentGetSingleClientsSchema } from "../validate/agent.js";
import EstimateService from "../services/estimate.js";
import UserService from "../services/user.js";
import BossService from "../services/boss.js";
import BaseEventCollectionSelector from "../services/eventsCollection/selectors/baseEventCollectionSelector.js";
import { EventsCollectionMiddleware } from "../providers/middleware/eventsCollection.js";
import SelectAgentClientRegistrationParams from "../services/eventsCollection/selectors/selectAgentClientRegistrationParams.js";
import SelectAgentEstimateParams from "../services/eventsCollection/selectors/selectAgentEstimateParams.js";
import _ from "lodash";
import SelectEstimateNoteParams from "../services/eventsCollection/selectors/selectEstimateNoteParams.js";
import { getBody } from "../lib/utils.js";
const router = new Router({
   prefix: "/agent"
});
const authMiddleware = container.resolve<Middleware>("middleware.jwt");
const roleMiddleware = container.resolve<RoleMiddlewareCreator>("middleware.role");
router.use(authMiddleware, roleMiddleware([UserRole.Agent, UserRole.Admin]));

/**
 *
 * Oneliner to generate signature:
 * node --import crypto -e 'console.log(crypto.createHash("shake256", { outputLength: 16 }).update("138414repliers123").digest("hex"))'
 *
 * 138414 is clientId
 * repliers123 is signature salt (should be private)
 *
 */

/**
* @openapi
*  components:
*     schemas:
*        Client:
*           type: object
*           properties:
*              clientId:
*                 type: number
*                 description: Client ID
*              agentId:
*                 type: number
*                 description: Agent ID
*              fname:
*                 type: string
*                 description: Client first first name
*              lname:
*                 type: string
*                 description: Client last name
*              email:
*                 type: string
*                 description: Client email
*              phone:
*                 type: string
*                 description: Client phone
*              proxyEmail:
*                 type: string
*                 description: Client proxy email
*              status:
*                 type: boolean
*                 description: Client status
*              preferences:
*                 type: object
*                 properties:
*                    email:
*                       type: boolean
*                    sms:
*                       type: boolean
*                    unsubscribe:
*                       type: boolean
*                    whatsapp:
*                       type: boolean
*              tags:
*                 type: string
*                 description: Client tags
*              externalId:
*                 type: string
*                 description: External ID
*              expiryDate:
*                 type: string
*                 format: date-time
*                 description: Client expiry date
*              createdOn:
*                 type: string
*                 format: date-time
*                 description: Client created on
*              searches:
*                 type: array
*                 items:
*                    $ref: '#/components/schemas/RplSavedSearch'
*     parameters:
*        clientId:
*           in: path
*           name: clientId
*           required: true
*           schema:
*              type: number
*/
router.param("clientId", async (clientId, ctx: Context, next: Next) => {
   ctx.state['enable.xff'] = true;
   const agentService = ctx.state.container.resolve(AgentService);
   const [hasValidSignature, borrowedAgentId] = await agentService.checkSignature(clientId, ctx.query['s']);
   ctx.assert(hasValidSignature, 403, "Invalid signature");
   if (borrowedAgentId) {
      // Got signature, so replacing jwt.sub (agentId of current jwt token) with actual clientAgentId
      ctx.state["user"].sub = borrowedAgentId;
      return next(); // no need to check ownership
   }
   const agentId = ctx.state["user"].sub;
   const isOwnClient = await agentService.checkClient(clientId, agentId);
   ctx.assert(isOwnClient, 403, "You are not allowed to access this client");
   return next();
});
router.param("estimateId", async (estimateId, ctx: Context, next: Next) => {
   ctx.state['enable.xff'] = true;
   const estimateService = ctx.state.container.resolve(EstimateService);
   const agentService = ctx.state.container.resolve(AgentService);
   const estimate = await estimateService.get({
      estimateId: +estimateId
   });
   ctx.assert(estimate.clientId, 403, "You are not allowed to access this estimate"); // guest estimate has no owner
   const [hasValidSignature, borrowedAgentId] = await agentService.checkSignature(estimate.clientId.toString(), ctx.query['s']);
   ctx.assert(hasValidSignature, 403, "Invalid signature");
   if (borrowedAgentId) {
      // Got signature, so replacing jwt.sub (agentId of current jwt token) with actual clientAgentId
      ctx.state["user"].sub = borrowedAgentId;
      return next(); // no need to check ownership
   }
   const agentId = ctx.state["user"].sub;
   const isOwnEstimate = await estimateService.checkOwnership({
      estimateId: +estimateId,
      userId: agentId,
      userRole: UserRole.Agent
   });
   ctx.assert(isOwnEstimate, 403, "You are not allowed to access this estimate");
   return next();
});

/**
* @openapi
*  /api/agent/client:
*     post:
*        tags: [Agent]
*        summary: Create a new client
*        description: Create a new client
*        security:
*           - bearerAuth: []
*        requestBody:
*           required: true
*           content:
*              application/json:
*                 schema:
*                    type: object
*                    properties:
*                       phone:
*                          type: string
*                       status:
*                          type: boolean
*                       fname:
*                          type: string
*                       lname:
*                          type: string
*                       email:
*                          type: string
*                          format: email
*                       preferences:
*                          type: object
*                          properties:
*                             email:
*                                type: boolean
*                             sms:
*                                type: boolean
*                             unsubscribe:
*                                type: boolean
*                       tags:
*                          type: string
*        responses:
*           200:
*              description: Successful operation
*              content:
*                 application/json:
*                    schema:
*                       $ref: '#/components/schemas/Client'
*           400:
*              $ref: '#/components/responses/BadRequest'
*           401:
*              $ref: '#/components/responses/Unauthorized'
*           403:
*              $ref: '#/components/responses/Forbidden'
*           404:
*              $ref: '#/components/responses/NotFound'
*/
/* ACCESS: NO signature accsess */
router.post("/client", async (ctx, next) => {
   ctx.state['enable.xff'] = true;
   const {
      error,
      value
   } = agentsCreateClientSchema.validate({
      ...getBody(ctx.request.body),
      status: true,
      agentId: ctx.state["user"].sub
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const agentService = ctx.state.container.resolve(AgentService);
   ctx.body = await agentService.createClient(value);
   next();
}, async (ctx, next) => {
   const eventsCollectionMiddleware = ctx.state.container.resolve<EventsCollectionMiddleware>("middleware.eventsCollection");
   const selector = ctx.state.container.resolve(SelectAgentClientRegistrationParams);
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
*  /api/agent/client:
*     get:
*        tags: [Agent]
*        summary: Get agent clients
*        description: Get list of agent clients, agentId is always taken from the token
*        security:
*           - bearerAuth: []
*        parameters:
*           - in: query
*             name: clientId
*             schema:
*                type: integer
*             description: Client Id
*           - in: query
*             name: pageNum
*             schema:
*                type: integer
*             description: If specified indexes a specific page in the results set. For example, if there are 1000 listings and 100 listings per page, if you'd like to view listings 101-201 you'd specify pageNum=2
*           - in: query
*             name: email
*             schema:
*                type: string
*                format: email
*             description: Email
*           - in: query
*             name: fname
*             schema:
*                type: string
*             description: First name
*           - in: query
*             name: lname
*             schema:
*                type: string
*             description: Last name
*           - in: query
*             name: phone
*             schema:
*                type: string
*             description: Phone
*           - in: query
*             name: keywords
*             schema:
*                type: string
*             description: One or more keywords may be specified to filter the results by. Useful for searching clients. If specified all other params are ignored.
*           - in: query
*             name: status
*             schema:
*                type: boolean
*             description: Status
*           - in: query
*             name: condition
*             schema:
*                type: string
*                enum: [EXACT, CONTAINS]
*             description: Determines the search condition applied to the filters. If EXACT, requires that the given value for one or more params is an exact match of the stored value. If CONTAINS, requires that the given value for one or more params is contained within the stored value.
*           - in: query
*             name: operator
*             schema:
*                type: string
*                enum: [AND, OR]
*                default: OR
*             description: Determines the search logic applied to the filters. If OR, requires that one or more params contain/equal the given value. If AND, requires that all params contain/equal the given value.
*           - in: query
*             name: resultsPerPage
*             schema:
*                type: integer
*                default: 100
*             description: The amount of listings to return in each page of the results set.
*           - in: query
*             name: tags
*             schema:
*                type: string
*             description: One or more comma separated strings that can be used to filter clients. For example GET /clients?tags=buyer,toronto. The response contains clients that have any of the tags specified.
*           - in: query
*             name: showSavedSearches
*             schema:
*                type: boolean
*                default: true
*             description: Enables automatic retrieval of Saved Searches for each client in the response. For best performance it's recommended to disable this setting if Saved Searches are not required.
*           - in: query
*             name: showEstimates
*             schema:
*                type: boolean
*                default: false
*             description: Enables automatic retrieval of Estimates for each client in the response.
*           - in: query
*             name: externalId
*             schema:
*                type: string
*             description: External ID
*        responses:
*           200:
*              description: Successful operation
*              content:
*                 application/json:
*                    schema:
*                       type: object
*                       properties:
*                          page:
*                             type: number
*                             format: int32
*                             minimum: 0
*                          numPages:
*                             type: number
*                             format: int32
*                             minimum: 0
*                          pageSize:
*                             type: number
*                             format: int32
*                             minimum: 0
*                          count:
*                             type: number
*                             format: int32
*                             minimum: 0
*                          clients:
*                             type: array
*                             items:
*                                $ref: '#/components/schemas/Client'
*           400:
*              $ref: '#/components/responses/BadRequest'
*           401:
*              $ref: '#/components/responses/Unauthorized'
*           403:
*              $ref: '#/components/responses/Forbidden'
*           404:
*              $ref: '#/components/responses/NotFound'
*/
/* ACCESS: NO signature accsess */
router.get('/client', async ctx => {
   ctx.state['enable.xff'] = true;
   const {
      error,
      value
   } = agentGetClientsSchema.validate({
      ...ctx.query,
      agentId: ctx.state["user"].sub
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const agentService = ctx.state.container.resolve(AgentService);
   ctx.body = await agentService.getClients(value);
});

/* ACCESS: YES signature accsess */
router.get('/client/:clientId', async ctx => {
   ctx.state['enable.xff'] = true;
   const {
      s,
      ...query
   } = ctx.query;
   const {
      error,
      value
   } = agentGetSingleClientsSchema.validate({
      ...query,
      clientId: ctx.params["clientId"],
      agentId: ctx.state["user"].sub
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const agentService = ctx.state.container.resolve(AgentService);
   ctx.body = await agentService.getClients(value);
});

/* ACCESS: YES signature accsess */
router.patch('/client/:clientId', async ctx => {
   ctx.state['enable.xff'] = true;
   const {
      error,
      value
   } = agentUpdateClientSchema.validate({
      ...getBody(ctx.request.body),
      clientId: ctx.params["clientId"],
      agentId: ctx.state["user"].sub
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const agentService = ctx.state.container.resolve(AgentService);
   ctx.body = await agentService.updateClient(value);
});

/**
 * @openapi
 * /api/agent/estimate/{clientId}:
 *    post:
 *       tags: [Agent]
 *       summary: Create a new estimate for specific client
 *       description: Create a new estimate
 *       security:
 *          - bearerAuth: []
 *       parameters:
 *          - $ref: '#/components/parameters/clientId'
 *       requestBody:
 *          required: true
 *          description: All fields required for POST /api/estimate
 *          content:
 *             application/json:
 *                schema:
 *                   $ref: '#/components/schemas/EstimateCreate'
 *       responses:
 *          200:
 *             description: Successful operation
 *             content:
 *                application/json:
 *                   schema:
 *                      $ref: '#/components/schemas/Client'
 *          400:
 *             $ref: '#/components/responses/BadRequest'
 *          401:
 *             $ref: '#/components/responses/Unauthorized'
 *          403:
 *             $ref: '#/components/responses/Forbidden'
 *          404:
 *             $ref: '#/components/responses/NotFound'
 */
/* ACCESS: YES signature accsess */
router.post("/estimate/:clientId", async (ctx, next) => {
   ctx.state['enable.xff'] = true;
   const {
      error,
      value
   } = agentsCreateEstimateSchema.validate({
      ...getBody(ctx.request.body),
      clientId: ctx.params["clientId"],
      agentId: ctx.state["user"].sub
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const agentService = ctx.state.container.resolve(AgentService);
   ctx.body = await agentService.createEstimate(value);
   next();
}, (ctx, next) => {
   const eventsCollectionMiddleware = ctx.state.container.resolve<EventsCollectionMiddleware>("middleware.eventsCollection");
   const selectEstimateParams = ctx.state.container.resolve(SelectAgentEstimateParams);
   const selectEstimateNoteParams = ctx.state.container.resolve(SelectEstimateNoteParams);
   const estimateCollector = eventsCollectionMiddleware({
      selector: selectEstimateParams.select,
      notesSelector: selectEstimateNoteParams.select,
      options: {
         allowIncognito: false
      }
   });
   return estimateCollector(ctx, next);
});

/**
 * @openapi
 * /api/agent/estimate/{clientId}:
 *    get:
 *       tags: [Agent]
 *       summary: Use this endpoint to fetch existing estimates for client
 *       security:
 *          - bearerAuth: []
 *       parameters:
 *          - $ref: '#/components/parameters/clientId'
 *       responses:
 *          200:
 *             description: Successful operation
 *             content:
 *                application/json:
 *                   schema:
 *                      type: object
 *                      properties:
 *                         page:
 *                            type: number
 *                            format: int32
 *                            minimum: 0
 *                         numPages:
 *                            type: number
 *                            format: int32
 *                            minimum: 0
 *                         pageSize:
 *                            type: number
 *                            format: int32
 *                            minimum: 0
 *                         count:
 *                            type: number
 *                            format: int32
 *                            minimum: 0
 *                         estimates:
 *                             type: array
 *                             items:
 *                                $ref: '#/components/schemas/Estimate'
 *          400:
 *             $ref: '#/components/responses/BadRequest'
 *          401:
 *             $ref: '#/components/responses/Unauthorized'
 *          403:
 *             $ref: '#/components/responses/Forbidden'
 *          404:
 *             $ref: '#/components/responses/NotFound'
 */
/* ACCESS: YES signature accsess */
router.get("/estimate/:clientId", async ctx => {
   ctx.state['enable.xff'] = true;
   const {
      error,
      value
   } = agentsGetEstimateSchema.validate({
      clientId: ctx.params["clientId"],
      agentId: ctx.state["user"].sub
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const agentService = ctx.state.container.resolve(AgentService);
   ctx.body = await agentService.getEstimate(value);
});

/**
 * @openapi
 * /api/agent/estimate/{estimateId}/send:
 *    post:
 *       tags: [Agent]
 *       summary: Use this endpoint to send estimates for client
 *       security:
 *          - bearerAuth: []
 *       parameters:
 *          - in: path
 *            name: estimateId
 *            schema:
 *                type: number
 *            required: true
 *       responses:
 *          200:
 *             description: Successful operation
 *             content:
 *                application/json:
 *                   schema:
 *                      $ref: '#/components/schemas/Estimate'
 *          400:
 *             $ref: '#/components/responses/BadRequest'
 *          401:
 *             $ref: '#/components/responses/Unauthorized'
 *          403:
 *             $ref: '#/components/responses/Forbidden'
 *          404:
 *             $ref: '#/components/responses/NotFound'
 */
/* ACCESS: YES signature accsess */
router.post("/estimate/:estimateId/send", async (ctx, next) => {
   ctx.state['enable.xff'] = true;
   const {
      error,
      value
   } = agentsSendEstimateSchema.validate({
      estimateId: ctx.params["estimateId"],
      agentId: ctx.state["user"].sub
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const agentService = ctx.state.container.resolve(AgentService);
   ctx.body = await agentService.sendEstimate(value);
   next();
}, async ctx => {
   try {
      const estimateService = ctx.state.container.resolve(EstimateService);
      const estimateId = +ctx.params["estimateId"]!;
      const estimate = await estimateService.get({
         estimateId
      });
      const userService = ctx.state.container.resolve(UserService);
      const bossService = ctx.state.container.resolve(BossService);
      const baseEventCollectionSelector = ctx.state.container.resolve(BaseEventCollectionSelector);
      if (!estimate.clientId) return;
      const client = await userService.info(estimate.clientId);
      if (!client.externalId && !client.email) return; // axios drops undefined params: getPeople({ email: undefined }) would match everyone

      const personSearchParams = client.externalId ? {
         id: client.externalId
      } : {
         email: client.email
      };
      const bossPersons = await bossService.getPeople(personSearchParams);
      if (bossPersons?.people?.[0]?.id) {
         const addressShort = estimate.payload.address ? baseEventCollectionSelector.addressShort(estimate.payload.address) : 'unknown address';
         const price = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            notation: 'compact'
         }).format(estimate.estimate);
         const estimateUrl = baseEventCollectionSelector.getEstimateUrl(estimate);
         await bossService.noteCreate({
            personId: bossPersons.people[0].id,
            subject: "Estimate sent to the client via email",
            body: `<p><b>${price}</b> property at <b>${addressShort}, ${estimate.payload.address?.city}</b>. Click <a href="${estimateUrl}" target="__blank">here</a> to view details.</p>`,
            isHtml: true
         });
      } else {
         console.error("Error: Failed fetching people from Boss");
      }
   } catch (e) {
      console.error("Error creating note in Boss", e);
   }
});

/* ACCESS: YES signature accsess */
router.patch("/estimate/:estimateId", async ctx => {
   ctx.state['enable.xff'] = true;
   const {
      error,
      value
   } = agentsUpdateEstimateSchema.validate({
      ...getBody(ctx.request.body),
      estimateId: ctx.params["estimateId"],
      agentId: ctx.state["user"].sub
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const agentService = ctx.state.container.resolve(AgentService);
   ctx.body = await agentService.updateEstimate(_.omit(value, "agentId"));
});

/* ACCESS: YES signature accsess */
router.delete("/estimate/:estimateId", async ctx => {
   ctx.state['enable.xff'] = true;
   const {
      error,
      value
   } = agentsDeleteEstimateSchema.validate({
      estimateId: ctx.params["estimateId"],
      agentId: ctx.state["user"].sub
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const estimateService = ctx.state.container.resolve(EstimateService);
   await estimateService.delete({
      estimateId: value.estimateId
   });
   ctx.status = 200;
});

/**
 * @openapi
 * components:
 *    schemas:
 *       Message:
 *          type: object
 *          properties:
 *             messageId:
 *                type: number
 *                description: Message ID
 *             clientId:
 *                type: number
 *                description: Client ID
 *             sender:
 *                type: string
 *                description: Message sender
 *                enum: [agent, client]
 *             source:
 *                type: string
 *                description: Message source
 *             agentId:
 *                type: number
 *                description: Agent ID
 *             token:
 *                type: string
 *                format: uuid
 *             content:
 *                type: object
 *                description: Message content
 *                properties:
 *                   message:
 *                      type: string
 *                      description: Message content
 *                   links:
 *                      type: array
 *                      items:
 *                         type: string
 *                   pictures:
 *                      type: array
 *                      items:
 *                         type: string
 *                   listings:
 *                      type: array
 *                      items:
 *                        type: string
 *                   searches:
 *                      type: array
 *                      items:
 *                         type: number
 *                minProperties: 1
 *             delivery:
 *                type: object
 *                description: Message delivery
 *                properties:
 *                   scheduleDateTime:
 *                      type: string
 *                      format: date-time
 *                   sentDateTime:
 *                      type: string
 *                      format: date-time
 *                   status:
 *                      type: string
*/

/**
 * @openapi
 * /api/agent/messages/{clientId}:
 *    post:
 *       tags: [Agent]
 *       summary: Use this endpoint to create messages for client
 *       security:
 *          - bearerAuth: []
 *       parameters:
 *          - $ref: '#/components/parameters/clientId'
 *       requestBody:
 *          required: true
 *          description: All fields required for POST /api/estimate
 *          content:
 *             application/json:
 *                schema:
 *                   type: object
 *                   properties:
 *                      content:
 *                         type: object
 *                         properties:
 *                            message:
 *                               type: string
 *                               description: Message content
 *                            links:
 *                               type: array
 *                               items:
 *                                  type: string
 *                            pictures:
 *                               type: array
 *                               items:
 *                                  type: string
 *                            listings:
 *                               type: array
 *                               items:
 *                                  type: string
 *                            searches:
 *                               type: array
 *                               items:
 *                                  type: number
 *                         minProperties: 1
 *                   required: [content]
 *       responses:
 *          200:
 *             description: Successful operation
 *             content:
 *                application/json:
 *                   schema:
 *                      $ref: '#/components/schemas/Message'
 *          400:
 *             $ref: '#/components/responses/BadRequest'
 *          401:
 *             $ref: '#/components/responses/Unauthorized'
 *          403:
 *             $ref: '#/components/responses/Forbidden'
 *          404:
 *             $ref: '#/components/responses/NotFound'
 */
/* ACCESS: YES signature accsess */
router.post("/messages/:clientId", async ctx => {
   ctx.state['enable.xff'] = true;
   const {
      error,
      value
   } = agentsCreateMessageSchema.validate({
      ...getBody(ctx.request.body),
      clientId: ctx.params["clientId"],
      agentId: ctx.state["user"].sub
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const agentService = ctx.state.container.resolve(AgentService);
   ctx.body = await agentService.createMessage(value);
});

/**
 * @openapi
 * /api/agent/messages/{clientId}:
 *    get:
 *       tags: [Agent]
 *       summary: Use this endpoint to fetch existing messages for client
 *       security:
 *          - bearerAuth: []
 *       parameters:
 *          - $ref: '#/components/parameters/clientId'
 *       responses:
 *          200:
 *             description: Successful operation
 *             content:
 *                application/json:
 *                   schema:
 *                      type: object
 *                      properties:
 *                         page:
 *                            type: number
 *                            format: int32
 *                            minimum: 0
 *                         numPages:
 *                            type: number
 *                            format: int32
 *                            minimum: 0
 *                         pageSize:
 *                            type: number
 *                            format: int32
 *                            minimum: 0
 *                         count:
 *                            type: number
 *                            format: int32
 *                            minimum: 0
 *                         messages:
 *                            type: array
 *                            items:
 *                               $ref: '#/components/schemas/Message'
 *          400:
 *             $ref: '#/components/responses/BadRequest'
 *          401:
 *             $ref: '#/components/responses/Unauthorized'
 *          403:
 *             $ref: '#/components/responses/Forbidden'
 *          404:
 *             $ref: '#/components/responses/NotFound'
 */
/* ACCESS: YES signature accsess */
router.get("/messages/:clientId", async ctx => {
   ctx.state['enable.xff'] = true;
   const {
      error,
      value
   } = agentsGetMessagesSchema.validate({
      clientId: ctx.params["clientId"],
      agentId: ctx.state["user"].sub,
      estimateId: ctx.query["estimateId"]
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const agentService = ctx.state.container.resolve(AgentService);
   ctx.body = await agentService.getMessages(value);
});

/* ACCESS: no signature accsess */
router.get('/boss/people', async ctx => {
   // actually we have to pick assignedUserId from the token
   const {
      error,
      value
   } = agentGetBossPeopleSchema.validate({
      ...ctx.query,
      agentId: ctx.state["user"].sub,
      assignedUserId: ctx.state["user"]?.external?.fub_id
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const agentService = ctx.state.container.resolve(AgentService);
   ctx.body = await agentService.getBossPeople(value);
});

/* ACCESS: NO signature accsess */
router.post('/boss/people', async ctx => {
   const {
      error,
      value
   } = agentGetBossPeopleSchema.validate({
      ...ctx.query,
      agentId: ctx.state["user"].sub,
      assignedUserId: ctx.state["user"]?.external?.fub_id
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const agentService = ctx.state.container.resolve(AgentService);
   ctx.body = await agentService.syncBossPeople(value);
});
export default router;