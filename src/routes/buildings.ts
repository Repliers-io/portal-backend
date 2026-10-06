import Router from "@koa/router";
import { ApiError } from "../lib/errors.js";
import { sendCached } from "../lib/decorators/cached.js";
import { buildingsSchema, buildingsSingleSchema } from "../validate/buildings.ts";
import BuildingsService from "../services/buildings.ts";
const router = new Router({
   prefix: "/buildings"
});

/**
 * @openapi
 * /api/buildings:
 *    post:
 *       tags:
 *          - Buildings
 *       summary: Return list of buildings from repliers API
 *       parameters:
 *         - in: query
 *           name: pageNum
 *           schema:
 *             type: integer
 *           description: The page number for pagination
 *         - in: query
 *           name: resultsPerPage
 *           schema:
 *             type: integer
 *           description: Number of results per page
 *         - in: query
 *           name: city
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter by city name
 *         - in: query
 *           name: neighborhood
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter by neighborhood name
 *         - in: query
 *           name: class
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *                enum: [condo, residential, commercial]
 *           description: Filter by property class
 *         - in: query
 *           name: minPrice
 *           schema:
 *             type: integer
 *           description: Minimum price filter
 *         - in: query
 *           name: maxPrice
 *           schema:
 *             type: integer
 *           description: Maximum price filter
 *         - in: query
 *           name: minBedrooms
 *           schema:
 *             type: integer
 *           description: Minimum number of bedrooms
 *         - in: query
 *           name: minBathrooms
 *           schema:
 *             type: integer
 *           description: Minimum number of bathrooms
 *         - in: query
 *           name: propertyType
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter by property type
 *         - in: query
 *           name: type
 *           schema:
 *             $ref: '#/components/schemas/RplType'
 *           description: Used to filter properties that are for sale or for lease
 *         - in: query
 *           name: streetName
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter by street name
 *         - in: query
 *           name: streetNumber
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter by street number
 *         - in: query
 *           name: sortBy
 *           schema:
 *             $ref: '#/components/schemas/RplBuildingsSortBy'
 *           description: Sort results by specified field
 *         - in: query
 *           name: displayPublic
 *           schema:
 *             $ref: '#/components/schemas/RplYesNo'
 *           description: Filter by display public status
 *         - in: query
 *           name: radius
 *           schema:
 *             type: integer
 *           description: Search radius in meters (requires lat and long)
 *         - in: query
 *           name: lat
 *           schema:
 *             type: string
 *           description: Latitude coordinate (required with radius)
 *         - in: query
 *           name: long
 *           schema:
 *             type: string
 *           description: Longitude coordinate (required with radius)
 *         - in: query
 *           name: minStories
 *           schema:
 *             type: integer
 *           description: Minimum number of stories
 *         - in: query
 *           name: maxStories
 *           schema:
 *             type: integer
 *           description: Maximum number of stories
 *         - in: query
 *           name: area
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter by area name
 *         - in: query
 *           name: buildingName
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter by building name
 *         - in: query
 *           name: map
 *           schema:
 *             $ref: '#/components/schemas/RplMapFlexible'
 *           description: Geo-JSON Polygon for map filtering (alternative to request body)
 *       requestBody:
 *          content:
 *             application/json:
 *                schema:
 *                   type: object
 *                   properties:
 *                      map:
 *                         $ref: '#/components/schemas/RplMap'
 *       responses:
 *          200:
 *             description: List of buildings
 *             content:
 *                application/json:
 *                   schema:
 *                      type: object
 *                      properties:
 *                         page:
 *                            type: number
 *                         numPages:
 *                            type: number
 *                         pageSize:
 *                            type: number
 *                         count:
 *                            type: number
 *                         buildings:
 *                            type: array
 *                            items:
 *                               type: object
 *          400:
 *             $ref: '#/components/responses/BadRequest'
 */
router.post("/", async ctx => {
   ctx.state['enable.xff'] = true;
   const buildingsService = ctx.state.container.resolve(BuildingsService);
   const payload = {
      ...ctx.request.query,
      body: ctx.request.body
   };
   const {
      error,
      value
   } = buildingsSchema.validate(payload);
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const data = await buildingsService.search(value, true);
   sendCached(ctx, data);
});
router.get("/", async ctx => {
   ctx.state['enable.xff'] = true;
   const buildingsService = ctx.state.container.resolve(BuildingsService);
   const {
      error,
      value
   } = buildingsSchema.validate(ctx.request.query);
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const data = await buildingsService.search(value, false);
   sendCached(ctx, data);
});

/**
 * @openapi
 * /api/buildings/{addressKey}:
 *    get:
 *       tags:
 *          - Buildings
 *       summary: Return details for a single building by address key
 *       parameters:
 *         - in: path
 *           name: addressKey
 *           required: true
 *           schema:
 *             type: string
 *           description: Unique address identifier key for the building
 *       responses:
 *          200:
 *             description: Building details
 *             content:
 *                application/json:
 *                   schema:
 *                      type: object
 *          400:
 *             $ref: '#/components/responses/BadRequest'
 */
router.get("/:addressKey", async ctx => {
   ctx.state['enable.xff'] = true;
   const buildingsService = ctx.state.container.resolve(BuildingsService);
   const {
      error,
      value
   } = buildingsSingleSchema.validate({
      addressKey: ctx.params['addressKey']
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   ctx.body = await buildingsService.single(value.addressKey);
});
export default router;