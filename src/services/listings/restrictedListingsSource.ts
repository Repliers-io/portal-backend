import axios from "axios";
import pRetry, { type Options as RetryOptions } from "p-retry";
import type { Logger } from "pino";
import type { AppConfig } from "../../config.ts";
import { ApiError } from "../../lib/errors.ts";
import { listingsRestrictedSchema } from "../../validate/listings.ts";
type Source = AppConfig["restrictedListingsSource"];
type Retry = Pick<RetryOptions, "retries" | "minTimeout" | "factor" | "randomize">;
const defaultRetry: Retry = {
   retries: 5,
   minTimeout: 5000,
   factor: 2,
   randomize: true
};

// An AxiosError carries the request config — the password and the bearer token — into any log it reaches.
const sanitized = async <T,>(request: () => Promise<T>) => {
   try {
      return await request();
   } catch (err) {
      if (!axios.isAxiosError(err)) throw err;
      const reason = err.code === "ERR_CANCELED" ? "timed out" : err.message;
      throw new ApiError(`Restricted listings source: ${reason}`, 502, {
         status: String(err.response?.status ?? "")
      });
   }
};

// Exponential backoff: 5 retries wait 5s, 10s, 20s, 40s, 80s, each stretched by a random factor of 1 to 2.
// Rejected credentials or a rejected token will not get better with time.
const retried = <T,>(request: () => Promise<T>, retry: Retry) => pRetry(() => sanitized(request), {
   ...retry,
   shouldRetry: ({
      error
   }) => !(error instanceof ApiError && ["401", "403"].includes(String(error.opts?.["status"])))
});
const requestToken = async ({
   tokenUrl,
   email,
   password,
   timeoutMs
}: Source, retry: Retry) => {
   const {
      data
   } = await retried(() => axios.post<{
      token?: unknown;
   }>(tokenUrl, {
      email,
      password
   }, {
      signal: AbortSignal.timeout(timeoutMs)
   }), retry);
   if (typeof data?.token !== "string" || !data.token) throw new ApiError("Restricted listings source issued no token", 502);
   return data.token;
};
export const fetchRestrictedListings = async (source: Source, retry = defaultRetry): Promise<string[]> => {
   const headers = source.tokenUrl ? {
      Authorization: `Bearer ${await requestToken(source, retry)}`
   } : {};
   const {
      data
   } = await retried(() => axios.get<unknown>(source.url, {
      headers,
      signal: AbortSignal.timeout(source.timeoutMs)
   }), retry);
   const {
      value,
      error
   } = listingsRestrictedSchema.validate(data);
   if (error) throw new ApiError("Restricted listings source answered an invalid list", 502, {
      reason: error.message
   });
   return [...new Set(value.listings.map(({
      mlsNumber
   }) => mlsNumber))];
};
export const diffRestrictedListings = (before: readonly string[], after: readonly string[]) => ({
   added: after.filter(mlsNumber => !before.includes(mlsNumber)),
   removed: before.filter(mlsNumber => !after.includes(mlsNumber))
});

/**
 * Swaps the fetched list into the running config — the one runtime write to settings. Every
 * consumer reads `settings.restrictedListings` per call, so assignment is enough. Never rejects:
 * on failure the preset's snapshot keeps serving.
 */
export const refreshRestrictedListings = async (config: AppConfig, logger: Logger, retry = defaultRetry): Promise<void> => {
   if (!config.restrictedListingsSource.url) return;
   try {
      const list = await fetchRestrictedListings(config.restrictedListingsSource, retry);
      const {
         added,
         removed
      } = diffRestrictedListings(config.settings.restrictedListings, list);
      config.settings.restrictedListings = list;
      logger.info({
         total: list.length,
         added,
         removed
      }, "Restricted listings refreshed from source");
   } catch (err) {
      logger.warn({
         err
      }, "Restricted listings source failed, keeping the preset list");
   }
};