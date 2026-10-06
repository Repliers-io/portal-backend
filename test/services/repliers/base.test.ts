import assert from "node:assert";
import nock from "nock";
import baseConfig from "../../../src/config.js";
import type { AppConfig } from "../../../src/config.js";
import type { XFFProvider } from "../../../src/lib/xffprovider.js";
import type { ThrottlerGenerator } from "../../../src/services/repliers/base.js";
import RepliersListings from "../../../src/services/repliers/listings.js";

// p-throttle replacement: run the request straight through, no rate limiting.
const passthroughThrottler = (function_ => function_) as ThrottlerGenerator;
function countingThrottler(): {
   throttler: ThrottlerGenerator;
   calls: () => number;
} {
   let calls = 0;
   const throttler = (function_ => (...arguments_: Parameters<typeof function_>) => {
      calls += 1;
      return function_(...arguments_);
   }) as ThrottlerGenerator;
   return {
      throttler,
      calls: () => calls
   };
}
function xffStub(ssg: boolean, header = ""): XFFProvider {
   return {
      isSsg: () => ssg,
      skipReason: () => header ? undefined : "no-client-ip",
      getHeader: () => header
   } as unknown as XFFProvider;
}
describe("RepliersBase API key selection", () => {
   const withWarmupKey = (cacheWarmupApiKey: string): AppConfig => ({
      ...baseConfig,
      repliers: {
         ...baseConfig.repliers,
         cache_warmup_api_key: cacheWarmupApiKey
      }
   });
   afterEach(() => {
      nock.cleanAll();
   });
   it("uses the cache warmup key for SSG requests when one is configured", async () => {
      const config = withWarmupKey("warmup-test-key");
      const scope = nock(config.repliers.base_url).matchHeader("REPLIERS-API-KEY", "warmup-test-key").get("/listings").query(true).reply(200, {
         listings: []
      });
      const listings = new RepliersListings(config, xffStub(true), passthroughThrottler, passthroughThrottler);
      await listings.search({});
      scope.done();
   });
   it("uses the default key for SSG requests when no warmup key is configured", async () => {
      const config = withWarmupKey("");
      const scope = nock(config.repliers.base_url).matchHeader("REPLIERS-API-KEY", config.repliers.api_key).get("/listings").query(true).reply(200, {
         listings: []
      });
      const listings = new RepliersListings(config, xffStub(true), passthroughThrottler, passthroughThrottler);
      await listings.search({});
      scope.done();
   });
   it("uses the default key for non-SSG requests even when a warmup key is configured", async () => {
      const config = withWarmupKey("warmup-test-key");
      const scope = nock(config.repliers.base_url).matchHeader("REPLIERS-API-KEY", config.repliers.api_key).get("/listings").query(true).reply(200, {
         listings: []
      });
      const listings = new RepliersListings(config, xffStub(false), passthroughThrottler, passthroughThrottler);
      await listings.search({});
      scope.done();
   });
   it("throttles SSG requests through the warmup throttler, not the default one", async () => {
      const config = withWarmupKey("warmup-test-key");
      nock(config.repliers.base_url).get("/listings").query(true).reply(200, {
         listings: []
      });
      const defaultThrottler = countingThrottler();
      const warmupThrottler = countingThrottler();
      const listings = new RepliersListings(config, xffStub(true), defaultThrottler.throttler, warmupThrottler.throttler);
      await listings.search({});
      assert.equal(warmupThrottler.calls(), 1);
      assert.equal(defaultThrottler.calls(), 0);
   });
   it("throttles SSG requests through the default throttler when no warmup key is configured", async () => {
      const config = withWarmupKey("");
      nock(config.repliers.base_url).get("/listings").query(true).reply(200, {
         listings: []
      });
      const defaultThrottler = countingThrottler();
      const warmupThrottler = countingThrottler();
      const listings = new RepliersListings(config, xffStub(true), defaultThrottler.throttler, warmupThrottler.throttler);
      await listings.search({});
      assert.equal(defaultThrottler.calls(), 1);
      assert.equal(warmupThrottler.calls(), 0);
   });
});
describe("RepliersBase forwarded-for header", () => {
   afterEach(() => {
      nock.cleanAll();
   });
   it("forwards the client IP when the provider is enabled", async () => {
      const scope = nock(baseConfig.repliers.base_url).matchHeader("x-repliers-forwarded-for", "203.0.113.9").get("/listings").query(true).reply(200, {
         listings: []
      });
      await new RepliersListings(baseConfig, xffStub(false, "203.0.113.9"), passthroughThrottler, passthroughThrottler).search({});
      scope.done();
   });
   it("omits the header when the provider is disabled", async () => {
      const scope = nock(baseConfig.repliers.base_url).matchHeader("x-repliers-forwarded-for", value => value === undefined).get("/listings").query(true).reply(200, {
         listings: []
      });
      await new RepliersListings(baseConfig, xffStub(false), passthroughThrottler, passthroughThrottler).search({});
      scope.done();
   });
});