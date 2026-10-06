import Router from "@koa/router";
import { container } from "tsyringe";
import { Middleware } from "koa-jwt";
import { ApiError } from "../lib/errors.js";
import { getBody, maybeClientId } from "../lib/utils.js";
import EstimateService from "../services/estimate.js";
import { deleteEstimateSchema, estimateAddSchema, estimateGetSchema, estimatePatchSchema, estimatePropertyDetailsSchema, estimatesByClientIdGetSchema } from "../validate/estimate.js";
import { EventsCollectionMiddleware } from "../providers/middleware/eventsCollection.js";
import SelectEstimateParams from "../services/eventsCollection/selectors/selectEstimateParams.js";
import SelectViewEstimateParams from "../services/eventsCollection/selectors/selectViewEstimateParams.js";
import { UserRole } from "../constants.js";
import { Context, Next } from "koa";
import SelectEstimateNoteParams from "../services/eventsCollection/selectors/selectEstimateNoteParams.js";
const router = new Router({
   prefix: "/estimate"
});
const authMiddleware = container.resolve<Middleware>("middleware.jwt.passthrough");
const authBlockingMiddleware = container.resolve<Middleware>("middleware.jwt");
async function assertOwnership(ctx: Context, next: Next) {
   const estimateService = ctx.state.container.resolve(EstimateService);
   const userId = ctx.state["user"].sub;
   const isOwnEstimate = await estimateService.checkOwnership({
      estimateId: +ctx["params"].estimateId,
      userId,
      userRole: UserRole.User
   });
   ctx.assert(isOwnEstimate, 403, "You are not allowed to access this estimate");
   return next();
}

/**
 * @openapi
 * components:
 *    schemas:
 *       Estimate:
 *          type: object
 *          properties:
 *             estimateId:
 *                type: number
 *                description: Estimate ID
 *             clientId:
 *                type: number
 *                description: Client ID
 *             createdIb:
 *                type: string
 *                description: Estimate creation date
 *             updatedOn:
 *                type: string
 *                description: Estimate update date
 *             estimate:
 *                type: number
 *                description: Estimate value
 *             estimateHigh:
 *                type: number
 *                description: Estimate high value
 *             estimateLow:
 *                type: number
 *                description: Estimate low value
 *             confidence:
 *                type: number
 *                description: Estimate confidence
 *             sendEmailMonthly:
 *                type: boolean
 *                description: Estimate send email monthly
 *             payload:
 *                type: object
 *                description: Estimate payload
 *                ref: '#/components/schemas/EstimateCreate'
 *             history:
 *                type: object
 *                properties:
 *                   mth:
 *                      type: object
 *                      unknown: true
 *
*/

