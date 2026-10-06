import joi from "joi";
import { contactMessageSchema, contactNameSchema, dateSchema, emailSchema, mlsNumberSchema, phoneSchema } from "./common.js";
import { overrides } from './overrides/overrides.js';
import config from '../config.js';
const customValidators = overrides(config.settings.validationVersion);
export type ContactUsDto = {
   name: string;
   email: string;
   phone: string;
   message: string;
   clientId?: number;
   pageUrl?: string;
   // FUB tags naming the form that produced the lead ("Buy", "Sell", "Consult", an agent name).
   tags?: string[];
};
export type SubscribeNewsletterDto = {
   email: string;
   pageUrl?: string;
};
export const subscribeNewsletterSchema = joi.object<SubscribeNewsletterDto>().keys({
   email: emailSchema.required(),
   pageUrl: joi.string().uri().optional()
});
export const contactSchema = customValidators.contactSchema || joi.object<ContactUsDto>().keys({
   name: contactNameSchema.required(),
   email: emailSchema.required(),
   phone: phoneSchema.required(),
   message: contactMessageSchema.required(),
   clientId: joi.number(),
   pageUrl: joi.string().uri().optional(),
   // Plain labels (letters incl. accents for agent names, digits, space, .'-), so a form
   // can name its own tags without a config entry per form.
   tags: joi.array().items(joi.string().pattern(/^[\p{L}\p{N} .'-]{1,50}$/u)).max(5).optional()
});

/**
* @openapi
*  components:
*     schemas:
*        ContactScheduleMethod:
*           type: string
*           enum: [InPerson, LiveVideo]
*/
export enum ContactScheduleMethod {
   InPerson = "InPerson",
   LiveVideo = "LiveVideo"
}
export interface ScheduleDto {
   name: string;
   email: string;
   phone: string;
   method: ContactScheduleMethod;
   date: string;
   time: string;
   mlsNumber: string;
   clientId?: number;
   // Optional note from the visitor (the portal sends the financing opt-in here).
   message?: string;
}
export interface ScheduleEstimateDto {
   name: string;
   email: string;
   phone: string;
   date: string;
   time: string;
   estimateId: string;
   clientId?: number;
}
export const scheduleSchema = joi.object<ScheduleDto>().keys({
   name: contactNameSchema.required(),
   email: emailSchema.required(),
   phone: phoneSchema.required(),
   method: joi.string().valid(...Object.values(ContactScheduleMethod)).required().default(ContactScheduleMethod.InPerson),
   date: dateSchema.required(),
   time: joi.string().min(4).max(12).required(),
   mlsNumber: mlsNumberSchema.required(),
   // don't we need board id to make sure we can find by mlsNumber?
   clientId: joi.number(),
   message: contactMessageSchema.empty("")
});
export const scheduleEstimateSchema = joi.object<ScheduleEstimateDto>().keys({
   name: contactNameSchema.required(),
   email: emailSchema.required(),
   phone: phoneSchema,
   date: dateSchema.required(),
   time: joi.string().min(4).max(12).required(),
   estimateId: joi.number().required(),
   clientId: joi.number()
});
export type RequestInfoDto = {
   name: string;
   email: string;
   phone: string;
   message: string;
   mlsNumber: string;
   clientId?: number;
};
export const requestInfoSchema = customValidators.requestInfoSchema || joi.object<RequestInfoDto>().keys({
   name: contactNameSchema.required(),
   email: emailSchema.required(),
   phone: phoneSchema.required(),
   message: contactMessageSchema.required(),
   mlsNumber: mlsNumberSchema.required(),
   clientId: joi.number()
});