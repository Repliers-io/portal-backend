import Router from "@koa/router";
import { container } from "tsyringe";
import { ApiError } from "../lib/errors.js";
import { sendCached } from "../lib/decorators/cached.js";
import StatsService from "../services/stats.js";
import { statsCommunitiesSchema, statsWidgetsSchema } from "../validate/stats.js";
import { Middleware } from "koa";
const router = new Router({
   prefix: "/stats"
});
const authMiddlewarePassthrough = container.resolve<Middleware>("middleware.jwt.passthrough");

/**
 * @openapi
 * /api/stats/widgets:
 *    get:
 *       tags:
 *          - Stats
 *       summary: Stats widgets
 *       parameters:
 *          - in: query
 *            name: city
 *            schema:
 *               type: array
 *               items:
 *                  type: string
 *                  minLength: 1
 *                  maxLength: 100
 *            required: true
 *          - in: query
 *            name: neighborhood
 *            schema:
 *               type: array
 *               items:
 *                  type: string
 *                  minLength: 1
 *                  maxLength: 100
 *          - in: query
 *            name: area
 *            schema:
 *               type: array
 *               items:
 *                  type: string
 *                  minLength: 1
 *                  maxLength: 100
 *            required: false
 *          - in: query
 *            name: district
 *            schema:
 *               type: array
 *               items:
 *                  type: string
 *                  minLength: 1
 *                  maxLength: 100
 *            required: false
 *          - in: query
 *            name: community
 *            schema:
 *               type: string
 *            required: false
 *          - in: query
 *            name: class
 *            schema:
 *               type: string
 *               enum: [condo, residential, commercial]
 *            required: true
 *            description: The class of listing to filter the search results by.
 *       responses:
 *          200:
 *              description: A list of addresses
 *          400:
 *             $ref: '#/components/responses/BadRequest'
 */
router.get("/widgets", authMiddlewarePassthrough, async ctx => {
   ctx.state['enable.xff'] = true;
   const {
      error,
      value
   } = statsWidgetsSchema.validate({
      ...ctx.request.query
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const statsService = ctx.state.container.resolve(StatsService);
   const data = await statsService.widgets(value);
   sendCached(ctx, data);
});
/**
 * @openapi
 * /api/stats/communities:
 *  get:
 *     tags:
 *        - Stats
 *     summary: Communities information
 *     parameters:
 *        - in: query
 *          name: districtId
 *          schema:
 *             type: number
 *          required: false
 *     responses:
 *        200:
 *           description: Community -> districtId[] mapping
 *           content:
 *              application/json:
 *                 schema:
 *                    type: object
 *                    additionalProperties:
 *                       type: array
 *                       items:
 *                          type: number
 *        204:
 *          description: Community not found
 *        400:
 *           $ref: '#/components/responses/BadRequest'
 */
router.get("/communities", async ctx => {
   ctx.state['enable.xff'] = true;
   const {
      error,
      value
   } = statsCommunitiesSchema.validate({
      ...ctx.request.query
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const statsService = ctx.state.container.resolve(StatsService);
   ctx.set("Cache-Control", `private, max-age = 86400`); // 24 hours
   ctx.body = statsService.getCommunities(value);
   ctx.status = ctx.body ? 200 : 204;
});
export default router;