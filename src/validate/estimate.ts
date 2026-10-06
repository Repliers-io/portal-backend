import joi from "joi";
import { RplEstimateAddCondominium, RplEstimateAddDto, RplEstimateAddData, RplEstimateAddDataImprovements, RplEstimateAddDataSalesIntentions, RplEstimateMortgage } from "../services/repliers/estimate.js";
import { rplYesNoSchema, dateSchema } from "./common.js";
import config from '../config.js';
const estimateDataRoomsAddedSchema = joi.object().keys({
   count: joi.number().positive().integer().required(),
   year: dateSchema.required()
});
const estimateStringOrArraySchema = joi.alternatives(joi.string().max(70), joi.array().items(joi.string().max(70)).max(10));
export const estimateBaseSchema = joi.object().keys({
   clientId: joi.number().positive().integer(),
   address: joi.object<RplEstimateAddDto["address"]>().keys({
      city: joi.string().required().max(100),
      streetName: joi.string().required(),
      streetNumber: joi.string().required(),
      streetSuffix: joi.string().required(),
      streetDirection: joi.string().max(20),
      unitNumber: joi.string().max(20),
      zip: joi.string().required().max(20),
      neighborhood: joi.string().max(100),
      district: joi.string().max(100),
      majorIntersection: joi.string().max(100),
      communityCode: joi.string().max(100)
   }),
   condominium: joi.object<RplEstimateAddCondominium>().keys({
      ammenities: joi.array().items(joi.string().max(50)),
      amenities: joi.array().items(joi.string().max(50)),
      exposure: joi.string().max(50),
      parkingType: estimateStringOrArraySchema,
      pets: estimateStringOrArraySchema,
      fees: joi.object<RplEstimateAddCondominium["fees"]>().keys({
         cableIncl: rplYesNoSchema,
         heatIncl: rplYesNoSchema,
         hydroIncl: rplYesNoSchema,
         parkingIncl: rplYesNoSchema,
         taxesIncl: rplYesNoSchema,
         waterIncl: rplYesNoSchema,
         maintenance: joi.number().positive()
      })
   }),
   details: joi.object<RplEstimateAddDto["details"]>().keys({
      basement1: estimateStringOrArraySchema,
      basement2: estimateStringOrArraySchema,
      driveway: estimateStringOrArraySchema,
      exteriorConstruction1: estimateStringOrArraySchema,
      exteriorConstruction2: estimateStringOrArraySchema,
      extras: joi.string().max(256),
      garage: estimateStringOrArraySchema,
      heating: estimateStringOrArraySchema,
      numBathrooms: joi.number().positive().integer().required(),
      numBathroomsPlus: joi.number().positive().integer(),
      numBedrooms: joi.number().positive().integer().required(),
      numBedroomsPlus: joi.number().positive().integer(),
      numFireplaces: rplYesNoSchema,
      numGarageSpaces: joi.number().positive().integer(),
      numParkingSpaces: joi.number().positive().integer(),
      propertyType: joi.string().required().max(50),
      sqft: joi.number().positive().integer().required(),
      style: joi.string().required().max(50),
      swimmingPool: estimateStringOrArraySchema,
      yearBuilt: joi.alternatives(joi.number().integer().positive().allow(""), joi.string().allow("").max(8))
   }),
   lot: joi.object<RplEstimateAddDto["lot"]>().keys({
      acres: joi.string().max(70),
      depth: joi.number().positive().integer(),
      width: joi.number().positive().integer()
   }),
   sendEmailNow: joi.boolean(),
   sendEmailMonthly: joi.boolean(),
   taxes: joi.object<RplEstimateAddDto["taxes"]>().keys({
      annualAmount: joi.number().positive().required()
   }),
   data: joi.object<RplEstimateAddData>().keys({
      purchasePrice: joi.number().positive().integer(),
      purchaseDate: dateSchema,
      imageUrl: joi.string().uri().max(1024),
      improvements: joi.object<RplEstimateAddDataImprovements>().keys({
         maintenanceSpent: joi.number().positive().integer(),
         improvementSpent: joi.number().positive().integer(),
         landscapingSpent: joi.number().positive().integer(),
         kitchenRenewalYear: dateSchema,
         bedroomsAdded: estimateDataRoomsAddedSchema,
         bathroomsAdded: estimateDataRoomsAddedSchema
      }),
      salesIntentions: joi.object<RplEstimateAddDataSalesIntentions>().keys({
         sellingTimeline: joi.string().max(70)
      }),
      mortgage: joi.object<RplEstimateMortgage>().keys({
         balance: joi.number().min(0).integer()
      })
   })
});
export const estimateAddSchema: joi.ObjectSchema<RplEstimateAddDto> = estimateBaseSchema.keys({
   boardId: joi.number().positive().integer().required()
});
export interface RplEstimatePatchDto extends Omit<RplEstimateAddDto, "boardId"> {
   estimateId: number;
   clientId: number;
}
export const estimatePatchSchema: joi.ObjectSchema<RplEstimatePatchDto> = estimateBaseSchema.keys({
   estimateId: joi.number().required(),
   clientId: joi.number().required()
});
export interface EstimateGetByEstimateId {
   estimateId: number;
   clientId?: number;
}
export interface EstimateGetByUlid {
   ulid: string;
   clientId?: number;
}
export type EstimateGetDto = EstimateGetByEstimateId | EstimateGetByUlid;
export const estimateGetSchema = joi.object<EstimateGetDto>().keys({
   estimateId: joi.number().max(config.settings.max_estimate_id),
   ulid: joi.string().length(26),
   clientId: joi.number()
}).or("estimateId", "ulid");
export interface EstimatePropertyDetailsDto {
   city: string;
   streetName: string;
   streetNumber: string;
   zip: string;
   unitNumber: string;
   streetSuffix: string;
   streetDirection: string;
   clientId: number;
   searchStrategy: string[];
}
export const estimatePropertyDetailsSchema = joi.object<EstimatePropertyDetailsDto>().keys({
   city: joi.string().required(),
   streetName: joi.string().required(),
   streetNumber: joi.string().required(),
   unitNumber: joi.string(),
   streetSuffix: joi.string(),
   streetDirection: joi.string(),
   zip: joi.string(),
   clientId: joi.number(),
   searchStrategy: joi.array().items(joi.string().valid("streetSuffixInStreetName")).single()
});
export interface EstimatesByClientIdGetDto {
   clientId: number;
}
export const estimatesByClientIdGetSchema = joi.object<EstimatesByClientIdGetDto>().keys({
   clientId: joi.number().required()
});
export interface DeleteEstimateDto {
   estimateId: number;
}
export const deleteEstimateSchema = joi.object<DeleteEstimateDto>().keys({
   estimateId: joi.number().required()
});