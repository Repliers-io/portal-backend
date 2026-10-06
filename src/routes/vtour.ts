import Router from "@koa/router";
import { container } from "tsyringe";
import { Middleware } from "koa-jwt";
import { ApiError } from "../lib/errors.js";
import { RoleMiddlewareCreator } from "../providers/middleware/role.js";
import { UserRole } from "../constants.js";
import { vtourCreateSchema, vtourRemoveSchema, vtourSlugSchema, vtourUpdateSchema } from "../validate/vtour.js";
import VtourService from "../services/vtour.js";
import { Context } from "koa";
import { getBody } from "../lib/utils.js";
const router = new Router({
   prefix: "/vtour"
});
const authMiddleware = container.resolve<Middleware>("middleware.jwt");
const roleMiddleware = container.resolve<RoleMiddlewareCreator>("middleware.role");
const vtourService = container.resolve(VtourService);

/**
* @openapi
*  components:
*     parameters:
*        vtourSlug:
*           in: path
*           name: slug
*           required: true
*           schema:
*              type: string
*              pattern: ^[a-z0-9-_]+$
*/
router.param("slug", async (slug, ctx: Context, next) => {
   const {
      error,
      value
   } = vtourSlugSchema.validate({
      slug
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
   }
   const vtour = await vtourService.getOne(value.slug);
   ctx.assert(vtour, 404);
   ctx.state["vtour"] = vtour;
   return next();
});

/**
 * @openapi
 * /api/vtour:
 *    post:
 *       tags:
 *          - Vtour
 *       summary: Create vtour
 *       security:
 *          - bearerAuth: []
 *       requestBody:
 *          content:
 *             application/json:
 *                schema:
 *                   type: object
 *                   properties:
 *                      id:
 *                         type: string
 *                      data:
 *                         type: array
 *                         items:
 *                            type: object
 *                            properties:
 *                               type:
 *                                  type: string
 *                               title:
 *                                  type: string
 *                               url:
 *                                  type: string
 *                                  format: uri
 *       responses:
 *          201:
 *              description: Vtour succesfully created
 *          409:
 *              description: If vtour with such slug(id) already exist
 */
router.post("/", authMiddleware, roleMiddleware([UserRole.Admin, UserRole.Root]), async ctx => {
   const {
      error,
      value
   } = vtourCreateSchema.validate({
      ...getBody(ctx.request.body),
      owner_id: ctx.state['user'].sub
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const result = await vtourService.create(value);
   ctx.body = {
      result
   };
});

/**
 * @openapi
 * /api/vtour/{slug}:
 *    delete:
 *       tags:
 *          - Vtour
 *       summary: Delete vtour
 *       security:
 *          - bearerAuth: []
 *       parameters:
 *          - $ref: '#/components/parameters/vtourSlug'
 *       responses:
 *          200:
 *              description: Vtour succesfully removed
 *          400:
 *              $ref: '#/components/responses/BadRequest'
 */
router.del("/:slug", authMiddleware, roleMiddleware([UserRole.Admin, UserRole.Root]), async ctx => {
   const {
      error,
      value
   } = vtourRemoveSchema.validate({
      user_id: ctx.state['user'].sub,
      role: ctx.state['user'].role,
      owner_id: ctx.state['vtour'].owner_id,
      id: ctx.params['slug']
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const result = await vtourService.remove(value.id);
   ctx.body = {
      result
   };
});

/**
 * @openapi
 * /api/vtour/{slug}:
 *    put:
 *       tags:
 *          - Vtour
 *       summary: Update vtour info
 *       security:
 *          - bearerAuth: []
 *       parameters:
 *          - $ref: '#/components/parameters/vtourSlug'
 *       requestBody:
 *          content:
 *             application/json:
 *                schema:
 *                   type: object
 *                   properties:
 *                      data:
 *                         type: array
 *                         items:
 *                            type: object
 *                            properties:
 *                               type:
 *                                  type: string
 *                               title:
 *                                  type: string
 *                               url:
 *                                  type: string
 *                                  format: uri
 *       responses:
 *          200:
 *              description: Vtour updated
 *          400:
 *              $ref: '#/components/responses/BadRequest'
 *          401:
 *             $ref: '#/components/responses/Unauthorized'
 *          403:
 *             $ref: '#/components/responses/Forbidden'
 */
router.put("/:slug", authMiddleware, roleMiddleware([UserRole.Admin, UserRole.Root]), async ctx => {
   const {
      error,
      value
   } = vtourUpdateSchema.validate({
      ...getBody(ctx.request.body),
      id: ctx.params['slug'],
      user_id: ctx.state['user'].sub,
      role: ctx.state['user'].role,
      owner_id: ctx.state['vtour'].owner_id
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const result = await vtourService.update(value);
   ctx.body = {
      result
   };
});

/**
 * @openapi
 * /api/vtour/{slug}:
 *    get:
 *       tags:
 *          - Vtour
 *       summary: Get vtour info
 *       security:
 *          - bearerAuth: []
 *       parameters:
 *          - $ref: '#/components/parameters/vtourSlug'
 *       responses:
 *          200:
 *              description: Vtour information
 *          400:
 *              $ref: '#/components/responses/BadRequest'
 *          401:
 *             $ref: '#/components/responses/Unauthorized'
 */
router.get("/:slug", authMiddleware, ctx => {
   ctx.body = ctx.state['vtour'];
});
export default router;