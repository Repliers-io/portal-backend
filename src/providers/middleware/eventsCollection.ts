import { instanceCachingFactory } from "tsyringe";
import { Middleware } from "koa";
import type { Logger } from "pino";
import EventsCollectionService, { type NotesCollectionPropertiesSelector, type EventsCollectionPropertiesSelector } from "../../services/eventsCollection/eventsCollection.js";
import emptyMiddleware from "../../lib/middleware/empty.js";
import { type AppConfig } from "../../config.js";
import _debug from "debug";
const debug = _debug("repliers:middleware:eventsCollections");
type EventsCollectionMiddlewareOptions = {
   allowIncognito: boolean;
};
export interface EventsCollectionMiddlewareFactoryProps {
   selector: EventsCollectionPropertiesSelector;
   notesSelector?: NotesCollectionPropertiesSelector;
   options?: EventsCollectionMiddlewareOptions;
}
export type EventsCollectionMiddleware = (props: EventsCollectionMiddlewareFactoryProps) => Middleware;
export default {
   token: "middleware.eventsCollection",
   useFactory: instanceCachingFactory(container => {
      const config = container.resolve<AppConfig>("config");
      const middlewareFactory: EventsCollectionMiddleware = ({
         selector,
         notesSelector,
         options: {
            allowIncognito
         } = {}
      }) => {
         return (ctx, next) => {
            const eventsCollectionService = ctx.state.container.resolve(EventsCollectionService);
            if (allowIncognito || ctx.state['user']) {
               debug("EventsCollectionMiddleware ctx: %O", ctx);
               // Fire-and-forget: an unhandled rejection here takes the whole process down.
               const logger = ctx.state.container.resolve<Logger>("logger");
               const report = (err: unknown) => logger.error(err, "Events collection failed");
               selector(ctx).then(props => props && eventsCollectionService.eventsCreate(props)).catch(report);
               notesSelector?.(ctx).then(props => props && eventsCollectionService.noteCreate(props)).catch(report);
            }
            next();
         };
      };
      return config.boss.enabled === false ? () => emptyMiddleware : middlewareFactory;
   })
};