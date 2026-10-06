import joi from "joi";
import { RplClientsUpdateDto } from "../services/repliers/clients.js";
import { phoneSchema } from "./common.js";
export const userUpdateSchema = joi.object<RplClientsUpdateDto>().keys({
   fname: joi.string(),
   lname: joi.string(),
   phone: phoneSchema.allow(null).optional(),
   preferences: joi.object().keys({
      email: joi.boolean(),
      sms: joi.boolean(),
      unsubscribe: joi.boolean()
   }),
   status: joi.boolean(),
   tags: joi.array().items(joi.string()),
   clientId: joi.number()
});