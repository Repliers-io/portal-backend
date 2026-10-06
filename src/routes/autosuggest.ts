import Router from "@koa/router";
import { container } from "tsyringe";
import { ApiError } from "../lib/errors.js";
import { sendCached } from "../lib/decorators/cached.js";
import AutosuggestService from "../services/autosuggest.js";
import { autosuggestAddressSchema, autosuggestSchema } from "../validate/autosuggest.js";
import ListingsService from "../services/listings.js";
import { RplClass } from "../types/repliers.js";
import { RplListingsLocationsDto } from "../validate/listings.js";
import { type AppConfig } from "../config.js";
import { Middleware } from "koa-jwt";
const router = new Router({
   prefix: "/autosuggest"
});
const authMiddleware = container.resolve<Middleware>("middleware.jwt.passthrough");
const config = container.resolve<AppConfig>("config");

/**
* @openapi
* /api/autosuggest:
*  get:
*     tags:
*        - Autosuggest
*     summary: Autosuggest addresses via mapbox / repliers
*     parameters:
*        - in: query
*          name: q
*          schema:
*             type: string
*             minLength: 3
*        - in: query
*          name: lat
*          schema:
*             type: number
*             format: float
*        - in: query
*          name: long
*          schema:
*             type: number
*             format: float
*        - in: query
*          name: resultsPerPage
*          schema:
*             type: integer
*             format: int32
*             minimum: 1
*        - in: query
*          name: mapboxSearchSession
*          deprecated: true
*          schema:
*             type: string
*             format: uuid
*        - in: query
*          name: searchSession
*          schema:
*             type: string
*             format: uuid
*        - in: query
*          name: type
*          description: >-
*             Filters the `listings` block by transaction type (sale/lease).
*             Does not affect the `mapbox` or `locations` blocks. If omitted,
*             falls back to the configured autosuggest listing type.
*          schema:
*             $ref: '#/components/schemas/RplType'

*     responses:
*        200:
*           decription: list of suggestions
*           content:
*              application/json:
*                 schema:
*                    type: object
*                    properties:
*                       mapbox:
*                          type: array
*                          items:
*                             type: object
*                             properties:
*                                name:
*                                   type: string
*                                mapbox_id:
*                                   type: string
*                                feature_type:
*                                   type: string
*                                region:
*                                   type: object
*                                   properties:
*                                      region_code:
*                                         type: string
*                                postcode:
*                                   type: object
*                                   properties:
*                                      name:
*                                         type: string
*                                place:
*                                   type: object
*                                   properties:
*                                      name:
*                                         type: string
*                                neighborhood:
*                                   type: object
*                                   properties:
*                                      name:
*                                         type: string
*                       listings:
*                          type: array
*                          items:
*                             type: object
*                             properties:
*                                page:
*                                   type: integer
*                                   format: int32
*                                numPages:
*                                   type: integer
*                                   format: int32
*                                pageSize:
*                                   type: integer
*                                   format: int32
*                                count:
*                                   type: integer
*                                   format: int32
*                                statistics:
*                                   type: object
*                                   properties:
*                                      listPrice:
*                                         type: object
*                                         properties:
*                                            min:
*                                               type: integer
*                                               format: int32
*                                            max:
*                                               type: integer
*                                               format: int32
*                                listings:
*                                   type: array
*                                   items:
*                                      type: object
*                                      properties:
*                                         mlsNumber:
*                                            type: string
*                                            minLength: 1
*                                            maxLength: 11
*                                         type:
*                                            $ref: '#/components/schemas/RplTypeEnum'
*                                         address:
*                                            type: object
*                                            properties:
*                                               area:
*                                                  type: string
*                                               city:
*                                                  type: string
*                                               country:
*                                                  type: string
*                                               district:
*                                                  type: string
*                                               majorIntersection:
*                                                  type: string
*                                               neighborhood:
*                                                  type: string
*                                               streetDirection:
*                                                  type: string
*                                               streetName:
*                                                  type: string
*                                               streetNumber:
*                                                  type: string
*                                               streetSuffix:
*                                                  type: string
*                                               unitNumber:
*                                                  type: string
*                                               zip:
*                                                  type: string
*                                               state:
*                                                  type: string
*                                               communityCode:
*                                                  type: string
*                                               streetDirectionPrefix:
*                                                  type: string
*                                         map:
*                                            type: object
*                                            properties:
*                                               latitude:
*                                                  type: number
*                                                  format: float
*                                               longitude:
*                                                  type: number
*                                                  format: float
*                                               point:
*                                                  type: string
*        400:
*           $ref: '#/components/responses/BadRequest'
*/
router.get("/", authMiddleware, async ctx => {
   ctx.state['enable.xff'] = true;
   const payload = {
      ...ctx.request.query,
      app_state: {
         user: ctx.state["user"]
      }
   };
   const {
      error,
      value
   } = autosuggestSchema.validate(payload);
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const autosuggestService = ctx.state.container.resolve(AutosuggestService);
   ctx.body = await autosuggestService.search(value);
});

