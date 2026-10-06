import Router from "@koa/router";
import { container } from "tsyringe";
import { ApiError } from "../../lib/errors.js";
import { userBossTagSchema } from "../../validate/user/boss.js";
import BossService from "../../services/boss.js";
import UserService from "../../services/user.js";
import { getBody } from "../../lib/utils.js";
import { Middleware } from "koa";
const authMiddleware = container.resolve<Middleware>("middleware.jwt");
const router = new Router({
   prefix: "/boss"
});

/**
 * @openapi
 * /api/user/boss/tag:
 *    post:
 *       tags:
 *          - UserBoss
 *       summary: Adds a tag(s) to the user's boss profile
 *       security:
 *          - bearerAuth: []
 *       requestBody:
 *          content:
 *             application/json:
 *                schema:
 *                   type: object
 *                   properties:
 *                      tags:
 *                         type: array
 *                         items:
 *                            type: string
 *                   required: [tags]
 *                   example:
 *                      tags: ["tag1", "tag2"]
 *                   description: Tags to be added to the user's boss profile
 *                   additionalProperties: false
 *       responses:
 *          201:
 *              description: Tags successfully added or have been added before
 */
router.post("/tag", authMiddleware, async ctx => {
   ctx.state["enable.xff"] = true;
   const {
      error,
      value
   } = userBossTagSchema.validate({
      ...getBody(ctx.request.body),
      userId: ctx.state?.["user"]?.sub
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const bossService = container.resolve(BossService);
   const userService = ctx.state.container.resolve(UserService);
   const user = await userService.info(value.userId);
   if (!user || !user.externalId) {
      ctx.throw(new ApiError("User not found", 404));
      return;
   }

   // https://docs.followupboss.com/reference/people-id-put
   // !!!! Tag updates will overwrite all existing tags
   const response = await bossService.getPeople({
      id: user.externalId
   });
   if (!response || !response.people || !response.people[0]) {
      ctx.throw(new ApiError("Person not found", 404));
      return;
   }
   const tags = new Set(response.people[0].tags);
   for (const tag of value.tags) {
      tags.add(tag);
   }
   const result = await bossService.peopleUpdate(user.externalId, {
      tags: [...tags]
   });
   ctx.status = 201;
   ctx.body = {
      result
   };
});
export default router;