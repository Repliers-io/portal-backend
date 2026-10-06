import Router from "@koa/router";
import { container } from "tsyringe";
import { Middleware } from "koa-jwt";
import { ApiError } from "../lib/errors.js";
import SearchesService from "../services/searches.js";
import { searchesCreateSchema, searchesDeleteSchema, searchesGetSchema, searchesUpdateSchema, searchsFilterSchema } from "../validate/searches.js";
import type { EventsCollectionMiddleware } from "../providers/middleware/eventsCollection.js";
import SelectSaveSearchParams from "../services/eventsCollection/selectors/selectSaveSearchParams.js";
import { getBody } from "../lib/utils.js";
const router = new Router({
   prefix: "/searches"
});
const authMiddleware = container.resolve<Middleware>("middleware.jwt");
const authMiddlewarePassthrough = container.resolve<Middleware>("middleware.jwt.passthrough");

/**
 * @openapi
 * /api/searches:
 *    post:
 *       tags:
 *          - Searches
 *       summary: Use this endpoint to create a saved search for a client.
 *       description: A saved search will notify a client when new listings hit the market that match their filters. It's an excellent way to get returning users to your websites and apps and is a really effective lead nurturing technique.
 *       security:
 *         - bearerAuth: []
 *       requestBody:
 *          description: When a saved search is created the filters must be specific enough so that the initial matches do not exceed 100 listings otherwise a 406 (not accepted) response will be received.
 *          content:
 *             application/json:
 *                schema:
 *                   $ref: '#/components/schemas/RplSavedSearch'
 *       responses:
 *          400:
 *             $ref: '#/components/responses/BadRequest'
 *          401:
 *             $ref: '#/components/responses/Unauthorized'
 */
router.post("/", authMiddleware, async (ctx, next) => {
   ctx.state['enable.xff'] = true;
   const {
      error,
      value
   } = searchesCreateSchema.validate({
      ...getBody(ctx.request.body),
      clientId: ctx.state["user"].sub
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const searchesService = ctx.state.container.resolve(SearchesService);
   ctx.body = await searchesService.create(value);
   next();
}, (ctx, next) => {
   const eventsCollectionMiddleware = ctx.state.container.resolve<EventsCollectionMiddleware>("middleware.eventsCollection");
   const selectSaveSearchParams = ctx.state.container.resolve(SelectSaveSearchParams);
   const showPropertyEventsCollector = eventsCollectionMiddleware({
      selector: selectSaveSearchParams.select
   });
   return showPropertyEventsCollector(ctx, next);
});

/**
 * @openapi
 * /api/searches/{searchId}:
 *    patch:
 *       tags:
 *          - Searches
 *       summary: |
 *          se this endpoint to update a saved search.
 *       security:
 *         - bearerAuth: []
 *       parameters:
 *          - in: path
 *            name: searchId
 *            type: number
 *       requestBody:
 *          description: When a saved search is created the filters must be specific enough so that the initial matches do not exceed 100 listings otherwise a 406 (not accepted) response will be received.
 *          content:
 *             application/json:
 *                schema:
 *                   $ref: '#/components/schemas/RplSavedSearch'
 *       responses:
 *          400:
 *             $ref: '#/components/responses/BadRequest'
 *          401:
 *             $ref: '#/components/responses/Unauthorized'
 */
router.patch("/:searchId", authMiddleware, async ctx => {
   ctx.state['enable.xff'] = true;
   const {
      error,
      value
   } = searchesUpdateSchema.validate({
      ...getBody(ctx.request.body),
      searchId: ctx.params["searchId"],
      clientId: ctx.state["user"].sub
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const searchesService = ctx.state.container.resolve(SearchesService);
   ctx.body = await searchesService.update(value);
});

/**
 * @openapi
 * /api/searches:
 *    get:
 *       tags:
 *          - Searches
 *       summary: Use this endpoint to list and filter saved searches that have been created.
 *       security:
 *         - bearerAuth: []
 *       responses:
 *          400:
 *             $ref: '#/components/responses/BadRequest'
 *          401:
 *             $ref: '#/components/responses/Unauthorized'
 */
router.get("/", authMiddleware, async ctx => {
   ctx.state['enable.xff'] = true;
   const {
      error,
      value
   } = searchsFilterSchema.validate({
      clientId: ctx.state["user"].sub
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const searchesService = ctx.state.container.resolve(SearchesService);
   ctx.body = await searchesService.getAll(value);
});

/**
 * @openapi
 * /api/searches/{searchId}:
 *    delete:
 *       tags:
 *          - Searches
 *       summary: Use this endpoint to delete a saved search.
 *       security:
 *         - bearerAuth: []
 *       parameters:
 *          - in: path
 *            name: searchId
 *            type: number
 *       responses:
 *          400:
 *             $ref: '#/components/responses/BadRequest'
 *          401:
 *             $ref: '#/components/responses/Unauthorized'
 */
router.delete("/:searchId", authMiddleware, async ctx => {
   ctx.state['enable.xff'] = true;
   const {
      error,
      value
   } = searchesDeleteSchema.validate({
      searchId: ctx.params["searchId"],
      clientId: ctx.state["user"].sub
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const searchesService = ctx.state.container.resolve(SearchesService);
   ctx.body = await searchesService.delete(value);
});

/**
 * @openapi
 * /api/searches/{searchId}:
 *    get:
 *       tags:
 *          - Searches
 *       summary: Use this endpoint to lookup the details of a saved search.
 *       security:
 *         - bearerAuth: []
 *       parameters:
 *          - in: path
 *            name: searchId
 *            type: number
 *       responses:
 *          200:
 *             description: Saved search details w/o client info
 *             content:
 *                application/json:
 *                   schema:
 *                      type: object
 *          400:
 *             $ref: '#/components/responses/BadRequest'
 *          401:
 *             $ref: '#/components/responses/Unauthorized'
 */
router.get("/:searchId", authMiddlewarePassthrough, async ctx => {
   ctx.state['enable.xff'] = true;
   const {
      error,
      value
   } = searchesGetSchema.validate({
      searchId: ctx.params["searchId"]
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const searchesService = ctx.state.container.resolve(SearchesService);
   ctx.body = await searchesService.getOne(value.searchId);
});
export default router;