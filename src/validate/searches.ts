import joi from "joi";
import { RepliersSearchesFilterDto, RplSearchesCreateDto, RplSearchesUpdateDto } from "../services/repliers/searches.js";
import { rplClassSchema, rplMapFlexibleSchema, rplTypeSingleSchema } from "./common.js";

/**
 * @openapi
 * components:
 *    schemas:
 *       RplSavedSearch:
 *          type: object
 *          properties:
 *             streetNumber:
 *                type: array
 *                items:
 *                   type: string
 *             streetNames:
 *                type: array
 *                items:
 *                   type: string
 *             minBeds:
 *                type: number
 *                format: int32
 *                minimum: 0
 *             maxBeds:
 *                type: number
 *                format: int32
 *                minimum: 0
 *             maxMaintenanceFee:
 *                type: number
 *                format: int32
 *                minimum: 0
 *             minBaths:
 *                type: number
 *                format: int32
 *                minimum: 0
 *             maxBaths:
 *                type: number
 *                format: int32
 *                minimum: 0
 *             areas:
 *                type: array
 *                items:
 *                   type: string
 *             cities:
 *                type: array
 *                items:
 *                   type: string
 *             neighborhoods:
 *                type: array
 *                items:
 *                   type: string
 *             notificationFrequency:
 *                type: string
 *                enum: [instant, daily, weekly, monthly]
 *             maxPrice:
 *                type: number
 *                format: int32
 *                minimum: 0
 *             minPrice:
 *                type: number
 *                format: int32
 *                minimum: 0
 *             propertyTypes:
 *                type: array
 *                items:
 *                   type: string
 *             styles:
 *                type: array
 *                items:
 *                   type: string
 *             map:
 *                type: string
 *                format: json
 *             status:
 *                type: boolean
 *             type:
 *                $ref: '#/components/schemas/RplType'
 *             class:
 *                $ref: '#/components/schemas/RplClass'
 *             minGarageSpaces:
 *                type: number
 *                format: int32
 *                minimum: 0
 *             minKitchens:
 *                type: number
 *                format: int32
 *                minimum: 0
 *             minParkingSpaces:
 *                type: number
 *                format: int32
 *                minimum: 0
 *             basement:
 *                type: array
 *                items:
 *                   type: string
 *             soldNotifications:
 *                type: boolean
 *             priceChangeNotifications:
 *                type: boolean
 *             sewer:
 *                type: array
 *                items:
 *                   type: string
 *             heating:
 *                type: array
 *                items:
 *                   type: string
 *             swimmingPool:
 *                type: array
 *                items:
 *                   type: string
 *             waterSource:
 *                type: array
 *                items:
 *                   type: string
 *             minYearBuilt:
 *                type: number
 *                format: int32
 *                minimum: 0
 *             maxYearBuilt:
 *                type: number
 *                format: int32
 *                minimum: 0
 *             minSqft:
 *                type: number
 *                format: int32
 *                minimum: 0
 *             maxSqft:
 *                type: number
 *                format: int32
 *                minimum: 0
 *             minLotSizeSqft:
 *                type: number
 *                format: int32
 *                minimum: 0
 *             maxLotSizeSqft:
 *                type: number
 *                format: int32
 *                minimum: 0
 *             keywords:
 *                type: array
 *                items:
 *                   type: string
 *          required: [minPrice, maxPrice, type, class]
 */
export const searchesCreateSchema = joi.object<RplSearchesCreateDto>().keys({
   clientId: joi.number().positive().required(),
   name: joi.string(),
   streetNumbers: joi.array().items(joi.string()),
   streetNames: joi.array().items(joi.string()),
   minBeds: joi.number().integer().positive(),
   minBedrooms: joi.number().integer().positive(),
   maxBeds: joi.number().integer().positive(),
   maxBedrooms: joi.number().integer().positive(),
   maxMaintenanceFee: joi.number().integer().positive(),
   minBaths: joi.number().integer().positive(),
   minBathrooms: joi.number().integer().positive(),
   maxBaths: joi.number().integer().positive(),
   maxBathrooms: joi.number().integer().positive(),
   areas: joi.array().items(joi.string()),
   cities: joi.array().items(joi.string()),
   neighborhoods: joi.array().items(joi.string()),
   notificationFrequency: joi.string().valid("instant", "daily", "weekly", "monthly"),
   maxPrice: joi.number().integer().positive().required(),
   minPrice: joi.number().integer().positive().required(),
   propertyTypes: joi.array().items(joi.string()),
   styles: joi.array().items(joi.string()),
   map: rplMapFlexibleSchema,
   status: joi.boolean(),
   type: rplTypeSingleSchema.required(),
   class: rplClassSchema.required(),
   minGarageSpaces: joi.number().integer().positive(),
   minKitchens: joi.number().integer().positive(),
   minParkingSpaces: joi.number().integer().positive(),
   basement: joi.array().items(joi.string()),
   soldNotifications: joi.boolean(),
   priceChangeNotifications: joi.boolean(),
   sewer: joi.array().items(joi.string()),
   heating: joi.array().items(joi.string()),
   swimmingPool: joi.array().items(joi.string()),
   waterSource: joi.array().items(joi.string()),
   minYearBuilt: joi.number().integer().positive(),
   maxYearBuilt: joi.number().integer().positive(),
   minSqft: joi.number().integer().positive(),
   maxSqft: joi.number().integer().positive(),
   minLotSizeSqft: joi.number().integer().positive(),
   maxLotSizeSqft: joi.number().integer().positive(),
   minLotWidth: joi.number().positive(),
   maxLotWidth: joi.number().positive(),
   keywords: joi.array().items(joi.string())
});
export const searchesUpdateSchema = searchesCreateSchema.append<RplSearchesCreateDto, RplSearchesUpdateDto>({
   searchId: joi.number().integer().positive().required()
});
export const searchsFilterSchema = joi.object<RepliersSearchesFilterDto>().keys({
   clientId: joi.number().integer().positive()
});
export const searchesDeleteSchema = joi.object<{
   searchId: number;
   clientId: number;
}>().keys({
   clientId: joi.number().integer().positive(),
   searchId: joi.number().integer().positive()
});
export const searchesGetSchema = joi.object<{
   searchId: number;
}>().keys({
   searchId: joi.number().integer().positive().required()
});