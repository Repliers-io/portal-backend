import { injectable } from "tsyringe";
import _ from "lodash";
import BossService from "./boss.js";
import RepliersAgents from "./repliers/agents.js";
import { BossUsersGetDto, RplCreateAgentDto, RplUpdateAgentDto } from "../validate/admin.js";
import { normalizeEmail, normalizePhoneNumber } from "../lib/utils.js";
import { ApiError, ApiWarning } from "../lib/errors.js";
@injectable()
export default class AdminService {
   constructor(private readonly boss: BossService, private readonly repliersAgents: RepliersAgents) {}
   async getAgents(params: BossUsersGetDto) {
      const bossUsers = await this.boss.getUsers({
         ...params
      });
      const repliersAgents = await this.repliersAgents.filter({
         status: true
      });
      const agents = [];
      for (const user of bossUsers.users ?? []) {
         const matches = repliersAgents.agents.filter(agent => !!agent.email && !!agent.phone && (agent.email.toLowerCase() === user.email?.toLowerCase() || agent.phone === user.phone));
         agents.push({
            ...user,
            repliers: matches
         });
      }
      const response = {
         ..._.pick(bossUsers._metadata, ['offset', 'limit', 'total']),
         agents
      };
      return response;
   }
   async createAgentsBatch(params: RplCreateAgentDto[]) {
      const resultArray = [];
      for (const agent of params) {
         const normPhone = normalizePhoneNumber(agent.phone);
         const normEmail = normalizeEmail(agent.email);
         if (!normPhone || !normEmail) {
            resultArray.push("Phone or email is missing");
            continue;
         }
         const extAgent = {
            ...agent,
            phone: normPhone,
            email: normEmail,
            data: {
               ...agent?.data,
               lastSyncOn: new Date().toISOString()
            }
         };
         try {
            const resp = await this.repliersAgents.create(extAgent);
            resultArray.push(resp);
         } catch (error) {
            resultArray.push(this.stringifyError(error));
         }
      }
      return resultArray;
   }
   stringifyError(error: unknown) {
      let status = "UNKNOWN ERROR";
      if (error instanceof ApiError) {
         status = JSON.stringify({
            error: error.message,
            info: error.opts
         });
      } else if (error instanceof Error || error instanceof ApiWarning) {
         status = JSON.stringify({
            error: error.message
         });
      }
      return status;
   }
   async updateAgent(params: RplUpdateAgentDto) {
      const extParams = {
         ...params,
         phone: normalizePhoneNumber(params.phone)!,
         data: {
            ...params?.data,
            lastSyncOn: new Date().toISOString()
         }
      };
      return this.repliersAgents.update(extParams);
   }
}