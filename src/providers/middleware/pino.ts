import { AsyncLocalStorage } from "async_hooks";
import { ServerResponse } from "http";
import { IncomingMessage } from "http";
import pinoMiddleware from "koa-pino-logger";
import { instanceCachingFactory } from "tsyringe";
import { IAsyncLocalStore } from "./logger.js";
export default {
   token: "middleware.pino",
   useFactory: instanceCachingFactory(container => {
      return pinoMiddleware({
         // note here, we can't use just "logger" (which is child logger) as it created only on request.
         // However pinoMiddleware can use only static logger instance, and can't resolve it on each request
         logger: container.resolve("logger.global"),
         customReceivedMessage: (req: IncomingMessage) => {
            return `Request: ${req.method} ${req.url}`;
         },
         customSuccessMessage: (_req: IncomingMessage, res: ServerResponse<IncomingMessage>, responseTime: number) => {
            return `Response: ${res.statusCode} ${responseTime}ms ${res.req.method} ${res.req.url}`;
         },
         customProps: () => {
            const asyncLocalStore = container.resolve<AsyncLocalStorage<IAsyncLocalStore>>('async_local_store');
            const localStore = asyncLocalStore.getStore();
            if (!localStore) {
               return {};
            }
            return {
               correlationId: localStore.correlationId
            };
         }
      });
   })
};