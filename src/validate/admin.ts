import joi from "joi";
import { BossUsersGetRequest } from "../services/boss.js";
import { RplAgentsCreateRequest } from "../services/repliers/agents.js";
export interface RplCreateAgentDto extends RplAgentsCreateRequest {}
const adminCreateAgentSchemaKeys = {
   externalId: joi.alternatives(joi.string(), joi.number().integer().cast("string")),
   fname: joi.string().required(),
   lname: joi.string().required(),
   phone: joi.string().required().min(10).max(20),
   email: joi.string().required(),
   brokerage: joi.string().required(),
   designation: joi.string().required(),
   avatar: joi.string().optional(),
   status: joi.boolean().optional(),
   location: joi.object({
      latitude: joi.string().required(),
      longitude: joi.string().required()
   }).optional()
};
export const adminCreateAgentSchema = joi.object<RplCreateAgentDto>(adminCreateAgentSchemaKeys);
export const adminCreateAgentBatchSchema = joi.array().items(joi.object<RplCreateAgentDto>(adminCreateAgentSchemaKeys));
export interface RplUpdateAgentDto extends Partial<RplCreateAgentDto> {
   agentId: number;
}
export const adminUpdateAgentSchema = (adminCreateAgentSchema.fork(Object.keys(adminCreateAgentSchemaKeys), schema => schema.optional()) as joi.ObjectSchema<RplUpdateAgentDto>).keys({
   agentId: joi.number().required()
}).min(2);
export interface BossUsersGetDto extends BossUsersGetRequest {}
export const adminGetAgentsSchema = joi.object<BossUsersGetDto>({
   offset: joi.number().integer().min(0).default(0),
   limit: joi.number().integer().min(1).max(100).default(10)
});