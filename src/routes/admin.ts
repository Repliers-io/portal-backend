import Router from "@koa/router";
import { container } from "tsyringe";
import { Middleware } from "koa-jwt";
import { ApiError } from "../lib/errors.js";
import { RoleMiddlewareCreator } from "../providers/middleware/role.js";
import { UserRole } from "../constants.js";
import AdminService from "../services/admin.js";
import { adminCreateAgentBatchSchema, adminUpdateAgentSchema, adminGetAgentsSchema } from "../validate/admin.js";
import { getBody } from "../lib/utils.js";
const router = new Router({
   prefix: "/admin"
});
const authMiddleware = container.resolve<Middleware>("middleware.jwt");
const roleMiddleware = container.resolve<RoleMiddlewareCreator>("middleware.role");
router.use(authMiddleware, roleMiddleware([UserRole.Admin, UserRole.Root]));
router.get('/agents', async ctx => {
   ctx.state['enable.xff'] = true;
   const {
      error,
      value
   } = adminGetAgentsSchema.validate({
      ...ctx.request.query
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const adminService = ctx.state.container.resolve(AdminService);
   ctx.body = await adminService.getAgents(value);
});
router.post('/agents', async ctx => {
   ctx.state['enable.xff'] = true;
   const {
      error,
      value
   } = adminCreateAgentBatchSchema.validate([
   // this is because koa-body didn't expect that body can be an array
   ...(ctx.request.body as unknown as any[])]);
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const adminService = ctx.state.container.resolve(AdminService);
   ctx.body = await adminService.createAgentsBatch(value);
});
router.patch('/agents/:agentId', async ctx => {
   ctx.state['enable.xff'] = true;
   const {
      error,
      value
   } = adminUpdateAgentSchema.validate({
      ...getBody(ctx.request.body),
      agentId: ctx.params['agentId']
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const adminService = ctx.state.container.resolve(AdminService);
   ctx.body = await adminService.updateAgent(value);
});
export default router;