/**
 * @openapi
 * components:
 *    schemas:
 *       EstimateCreate:
 *          type: object
 *          properties:
 *             address:
 *                type: object
 *                properties:
 *                   city:
 *                      type: string
 *                   streetName:
 *                      type: string
 *                   streetNumber:
 *                      type: string
 *                   streetSuffix:
 *                      type: string
 *                   unitNumber:
 *                      type: string
 *                   zip:
 *                      type: string
 *                required: [city, streetName, streetNumber, streetSuffix, unitNumber, zip]
 *             condominium:
 *                type: object
 *                properties:
 *                   ammenities:
 *                      type: array
 *                      items:
 *                         type: string
 *                   exposure:
 *                      type: string
 *                   fees:
 *                      type: object
 *                      properties:
 *                         cableIncl:
 *                            $ref: '#/components/schemas/RplYesNo'
 *                         heatIncl:
 *                            $ref: '#/components/schemas/RplYesNo'
 *                         hydroIncl:
 *                            $ref: '#/components/schemas/RplYesNo'
 *                         maintenance:
 *                            type: number
 *                            format: int32
 *                            minimum: 0
 *                         parkingIncl:
 *                            $ref: '#/components/schemas/RplYesNo'
 *                         taxesIncl:
 *                            $ref: '#/components/schemas/RplYesNo'
 *                         waterIncl:
 *                            $ref: '#/components/schemas/RplYesNo'
 *                   parkingType:
 *                      type: string
 *                   pets:
 *                      type: string
 *                   stories:
 *                      type: number
 *                      format: int32
 *                      minimum: 0
 *             details:
 *                type: object
 *                properties:
 *                   basement1:
 *                      type: string
 *                   basement2:
 *                      type: string
 *                   driveway:
 *                      type: string
 *                   exteriorConstruction1:
 *                      type: string
 *                   exteriorConstruction2:
 *                      type: string
 *                   extras:
 *                      type: string
 *                   garage:
 *                      type: string
 *                   heating:
 *                      type: string
 *                   numBathrooms:
 *                      type: number
 *                      format: int32
 *                      minimum: 0
 *                   numBathroomsPlus:
 *                      type: number
 *                      format: int32
 *                      minimum: 0
 *                   numBedrooms:
 *                      type: number
 *                      format: int32
 *                      minimum: 0
 *                   numBedroomsPlus:
 *                      type: number
 *                      format: int32
 *                      minimum: 0
 *                   numFireplaces:
 *                      $ref: '#/components/schemas/RplYesNo'
 *                   numGarageSpaces:
 *                      type: number
 *                      format: int32
 *                      minimum: 0
 *                   numParkingSpaces:
 *                      type: number
 *                      format: int32
 *                      minimum: 0
 *                   propertyType:
 *                      type: string
 *                   sqft:
 *                      type: number
 *                      format: int32
 *                      minimum: 0
 *                   style:
 *                      type: string
 *                   swimmingPool:
 *                      type: string
 *                   yearBuilt:
 *                      type: number
 *                      format: int32
 *                      minimum: 0
 *                required: [style, sqft, prepertyType, numBedrooms, numBathrooms, extras]
 *             lot:
 *                type: object
 *                properties:
 *                   acres:
 *                      type: string
 *                   depth:
 *                      type: number
 *                      format: int32
 *                      minimum: 0
 *                   width:
 *                      type: number
 *                      format: int32
 *                      minimum: 0
 *             sendEmailNow:
 *                type: boolean
 *             sendEmailMonthly:
 *                type: boolean
 *             taxes:
 *                type: object
 *                properties:
 *                   annualAmount:
 *                      type: number
 *                      format: int32
 *                      minimum: 0
 *                      exclusiveMinimum: true
 *             data:
 *                type: object
 *                properties:
 *                   purchasePrice:
 *                      type: number
 *                      format: int32
 *                      minimum: 0
 *                      exclusiveMinimum: true
 *                   imageUrl:
 *                      type: string
 *                      format: uri
 *                   purchaseDate:
 *                      $ref: '#/components/schemas/RplDate'
 *                   improvements:
 *                      type: object
 *                      properties:
 *                         maintenanceSpent:
 *                            type: number
 *                            format: int32
 *                            minimum: 0
 *                            exclusiveMinimum: true
 *                         improvementSpent:
 *                            type: number
 *                            format: int32
 *                            minimum: 0
 *                            exclusiveMinimum: true
 *                         landscapingSpent:
 *                            type: number
 *                            format: int32
 *                            minimum: 0
 *                            exclusiveMinimum: true
 *                         kitchenRenewalYear:
 *                            $ref: '#/components/schemas/RplDate'
 *                         bedroomsAdded:
 *                            type: object
 *                            properties:
 *                               count:
 *                                  type: integer
 *                                  format: int32
 *                                  minimum: 0
 *                                  exclusiveMinimum: true
 *                               year:
 *                                  $ref: '#/components/schemas/RplDate'
 *                         bathroomsAdded:
 *                            type: object
 *                            properties:
 *                               count:
 *                                  type: integer
 *                                  format: int32
 *                                  minimum: 0
 *                                  exclusiveMinimum: true
 *                               year:
 *                                  $ref: '#/components/schemas/RplDate'
 */

/**
 * @openapi
 * /api/estimate:
 *    post:
 *       tags:
 *          - Estimate
 *       summary: Use this endpoint to estimate a property's value by providing us with the property's attributes.
 *       security:
 *          - bearerAuth: []
 *       requestBody:
 *          description:
 *          content:
 *             application/json:
 *                schema:
 *                   $ref: '#/components/schemas/EstimateCreate'
 *       responses:
 *          400:
 *             $ref: '#/components/responses/BadRequest'
 *          401:
 *             $ref: '#/components/responses/Unauthorized'
 */
