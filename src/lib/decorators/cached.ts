import _debug from "debug";
import Keyv from "keyv";
import dayjs from "dayjs";
import { container } from "tsyringe";
import { AppConfig } from "../../config.js";
import KeyvRedis from "@keyv/redis";
import type { Context } from "koa";
const debug = _debug("repliers:lib:decorators/cached");
class CacheFactory {
   private static instances = new Map<string, Keyv>();
   static createCache(namespace: string) {
      const existing = CacheFactory.instances.get(namespace);
      if (existing) {
         return existing;
      }
      const config = container.resolve<AppConfig>("config");
      const options = config.redis.keyv_enable ? {
         store: new KeyvRedis(config.redis.url),
         namespace
      } : {
         namespace
      };
      const cache = new Keyv(options);
      CacheFactory.instances.set(namespace, cache);
      return cache;
   }
}
export const getCacheStore = (namespace: string): Keyv => {
   return CacheFactory.createCache(namespace);
};
export const cacheKey = (...args: unknown[]): string => {
   return JSON.stringify(args);
};
export interface Cached<T> {
   expires: number;
   result: T;
}
export interface KeyvCachedItem {
   data: any;
   created: number;
}

/**
 * Writes a service result to the response. When the value comes from a
 * `@cached` method ({@link Cached}), it unwraps `result` and sets a
 * `Cache-Control` header; otherwise the value is sent as-is.
 */
export function sendCached<T>(ctx: Context, data: T | Cached<T>): void {
   if (data && typeof data === "object" && "expires" in data) {
      ctx.set("Cache-Control", `private, max-age=${(data as Cached<T>).expires}`);
      ctx.body = (data as Cached<T>).result;
   } else {
      ctx.body = data;
   }
}
export default (namespace: string, ttl_ms: number) => {
   const cache = CacheFactory.createCache(namespace);
   return (_target: object, method: string, propertyDescriptor: PropertyDescriptor): PropertyDescriptor => {
      return {
         get() {
            const wrapperFn = async (...args: any[]): Promise<Cached<unknown>> => {
               const key = JSON.stringify(args);
               const cached = await cache.get<KeyvCachedItem>(key);
               if (cached) {
                  return {
                     result: cached.data,
                     expires: ttl_ms / 1000 - dayjs().diff(dayjs.unix(cached.created), "s")
                  };
               }
               const result = await propertyDescriptor.value.apply(this, args);
               debug("NS: %s, ttl: %s", namespace, ttl_ms);
               cache.set(key, {
                  data: result,
                  created: dayjs().unix()
               }, ttl_ms);
               return {
                  result,
                  expires: ttl_ms / 1000
               };
            };
            Object.defineProperty(this, method, {
               value: wrapperFn,
               configurable: true,
               writable: false
            });
            return wrapperFn;
         }
      };
   };
};