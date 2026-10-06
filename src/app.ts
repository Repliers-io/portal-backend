import Koa, { HttpError, Middleware } from "koa";
import router from "./routes/index.js";
import { container } from "tsyringe";
import { ApiError } from "./lib/errors.js";
import type pino from "pino";
import { AppConfig } from "./config.js";
const app = new Koa();
app.use(async (ctx, next) => {
   try {
      await next();
      // eslint-disable-next-line
   } catch (err: any | ApiError) {
      const logger = container.resolve<pino.Logger>("logger");
      logger.error(err);
      // Handle app-level errors
      if (err instanceof ApiError) {
         if (err.opts && err.opts["Retry-After"]) {
            ctx.set("Retry-After", err.opts["Retry-After"]);
         }
         ctx.status = err.status || 500;
         ctx.body = {
            message: `${err.status} - ${err.message} - ${ctx.request.path}`,
            userMessage: err.message,
            info: err.opts
         };
         // All other errors thrown via koa ctx.throw()
         // Important notice: due to bug in koa, if we use ctx.assert() it will require() different copy of httpErrors,
         // not thoose exported by koa,
         // so errors thrown by ctx.assert are not catched there despite the docs
      } else if (err instanceof HttpError) {
         ctx.status = err.status;
         // For koa-jwt we have originalError with information about auth error details
         const message = "originalError" in err ? err.message + ": " + err["originalError"].message : err.message;
         ctx.body = {
            message
         };
      } else if ("httpCode" in err) {
         // errors thrown by formidable is not normal, probably koa-body is here too
         ctx.status = err.httpCode;
         ctx.body = {
            message: err.message
         };
      } else if ("status" in err) {
         ctx.status = err.status;
         ctx.body = {
            message: err.message
         };
      } else {
         // Everything else is unexpected and should be converted to ApiError or HttpError
         ctx.status = 500;
         const config = container.resolve<AppConfig>("config");
         const debug = config.env !== 'production' ? {
            err,
            stack: err.stack,
            file: err.fileName
         } : {};
         ctx.body = {
            ...debug,
            message: "Internal Server Error"
         };
      }
   }
});
app.use(container.resolve("middleware.container") satisfies Middleware); // register request-scoped container
app.use(container.resolve("middleware.container.xff") satisfies Middleware); // register xff dependency in request-scoped container

app.use(container.resolve("middleware.compress") satisfies Middleware);
app.use(container.resolve("middleware.cors") satisfies Middleware);
app.use(container.resolve("middleware.helmet") satisfies Middleware);
app.use(container.resolve("middleware.bodyparser") satisfies Middleware);
app.use(container.resolve("middleware.xss") satisfies Middleware);
app.use(container.resolve("middleware.sslify") satisfies Middleware);
app.use(container.resolve("middleware.swagger") satisfies Middleware);
app.use(container.resolve("middleware.logger") satisfies Middleware);
app.use(container.resolve("middleware.pino") satisfies Middleware);
app.use(router.routes());
app.use(router.allowedMethods());
export default app;