router.post("/", authMiddleware, async (ctx, next) => {
   ctx.state["enable.xff"] = true;
   const {
      error,
      value
   } = estimateAddSchema.validate({
      ...getBody(ctx.request.body),
      clientId: maybeClientId(ctx.state?.["user"]?.sub)
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const estimateService = ctx.state.container.resolve(EstimateService);
   ctx.body = await estimateService.add(value);
   next();
}, (ctx, next) => {
   const eventsCollectionMiddleware = ctx.state.container.resolve<EventsCollectionMiddleware>("middleware.eventsCollection");
   const selectEstimateParams = ctx.state.container.resolve(SelectEstimateParams);
   const selectEstimateNoteParams = ctx.state.container.resolve(SelectEstimateNoteParams);
   const estimateCollector = eventsCollectionMiddleware({
      selector: selectEstimateParams.select,
      notesSelector: selectEstimateNoteParams.select,
      options: {
         allowIncognito: true
      }
   });
   return estimateCollector(ctx, next);
});
router.patch("/:estimateId", authBlockingMiddleware, assertOwnership, async ctx => {
   ctx.state['enable.xff'] = true;
   const {
      error,
      value
   } = estimatePatchSchema.validate({
      ...getBody(ctx.request.body),
      estimateId: ctx.params["estimateId"],
      clientId: maybeClientId(ctx.state?.["user"]?.sub)
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const estimateService = ctx.state.container.resolve(EstimateService);
   ctx.body = await estimateService.patch(value);
});

/**
 * @openapi
 * /api/estimate:
 *    get:
 *       tags:
 *          - Estimate
 *       summary: Use this endpoint to fetch existing estimate by estimateId
 *       security:
 *          - bearerAuth: []
 *       parameters:
 *          - in: query
 *            name: estimateId
 *            schema:
 *                type: number
 *          - in: query
 *            name: clientId
 *            schema:
 *                type: number
 *            required: false
 *       responses:
 *          400:
 *             $ref: '#/components/responses/BadRequest'
 *          404:
 *             $ref: '#/components/responses/NotFound'
 */
router.get("/", authMiddleware, async (ctx, next) => {
   ctx.state["enable.xff"] = true;
   const {
      error,
      value
   } = estimateGetSchema.validate({
      ...ctx.request.query,
      clientId: maybeClientId(ctx.state?.["user"]?.sub)
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const estimateService = ctx.state.container.resolve(EstimateService);
   ctx.body = await estimateService.get(value);
   next();
}, (ctx, next) => {
   const eventsCollectionMiddleware = ctx.state.container.resolve<EventsCollectionMiddleware>("middleware.eventsCollection");
   const selectViewEstimateParams = ctx.state.container.resolve(SelectViewEstimateParams);
   const viewEstimateCollector = eventsCollectionMiddleware({
      selector: selectViewEstimateParams.select,
      options: {
         allowIncognito: false
      }
   });
   return viewEstimateCollector(ctx, next);
});

/**
 * @openapi
 * /api/estimate/my:
 *    get:
 *       tags:
 *          - Estimate
 *       summary: Use this endpoint to fetch all estimates for the current user
 *       security:
 *          - bearerAuth: []
 *       responses:
 *          400:
 *             $ref: '#/components/responses/BadRequest'
 *          401:
 *             $ref: '#/components/responses/Unauthorized'
 *          404:
 *             $ref: '#/components/responses/NotFound'
 */
router.get("/my", authBlockingMiddleware, async ctx => {
   ctx.state["enable.xff"] = true;
   const {
      error,
      value
   } = estimatesByClientIdGetSchema.validate({
      clientId: ctx.state?.["user"].sub
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const estimateService = ctx.state.container.resolve(EstimateService);
   ctx.body = await estimateService.getByClientId(value);
});

/**
 * @openapi
 * /api/estimate/{estimateId}:
 *    delete:
 *       tags:
 *          - Estimate
 *       summary: Use this endpoint to delete an estimate by estimateId
 *       security:
 *          - bearerAuth: []
 *       parameters:
 *          - in: path
 *            name: estimateId
 *            schema:
 *                type: number
 *            required: true
 *       responses:
 *          400:
 *             $ref: '#/components/responses/BadRequest'
 *          401:
 *             $ref: '#/components/responses/Unauthorized'
 *          404:
 *             $ref: '#/components/responses/NotFound'
 */
router.delete("/:estimateId", authBlockingMiddleware, assertOwnership, async ctx => {
   ctx.state["enable.xff"] = true;
   const {
      error,
      value
   } = deleteEstimateSchema.validate({
      estimateId: ctx.params["estimateId"]
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const estimateService = ctx.state.container.resolve(EstimateService);
   const result = await estimateService.delete(value);
   if (!result) {
      ctx.throw(new ApiError("Not found", 404));
   }
   ctx.body = result;
});

/**
 * @openapi
 * /api/estimate/property_details:
 *    get:
 *       tags:
 *          - Estimate
 *       summary: Use this endpoint to fetch details of the property that may be found among historical listings. The latest historical values will be used.
 *       security:
 *          - bearerAuth: []
 *       parameters:
 *          - in: query
 *            name: city
 *            schema:
 *                type: string
 *            required: true
 *          - in: query
 *            name: streetName
 *            schema:
 *                type: string
 *            required: true
 *          - in: query
 *            name: streetNumber
 *            schema:
 *                type: string
 *            required: true
 *          - in: query
 *            name: unitNumber
 *            schema:
 *                type: string
 *            required: false
 *          - in: query
 *            name: clientId
 *            schema:
 *                type: number
 *            required: false
 *          - in: query
 *            name: zip
 *            schema:
 *                type: string
 *            required: false
 *          - in: query
 *            name: streetSuffix
 *            schema:
 *                type: string
 *            required: false
 *          - in: query
 *            name: streetDirection
 *            schema:
 *                type: string
 *            required: false
 *          - in: query
 *            name: searchStrategy
 *            schema:
 *                type: array
 *                items:
 *                   type: string
 *                   enum: [streetSuffixInStreetName]
 *            required: false
 *            description: Strategy for flexible street name matching.
 *       responses:
 *          400:
 *             $ref: '#/components/responses/BadRequest'
 */
router.get("/property_details", authMiddleware, async ctx => {
   ctx.state["enable.xff"] = true;
   const {
      error,
      value
   } = estimatePropertyDetailsSchema.validate({
      ...ctx.request.query,
      clientId: ctx.state?.["user"]?.sub ? maybeClientId(ctx.state?.["user"]?.sub) : undefined
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const estimateService = ctx.state.container.resolve(EstimateService);
   ctx.body = await estimateService.propertyDetails(value);
});
export default router;