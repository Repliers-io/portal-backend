import { DependencyContainer, instanceCachingFactory } from "tsyringe";
import Keyv from "keyv";
import { type AppConfig } from "../config.js";
import KeyvRedis from "@keyv/redis";
export default {
   token: "keyv.otp",
   useFactory: instanceCachingFactory((c: DependencyContainer) => {
      const config = c.resolve<AppConfig>("config");
      const namespace = "otp";
      const options = config.redis.keyv_enable ? {
         store: new KeyvRedis(config.redis.url),
         namespace
      } : {
         namespace
      };
      return new Keyv(options);
   })
};