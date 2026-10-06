import Router from "@koa/router";
import { container } from "tsyringe";
import { ApiError } from "../../lib/errors.js";
import SocialService from "../../services/user/social.js";
import { userSocialCallbackSchema, userSocialGetTokensSchema, userSocialRefreshSchema, userSocialUnlinkSchema, userSocialUrlSchema } from "../../validate/user/social.js";
import { Middleware } from "koa";
const authMiddleware = container.resolve<Middleware>("middleware.jwt");
const socialService = container.resolve(SocialService);
const router = new Router({
   prefix: "/social"
});

/**
* @openapi
* /social/{provider}/url:
*   get:
*     summary: Get url for social provider
*     description: Get url for social provider
*     tags:
*       - Social
*     parameters:
*       - in: path
*         name: provider
*         schema:
*           type: string
*           enum: [pinterest]
*         required: true
*         description: Social provider
*     responses:
*       200:
*         description: Social url
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 url:
*                   type: string
*                   description: Social url
*       400:
*          $ref: '#/components/responses/BadRequest'
*       401:
*          $ref: '#/components/responses/Unauthorized'
*/
router.get("/:provider/url", authMiddleware, async ctx => {
   const {
      error,
      value
   } = userSocialUrlSchema.validate({
      provider: ctx.params["provider"]
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const {
      provider
   } = value;
   const result = await socialService.getUrl(provider);
   ctx.body = {
      url: result
   };
});

/**
* @openapi
* /social/{provider}/cb:
*   get:
*     summary: Doing callback for social provider
*     description: Return access token for social provider
*     tags:
*       - Social
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: provider
*         schema:
*           type: string
*           enum: [pinterest]
*         required: true
*         description: Social provider
*     responses:
*       200:
*         description: Tokens
*         content:
*           application/json:
*             schema:
*               type: object
*       400:
*          $ref: '#/components/responses/BadRequest'
*       401:
*          $ref: '#/components/responses/Unauthorized'
*/
router.get("/:provider/cb", authMiddleware, async ctx => {
   const {
      error,
      value
   } = userSocialCallbackSchema.validate({
      email: ctx.state["user"].email,
      provider: ctx.params["provider"],
      code: ctx.query["code"]
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   // We rely on the social provider (openid-client) to validate ctx.req
   const result = await socialService.callback(value);
   ctx.body = result;
});

/**
* @openapi
* /social/{provider}/refresh:
*   get:
*     summary: Refresh access token for social provider
*     description: Uses internaly stored refresh token
*     tags:
*       - Social
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: provider
*         schema:
*           type: string
*           enum: [pinterest]
*         required: true
*         description: Social provider
*     responses:
*       200:
*         description: New set of Tokens
*         content:
*           application/json:
*             schema:
*               type: object
*       400:
*          $ref: '#/components/responses/BadRequest'
*       401:
*          $ref: '#/components/responses/Unauthorized'
*/
router.get("/:provider/refresh", authMiddleware, async ctx => {
   const {
      error,
      value
   } = userSocialRefreshSchema.validate({
      provider: ctx.params["provider"],
      email: ctx.state["user"].email
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const result = await socialService.refresh(value);
   ctx.body = result;
});
router.get("/{:provider}", authMiddleware, async ctx => {
   const {
      error,
      value
   } = userSocialGetTokensSchema.validate({
      provider: ctx.params["provider"],
      email: ctx.state["user"].email
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const result = await socialService.getTokens(value);
   ctx.body = result;
});

/**
* @openapi
* /social/{provider}:
*   delete:
*     summary: Unlink user account from social provider
*     description: Unlink user account from social provider
*     tags:
*       - Social
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: provider
*         schema:
*           type: string
*           enum: [pinterest]
*         required: true
*         description: Social provider
*     responses:
*       200:
*         description: Social url
*         content:
*           application/json:
*             schema:
*               type: object
*       400:
*          $ref: '#/components/responses/BadRequest'
*       401:
*          $ref: '#/components/responses/Unauthorized'
*/
router.delete("/:provider", authMiddleware, async ctx => {
   const {
      error,
      value
   } = userSocialUnlinkSchema.validate({
      provider: ctx.params["provider"],
      email: ctx.state["user"].email
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const result = await socialService.unlinkAccount(value);
   ctx.body = result;
});
export default router;