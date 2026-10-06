import Router from "@koa/router";
import { container } from "tsyringe";
import type { Middleware } from "koa-jwt";
import AuthService from "../services/auth.js";
import { ApiError } from "../lib/errors.js";
import { authEmbedSchema, authRepliersTokenSchema, providerCallbackSchema, providerUrlSchema, userLoginSchema, userOtpSchema, userSignupSchema } from "../validate/auth.js";
import OAuthService from "../services/oauth.js";
import { oauthUrlSchema } from "../validate/oauth.js";
import { getBody } from "../lib/utils.js";
const authMiddleware = container.resolve<Middleware>("middleware.jwt");
const router = new Router({
   prefix: "/auth"
});
router.param("provider", (provider, ctx, next) => {
   const {
      error,
      value
   } = oauthUrlSchema.validate({
      provider
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   ctx["provider"] = value.provider;
   return next();
});

/**
 * @openapi
 * /api/auth/{provider}/url:
 *    get:
 *       tags:
 *          - Auth
 *       summary: Return url for google-based oAuth flow
 *       parameters:
 *          - in: path
 *            name: provider
 *            schema:
 *               type: string
 *               enum: ['google', 'facebook']
 *            description: |
 *               Type of authentication provider to generate auth url for
 *
 *       responses:
 *          200:
 *             description: url for redirect
 *             content:
 *                application/json:
 *                   schema:
 *                      type: object
 *                      properties:
 *                         url:
 *                            type: string
 *                            format: uri
 *                            example: https://accounts.google.com/o/oauth2/v2/auth?redirect_uri=...&access_type=offline&scope=...&include_granted_scopes=true&response_type=code&client_id=...
 */
router.get("/:provider/url", async ctx => {
   const oAuthService = ctx.state.container.resolve(OAuthService);
   const {
      error,
      value
   } = providerUrlSchema.validate(ctx.request.query);
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const url = await oAuthService.url(ctx["provider"], value.redirect_uri);
   ctx.body = {
      url
   };
});

/**
 * @openapi
 * /api/auth/{provider}/cb:
 *    post:
 *       tags:
 *          - Auth
 *       summary: authorize user via oauth provider and return JWT token
 *       parameters:
 *          - in: path
 *            name: provider
 *            schema:
 *               type: string
 *               enum: ['google', 'facebook']
 *            description: |
 *               Type of authentication provider to generate auth url for
 *       description: Frontend should proxy all params passed from google to this endpoint to get JWT token
 *       requestBody:
 *          description: all params passed to redirect_url as query params but in body including code and extra url if it was used on /google/url request
 *          content:
 *             application/json:
 *                schema:
 *                   type: object
 *                   properties:
 *                      code:
 *                         type: string
 *                      url:
 *                         type: string
 *                         format: uri
 *                         description: Should be the same url (or undefined) as used in GET /google/url request
 *                   required: [code]
 *       responses:
 *          200:
 *             description: jwt token
 *             content:
 *                application/json:
 *                   schema:
 *                      type: object
 *                      properties:
 *                         token:
 *                            type: string
 *                         profile:
 *                            type: object
 *                            properties:
 *                               first_name:
 *                                  type: string
 *                               last_name:
 *                                  type: string
 *                               picture:
 *                                  type: string
 *
 */
router.post("/:provider/cb", async ctx => {
   ctx.state["enable.xff"] = true;
   const {
      error: bodyError,
      value: body
   } = providerCallbackSchema.validate(ctx.request.body);
   if (bodyError) {
      ctx.throw(new ApiError(bodyError.message, 400));
      return;
   }
   const {
      error: queryError,
      value: query
   } = providerUrlSchema.validate(ctx.request.query);
   if (queryError) {
      ctx.throw(new ApiError(queryError.message, 400));
      return;
   }
   const oAuthService = ctx.state.container.resolve(OAuthService);
   const {
      token,
      profile
   } = await oAuthService.callback(ctx["provider"], {
      code: body.code,
      uri: body.redirect_uri ?? query.redirect_uri
   });
   ctx.body = {
      token,
      profile
   };
});

/**
 * @openapi
 * components:
 *    schemas:
 *       UserProfile:
 *          type: object
 *          properties:
 *             clientId: string
 * /api/auth/login:
 *    post:
 *       tags:
 *          - Auth
 *       requestBody:
 *          description: Email / phone for OTP login
 *          required: true
 *          content:
 *             application/json:
 *                schema:
 *                   type: object
 *                   properties:
 *                      email:
 *                         $ref: '#/components/schemas/email'
 *                      phone:
 *                        type: string
 *       summary: User login
 *       description: Will return static true
 *       responses:
 *          200:
 *             description: sends OTP code to corresponding email / phone
 *             content:
 *                application/json:
 *                   schema:
 *                      type: object
 *                      properties:
 *                         result:
 *                            type: boolean
 *          400:
 *             $ref: '#/components/responses/BadRequest'
 */
router.post("/login", async ctx => {
   ctx.state["enable.xff"] = true;
   const {
      error,
      value
   } = userLoginSchema.validate(ctx.request.body);
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const authService = ctx.state.container.resolve(AuthService);
   const maybeCode = await authService.login(value);
   ctx.body = {
      result: true,
      ...maybeCode
   };
});

/**
 * @openapi
 * /api/auth/otp:
 *    post:
 *       tags:
 *          - Auth
 *       requestBody:
 *          description: OTP code for authorisation
 *          required: true
 *          content:
 *             application/json:
 *                schema:
 *                   type: object
 *                   properties:
 *                      code:
 *                        type: string
 *                   required: [code]
 *       summary: Consume OTP code to login
 *       description: Will return JWT token
 *       responses:
 *          200:
 *             description: Returns temp OTP token associated with user account
 *             content:
 *                application/json:
 *                   schema:
 *                      type: object
 *                      properties:
 *                         token:
 *                            type: string
 *                         profile:
 *                            type: object
 *                            unknown: true
 *          400:
 *             $ref: '#/components/responses/BadRequest'
 *          403:
 *             $ref: '#/components/responses/Forbidden'
 */
router.post("/otp", async ctx => {
   ctx.state["enable.xff"] = true;
   const {
      error,
      value
   } = userOtpSchema.validate(ctx.request.body);
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const authService = ctx.state.container.resolve(AuthService);
   const {
      token,
      profile
   } = await authService.useOtp(value);
   ctx.body = {
      token,
      profile
   };
});

/**
 * @openapi
 * /api/auth/refresh:
 *    post:
 *       tags:
 *          - Auth
 *       summary: Refresh previous token
 *       description: Refreshed token will have same expiration period as supplied
 *       responses:
 *          200:
 *             description: Returns jwt token associated with user account
 *             content:
 *                application/json:
 *                   schema:
 *                      type: object
 *                      properties:
 *                         token:
 *                            type: string
 *          401:
 *             $ref: '#/components/responses/Unauthorized'
 */
router.post("/refresh", authMiddleware, async ctx => {
   ctx.state["enable.xff"] = true;
   const authService = ctx.state.container.resolve(AuthService);
   const {
      token
   } = await authService.refresh(ctx.state["user"]);
   ctx.body = {
      token
   };
});

/**
 * @openapi
 * /api/auth/logout:
 *    post:
 *       tags:
 *          - Auth
 *       summary: Revoke jwt token
 *       description: Token will remain revoked until its expiration time happens
 *       responses:
 *          200:
 *             description: Return true if key was succesfully removed
 *             content:
 *                application/json:
 *                   schema:
 *                      type: object
 *                      properties:
 *                         result:
 *                            type: boolean
 *          401:
 *             $ref: '#/components/responses/Unauthorized'
 */
router.post("/logout", authMiddleware, async ctx => {
   ctx.state["enable.xff"] = true;
   const authService = ctx.state.container.resolve(AuthService);
   await authService.logout(ctx.state["user"].jti, ctx.state["user"].exp);
   ctx.body = {
      result: true
   };
});

/**
 * @openapi
 * /api/auth/signup:
 *    post:
 *       tags:
 *          - Auth
 *       summary: Signup user and sends verification email
 *       description:
 *       responses:
 *          200:
 *             description: Return true if key was succesfully removed
 *             content:
 *                application/json:
 *                   schema:
 *                      type: object
 *                      properties:
 *                         result:
 *                            type: boolean
 *          401:
 *             $ref: '#/components/responses/Unauthorized'
 *          400:
 *             description: Validation error, in case validation fails on Auth0 side will include additional "info" key
 *             content:
 *                application/json:
 *                   schema:
 *                      type: object
 *                      properties:
 *                         message:
 *                            type: string
 *                         info:
 *                            type: object
 *                            properties:
 *                               message:
 *                                  type: string
 *                      required: [message]
 */
router.post("/signup", async ctx => {
   ctx.state["enable.xff"] = true;
   const {
      error,
      value
   } = userSignupSchema.validate({
      ...getBody(ctx.request.body),
      referer: ctx.request.headers["referer"]
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const authService = ctx.state.container.resolve(AuthService);
   const maybeCode = await authService.signup(value);
   ctx.body = {
      result: true,
      ...maybeCode
   };
});

/**
 * @openapi
 * /api/auth/repliers-token:
 *    post:
 *       tags:
 *          - Auth
 *       summary: Exchange repliers token for JWT token
 *       requestBody:
 *          description: Repliers token
 *          content:
 *             application/json:
 *                schema:
 *                   type: object
 *                   properties:
 *                      token:
 *                        type: string
 *                   required: [token]
 *       responses:
 *          200:
 *             description: Returns temp JWT token associated with user account and user profile
 *             content:
 *                application/json:
 *                   schema:
 *                      type: object
 *                      properties:
 *                         token:
 *                            type: string
 *                         profile:
 *                            type: object
 *                            unknown: true
 *
 *          400:
 *             $ref: '#/components/responses/BadRequest'
 *          403:
 *             $ref: '#/components/responses/Forbidden'
 *          412:
 *             $ref: '#/components/responses/PreconditionFailed'
 */
router.post("/repliers-token", async ctx => {
   ctx.state["enable.xff"] = true;
   const {
      error,
      value
   } = authRepliersTokenSchema.validate(ctx.request.body);
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const authService = ctx.state.container.resolve(AuthService);
   const result = await authService.useRepliersToken(value);
   ctx.body = {
      result
   };
});
router.post("/embed", async ctx => {
   ctx.state["enable.xff"] = true;
   const {
      error,
      value
   } = authEmbedSchema.validate(ctx.request.body);
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const authService = ctx.state.container.resolve(AuthService);
   const result = await authService.embedLogin(value);
   ctx.body = {
      result
   };
});
export default router;