import { DependencyContainer, instanceCachingFactory } from "tsyringe";
import { AppConfig } from "../../config.js";
import pThrottle from "p-throttle";
export default {
   token: "throttler:repliers",
   useFactory: instanceCachingFactory((container: DependencyContainer) => {
      const config = container.resolve<AppConfig>("config");
      const onDelay = container.resolve<(...arguments_: readonly any[]) => void>("throttler:ondelay");
      return pThrottle({
         limit: config.repliers.limit,
         interval: config.repliers.interval,
         onDelay
      });
   })
};