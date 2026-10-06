import Router from "@koa/router";
import { container } from "tsyringe";
import { ApiError } from "../../lib/errors.js";
import AssetsService from "../../services/user/assets.js";
import { userAssetsCreateSchema, userAssetsGetSchema, userAssetsRemoveSchema } from "../../validate/user/assets.js";
import { getBody } from "../../lib/utils.js";
import { Middleware } from "koa";
const authMiddleware = container.resolve<Middleware>("middleware.jwt");
const assetsService = container.resolve(AssetsService);
const router = new Router({
   prefix: "/assets"
});

/**
 * @openapi
 * /api/user/assets/{asset-type}:
 *    post:
 *       tags:
 *          - UserAssets
 *       summary: Create user asset
 *       security:
 *          - bearerAuth: []
 *       parameters:
 *          - in: path
 *            name: asset-type
 *            schema:
 *               type: string
 *               minLength: 1
 *               enum: ['image-favorites']
 *            required: true
 *       requestBody:
 *          content:
 *             application/json:
 *                schema:
 *                   type: object
 *                   properties:
 *                      id:
 *                         type: string
 *                   additionalProperties: true
 *       responses:
 *          201:
 *              description: Asset succesfully created
 *          409:
 *              description: If asset with such type, id and owner already exist
 */
router.post('/:type', authMiddleware, async ctx => {
   const {
      error,
      value
   } = userAssetsCreateSchema.validate({
      ...getBody(ctx.request.body),
      type: ctx.params['type'],
      email: ctx.state?.["user"]?.email
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   ctx.status = 201;
   const result = await assetsService.create(value);
   ctx.body = {
      result
   };
});

/**
 * @openapi
 * /api/user/assets/{asset-type}:
 *    get:
 *       tags:
 *          - UserAssets
 *       summary: Get list of user assets
 *       security:
 *          - bearerAuth: []
 *       parameters:
 *          - in: path
 *            name: asset-type
 *            schema:
 *               type: string
 *               minLength: 1
 *               enum: ['image-favorites']
 *            required: true
 *       responses:
 *          200:
 *              description: Asset succesfully removed
 */
router.get('/:type', authMiddleware, async ctx => {
   const {
      error,
      value
   } = userAssetsGetSchema.validate({
      type: ctx.params['type'],
      email: ctx.state?.["user"]?.email
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   ctx.body = await assetsService.get(value);
});

/**
 * @openapi
 * /api/user/assets/{asset-type}/remove:
 *    post:
 *       tags:
 *          - UserAssets
 *       summary: Delete user asset
 *       security:
 *          - bearerAuth: []
 *       parameters:
 *          - in: path
 *            name: asset-type
 *            schema:
 *               type: string
 *               minLength: 1
 *               enum: ['image-favorites']
 *            required: true
 *       requestBody:
 *          content:
 *             application/json:
 *                schema:
 *                   type: object
 *                   properties:
 *                      id:
 *                         type: string
 *       responses:
 *          200:
 *              description: Asset succesfully removed
 */
router.post('/:type/remove', authMiddleware, async ctx => {
   const {
      error,
      value
   } = userAssetsRemoveSchema.validate({
      ...getBody(ctx.request.body),
      type: ctx.params['type'],
      email: ctx.state?.["user"]?.email
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const result = await assetsService.remove(value);
   ctx.body = {
      result
   };
});
export default router;