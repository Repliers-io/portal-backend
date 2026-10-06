import assert from "assert";
import { container } from "tsyringe";
import SelectSaveSearchParams from "../../../../src/services/eventsCollection/selectors/selectSaveSearchParams.js";
import RepliersService from "../../../../src/services/repliers.js";
import RepliersAgents from "../../../../src/services/repliers/agents.js";
import BossService from "../../../../src/services/boss.js";
import type { AppConfig } from "../../../../src/config.js";
import { DummyXFFProvider } from "../../../../src/providers/dummy.xff.js";
import type { Context } from "koa";
const validBody = {
   type: "Sale",
   class: ["residential"],
   minPrice: 500000,
   maxPrice: 1000000,
   cities: ["Toronto"]
};
const makeCtx = (body: Record<string, unknown> = {}, responseBody: unknown = null): Context => ({
   request: {
      body,
      headers: {
         referer: "https://example.com"
      }
   },
   response: {
      body: responseBody
   },
   body: responseBody,
   state: {
      user: {
         sub: 42,
         email: "jane@example.com"
      }
   }
}) as unknown as Context;
describe("SelectSaveSearchParams", function () {
   let selector: SelectSaveSearchParams;
   let config: AppConfig;
   before(() => {
      container.register("XForwardedFor", {
         useFactory: () => new DummyXFFProvider()
      });
      config = container.resolve<AppConfig>("config");
      selector = new SelectSaveSearchParams(container.resolve(RepliersService), container.resolve(RepliersAgents), container.resolve(BossService), config);
   });
   describe("select", function () {
      it("returns null when validation fails (missing required fields)", async function () {
         const ctx = makeCtx({});
         const result = await selector.select(ctx);
         assert.equal(result, null);
      });
      it("returns Saved Property Search type for valid body", async function () {
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.type, "Saved Property Search");
      });
      it("maps search criteria via mapRplPropertySearchToBoss", async function () {
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.propertySearch?.minPrice, 500000);
         assert.equal(result.propertySearch?.maxPrice, 1000000);
         assert.equal(result.propertySearch?.city, "Toronto");
      });
      it("sets pageUrl from defaults.pageReferrer", async function () {
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.pageUrl, "https://example.com");
      });
      it("includes search URL in description when response has searchId", async function () {
         const original = config.eventsCollection.savedSearchUrl;
         config.eventsCollection.savedSearchUrl = "https://example.tld/search/[SEARCH_ID]";
         const ctx = makeCtx(validBody, {
            searchId: 123
         });
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.description, "Saved search url: https://example.tld/search/123");
         config.eventsCollection.savedSearchUrl = original;
      });
      it("sets description to undefined when no search URL config", async function () {
         const original = config.eventsCollection.savedSearchUrl;
         config.eventsCollection.savedSearchUrl = "";
         const ctx = makeCtx(validBody, {
            searchId: 123
         });
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.description, undefined);
         config.eventsCollection.savedSearchUrl = original;
      });
      it("sets occurredAt to current time", async function () {
         const before = new Date().toISOString();
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         const after = new Date().toISOString();
         assert.ok(result);
         assert.ok(result.occurredAt! >= before);
         assert.ok(result.occurredAt! <= after);
      });
   });
   describe("isSearchModel", function () {
      it("returns true for object with searchId", function () {
         assert.equal(selector.isSearchModel({
            searchId: 123
         }), true);
      });
      it("returns false for object without searchId", function () {
         assert.equal(selector.isSearchModel({
            other: 1
         }), false);
      });
      it("returns false for null", function () {
         assert.equal(selector.isSearchModel(null), false);
      });
      it("returns false for non-object", function () {
         assert.equal(selector.isSearchModel("string"), false);
      });
   });
   describe("getSaveSearchUrl", function () {
      it("builds URL from config template when response has searchId", function () {
         const original = config.eventsCollection.savedSearchUrl;
         config.eventsCollection.savedSearchUrl = "https://example.tld/search/[SEARCH_ID]";
         const result = selector.getSaveSearchUrl({
            searchId: 456
         });
         assert.equal(result, "https://example.tld/search/456");
         config.eventsCollection.savedSearchUrl = original;
      });
      it("returns null when savedSearchUrl config is empty", function () {
         const original = config.eventsCollection.savedSearchUrl;
         config.eventsCollection.savedSearchUrl = "";
         const result = selector.getSaveSearchUrl({
            searchId: 456
         });
         assert.equal(result, null);
         config.eventsCollection.savedSearchUrl = original;
      });
      it("returns null when body is not a search model", function () {
         const original = config.eventsCollection.savedSearchUrl;
         config.eventsCollection.savedSearchUrl = "https://example.tld/search/[SEARCH_ID]";
         assert.equal(selector.getSaveSearchUrl({}), null);
         config.eventsCollection.savedSearchUrl = original;
      });
   });
});