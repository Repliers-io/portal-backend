import { DependencyContainer, instanceCachingFactory } from "tsyringe";
import { AppConfig } from "../../config.js";
import pThrottle from "p-throttle";
export default {
   token: "throttler:repliers:warmup",
   useFactory: instanceCachingFactory((container: DependencyContainer) => {
      const config = container.resolve<AppConfig>("config");
      const onDelay = container.resolve<(...arguments_: readonly any[]) => void>("throttler:ondelay");
      return pThrottle({
         limit: config.repliers.cache_warmup_limit,
         interval: config.repliers.cache_warmup_interval,
         onDelay
      });
   })
};