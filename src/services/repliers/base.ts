import axios, { AxiosRequestConfig } from "axios";
import type { AppConfig } from "../../config.js";
import { container, inject, injectable } from "tsyringe";
import type { Logger } from "pino";
import { ApiError } from "../../lib/errors.js";
import _debug from "debug";
import { XFFProvider } from "../../lib/xffprovider.js";
import { type ThrottledFunction } from "p-throttle";
const debug = _debug("repliers:services:repliers");
export type ApiMethod = "POST" | "GET" | "PATCH" | "DELETE";
export type ThrottlerGenerator = <F extends typeof axios.request>(function_: F) => ThrottledFunction<F>;

// Probably we have to move this to types/repliers.ts later
export interface ApiRequest extends Record<string, unknown> {}
export interface ApiResponse extends Record<string, unknown> {}
export interface ApiBody extends Record<string, unknown> {}
export interface PagedApiResponse extends ApiResponse {
   page: number;
   numPages: number;
   pageSize: number;
   count: number;
}
@injectable()
export default class RepliersBase {
   private throttledRequest;
   constructor(@inject("config")
   protected config: AppConfig, @inject("XForwardedFor")
   private xff: XFFProvider, @inject("throttler:repliers")
   private throttler: ThrottlerGenerator, @inject("throttler:repliers:warmup")
   private warmupThrottler: ThrottlerGenerator) {
      const axiosInstance = this.createAxios(this.resolveApiKey());
      this.throttledRequest = this.activeThrottler()(axiosInstance.request);
   }

   // SSG build traffic keeps using the warmup throttler even after switchKey() (e.g. estimate's
   // historical_data_key), so it never queues behind live users on the local rate limiter.
   private activeThrottler(): ThrottlerGenerator {
      return this.xff.isSsg() && this.config.repliers.cache_warmup_api_key ? this.warmupThrottler : this.throttler;
   }
   private resolveApiKey(): string {
      const {
         api_key,
         cache_warmup_api_key
      } = this.config.repliers;
      if (this.xff.isSsg() && cache_warmup_api_key) {
         debug("Using cache warmup API key for SSG traffic");
         return cache_warmup_api_key;
      }
      debug("Using standard API key");
      return api_key;
   }
   createAxios(key: string) {
      const axiosInstance = axios.create({
         baseURL: this.config.repliers.base_url,
         timeout: this.config.repliers.timeout_ms,
         headers: {
            "REPLIERS-API-KEY": key,
            "Content-Type": "application/json"
         },
         paramsSerializer: {
            indexes: null
         }
      });
      return axiosInstance;
   }

   // we can call throttler(axiosInstance.request) inside switchKey method
   // but this will require adding typings for private throttledRequest which is currently inferred perfectly
   // So this is just lazy way to avoid adding typings
   switchKey(key: string) {
      const axiosInstance = this.createAxios(key);
      this.throttledRequest = this.activeThrottler()(axiosInstance.request);
   }
   protected async request<Response>(method: ApiMethod, url: string, query?: ApiRequest, body?: ApiBody): Promise<Response> {
      const options: AxiosRequestConfig = {
         method,
         url,
         params: query,
         data: body
      };

      // And finally
      const skipped = this.xff.skipReason();
      options.headers = skipped ? {} : {
         "x-repliers-forwarded-for": this.xff.getHeader()
      };
      if (skipped) {
         container.resolve<Logger>("logger").info({
            url,
            reason: skipped
         }, "Repliers call without x-repliers-forwarded-for");
      }
      debug(options);
      return this.throttledRequest(options).then(axiosResponse => {
         debug("HTTP response", {
            status: axiosResponse.status,
            dataPreview: JSON.stringify(axiosResponse.data)?.slice(0, 1500) // log only first 1500 chars
         });
         return axiosResponse.data;
      }).catch(e => {
         debug(e.response);
         throw new ApiError(`Repliers API error: ${e.response?.status}`, e.response?.status, e.response?.data);
      });
   }
}