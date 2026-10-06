import Router from "@koa/router";
import { Middleware } from "koa-jwt";
import { ApiError } from "../lib/errors.js";
import { container } from "tsyringe";
import { locationsAutocompleteSchema, locationsGetSchema } from "../validate/locations.js";
import LocationsService from "../services/locations.js";
import { sendCached } from "../lib/decorators/cached.js";
const router = new Router({
   prefix: "/locations"
});
const authMiddleware = container.resolve<Middleware>("middleware.jwt.passthrough");

/**
 * @openapi
 * /api/locations:
 *   get:
 *     tags:
 *       - Locations
 *     summary: Use this endpoint to get location details.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [area, city, city-alternate, neighborhood, neighborhood-alternate, postalCode, schoolDistrict, district, school, property]
 *         explode: false
 *         description: Limits results to specified location types
 *       - in: query
 *         name: state
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         explode: false
 *         description: Filters locations by state/province names
 *       - in: query
 *         name: area
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         explode: false
 *         description: Filters locations by area names
 *       - in: query
 *         name: city
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         explode: false
 *         description: Filters locations by city names.
 *       - in: query
 *         name: neighborhood
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         explode: false
 *         description: Filters locations by neighborhood names.
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         explode: false
 *         description: Array of location IDs to retrieve details for.
 *       - in: query
 *         name: fields
 *         schema:
 *           type: string
 *         description: Comma-separated list of fields to include in the response
 *       - in: query
 *         name: resultsPerPage
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 300
 *           default: 100
 *         description: The amount of locations to return in each page of the results set.
 *       - in: query
 *         name: pageNum
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: The page number of results to return.
 *       - in: query
 *         name: map
 *         schema:
 *           type: array
 *           minItems: 1
 *           items:
 *             type: array
 *             minItems: 3
 *             items:
 *               type: array
 *               minItems: 2
 *               maxItems: 2
 *               items:
 *                 type: number
 *         description: GeoJSON polygon or multi-polygon boundary for geographical filtering. Limits results to locations within the specified boundaries.
 *       - in: query
 *         name: radius
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Accepts a value for radius in KM. Must be used with lat and long parameters to return locations within the specified radius of a given latitude and longitude.
 *       - in: query
 *         name: lat
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         description: Accepts a value for latitude. Must be used with radius parameter to return listings within a certain radius of a given latitude and longitude.
 *       - in: query
 *         name: long
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *         description: Accepts a value for longitude. Must be used with radius parameter to return listings within a certain radius of a given latitude and longitude.
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [typeasc, typedesc]
 *         description: Sort results by type
 *       - in: query
 *         name: hasBoundary
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Only search through locations that have boundary polygons
 *       - in: query
 *         name: minSize
 *         schema:
 *           type: number
 *           minimum: 0
 *           exclusiveMinimum: true
 *         description: Minimum size filter (positive float)
 *       - in: query
 *         name: maxSize
 *         schema:
 *           type: number
 *           minimum: 0
 *           exclusiveMinimum: true
 *         description: Maximum size filter (positive float)
 *       - in: query
 *         name: source
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         explode: false
 *         description: "Filter locations by source: MLS, UserDefined, LiveBy, PublicRecord (public-record parcels, type=property, MultiPolygon boundaries)"
 *       - in: query
 *         name: classification
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         explode: false
 *         description: Filter locations by classification
 *     responses:
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.get("/", authMiddleware, async (ctx, _next) => {
   ctx.state["enable.xff"] = true;
   const {
      error,
      value
   } = locationsGetSchema.validate({
      ...ctx.request.query
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const locationsService = ctx.state.container.resolve(LocationsService);
   const data = await locationsService.get(value);
   sendCached(ctx, data);
});

/**
 * @openapi
 * /api/locations/autocomplete:
 *   get:
 *     tags:
 *       - Locations
 *     summary: Autocomplete for Locations search.
 *     description: As your user types, you simply pass their input into search param and get locations which match their input. You can use other params to fine-tune the locations which will be returned for a given search.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           minLength: 3
 *       - in: query
 *         name: type
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [area, city, city-alternate, neighborhood, neighborhood-alternate, postalCode, schoolDistrict, district, school, property]
 *         explode: false
 *         description: Limits results to specified location types
 *       - in: query
 *         name: state
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         explode: false
 *         description: Filters locations by state/province names
 *       - in: query
 *         name: area
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         explode: false
 *         description: Filters locations by area names
 *       - in: query
 *         name: city
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         explode: false
 *         description: Filters locations by city names.
 *       - in: query
 *         name: boundary
 *         schema:
 *           type: boolean
 *         description: Fetches locations with boundary polygons for a small performance penalty of 10-20ms
 *       - in: query
 *         name: fields
 *         schema:
 *           type: string
 *         description: Comma-separated list of fields to include in the response
 *       - in: query
 *         name: resultsPerPage
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 300
 *           default: 100
 *         description: The amount of locations to return in each page of the results set.
 *       - in: query
 *         name: pageNum
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: The page number of results to return.
 *       - in: query
 *         name: map
 *         schema:
 *           type: array
 *           minItems: 1
 *           items:
 *             type: array
 *             minItems: 3
 *             items:
 *               type: array
 *               minItems: 2
 *               maxItems: 2
 *               items:
 *                 type: number
 *         description: GeoJSON polygon or multi-polygon boundary for geographical filtering. Limits results to locations within the specified boundaries.
 *       - in: query
 *         name: radius
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Accepts a value for radius in KM. Must be used with lat and long parameters to return locations within the specified radius of a given latitude and longitude.
 *       - in: query
 *         name: lat
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         description: Accepts a value for latitude. Must be used with radius parameter to return listings within a certain radius of a given latitude and longitude.
 *       - in: query
 *         name: long
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *         description: Accepts a value for longitude. Must be used with radius parameter to return listings within a certain radius of a given latitude and longitude.
 *       - in: query
 *         name: boundary
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           description: Fetches locations with boundary polygons for a small performance penalty of 10-20ms
 *       - in: query
 *         name: hasBoundary
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           description: Only search through locations that have boundary polygons
 *       - in: query
 *         name: minSize
 *         schema:
 *           type: number
 *           minimum: 0
 *           exclusiveMinimum: true
 *         description: Minimum size filter (positive float)
 *       - in: query
 *         name: maxSize
 *         schema:
 *           type: number
 *           minimum: 0
 *           exclusiveMinimum: true
 *         description: Maximum size filter (positive float)
 *       - in: query
 *         name: source
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         explode: false
 *         description: "Filter locations by source: MLS, UserDefined, LiveBy, PublicRecord (public-record parcels, type=property, MultiPolygon boundaries)"
 *     responses:
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.get("/autocomplete", authMiddleware, async (ctx, _next) => {
   ctx.state["enable.xff"] = true;
   const {
      error,
      value
   } = locationsAutocompleteSchema.validate({
      ...ctx.request.query
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const locationsService = ctx.state.container.resolve(LocationsService);
   ctx.body = await locationsService.autocomplete(value);
});
export default router;