/**
* @openapi
* /api/autosuggest/locations:
*  get:
*     tags:
*        - Autosuggest
*     summary: Autosuggest locations
*     deprecated: true
*     responses:
*        200:
*           decription: list of suggestions
*           content:
*              application/json:
*                 schema:
*                    type: object
*                    properties:
*                       boards:
*                          type: array
*                          items:
*                             type: object
*                             properties:
*                                boardId:
*                                   type: integer
*                                name:
*                                   type: string
*                                updatedOn:
*                                   type: string
*                                   format: date-time
*                                classes:
*                                   type: array
*                                   items:
*                                      type: object
*                                      properties:
*                                         name:
*                                            type: string
*                                         areas:
*                                            type: array
*                                            items:
*                                               type: object
*                                               properties:
*                                                  name:
*                                                     type: string
*                                                  cities:
*                                                     type: array
*                                                     items:
*                                                        type: object
*                                                        properties:
*                                                           name:
*                                                              type: string
*                                                           activeCount:
*                                                              type: integer
*                                                           location:
*                                                              type: object
*                                                              properties:
*                                                                 lat:
*                                                                    type: number
*                                                                    format: float
*                                                                 lng:
*                                                                    type: number
*                                                                    format: float
*                                                           state:
*                                                              type: string
*                                                           coordinates:
*                                                              type: any
*                                                           neighborhoods:
*                                                              type: array
*                                                              items:
*                                                                 type: object
*                                                                 properties:
*                                                                    name:
*                                                                       type: string
*                                                                    activeCount:
*                                                                       type: integer
*                                                                    location:
*                                                                       type: object
*                                                                       properties:
*                                                                          lat:
*                                                                             type: number
*                                                                             format: float
*                                                                          lng:
*                                                                             type: number
*                                                                             format: float
*                                                                    coordinates:
*                                                                       type: any
*        400:
*           $ref: '#/components/responses/BadRequest'
*/
/**
 * @deprecated This method is deprecated in favor of the GET /locations.
 */
router.get("/locations", async ctx => {
   ctx.state['enable.xff'] = true;
   const listingsService = ctx.state.container.resolve(ListingsService);
   const params: RplListingsLocationsDto = {
      class: [RplClass.residential, RplClass.condo],
      boardId: config.settings.locations.boardId,
      dropCoordinates: config.settings.locations.drop_coordinates,
      activeCountLimit: config.settings.locations.active_count_limit
   };
   const data = await listingsService.locations(params);
   sendCached(ctx, data);
});

/**
 * @openapi
 * /api/autosuggest/address:
 *    get:
 *       tags:
 *          - Autosuggest
 *       summary: Autosuggest addresses
 *       parameters:
 *          - in: query
 *            name: q
 *            schema:
 *               type: string
 *               minLength: 1
 *            required: true
 *          - in: query
 *            name: lat
 *            schema:
 *               type: string
 *               pattern: ^(-?\d+(\.\d+)?)
 *            required: false
 *          - in: query
 *            name: long
 *            schema:
 *               type: string
 *               pattern: ^(-?\d+(\.\d+)?)
 *            required: false
 *       responses:
 *          200:
 *              description: A list of addresses
 *              content:
 *                application/json:
 *                   schema:
 *                      type: array
 *                      items:
 *                         type: object
 *                         properties:
 *                             country:
 *                               type: string
 *                             region:
 *                               type: string
 *                             zip:
 *                               type: string
 *                             city:
 *                               type: string
 *                             streetNumber:
 *                               type: string
 *                             streetName:
 *                               type: string
 *                             fullAddress:
 *                               type: string
 *                             address:
 *                               type: string
 *          400:
 *             $ref: '#/components/responses/BadRequest'
 */
router.get('/address', async ctx => {
   ctx.state['enable.xff'] = true;
   const {
      error,
      value
   } = autosuggestAddressSchema.validate(ctx.request.query);
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const autosuggestService = ctx.state.container.resolve(AutosuggestService);
   ctx.body = await autosuggestService.address(value);
});
export default router;