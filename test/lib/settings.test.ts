import assert from "assert";
import { container } from "tsyringe";
import type { AppConfig } from "../../src/config.js";
import Settings from "../../src/lib/settings.js";
describe("Settings", function () {
   let baseConfig: AppConfig;
   beforeEach(() => {
      baseConfig = structuredClone(container.resolve<AppConfig>("config"));
   });
   describe("constructUrl (via merge)", function () {
      beforeEach(() => {
         // Ensure all URLs are relative so the scheme-in-path check doesn't trigger
         baseConfig.eventsCollection.clientUrl = "/agent/client/[CLIENT_ID]";
         baseConfig.eventsCollection.estimateUrl = "/estimate/[ESTIMATE_ID]";
      });
      it("joins host and path with single slash", function () {
         baseConfig.eventsCollection.urlHost = "https://example.tld";
         baseConfig.eventsCollection.propertyUrl = "/listing/[MLS_NUMBER]";
         const settings = new Settings();
         const result = settings.merge(baseConfig);
         assert.equal(result.eventsCollection.propertyUrl, "https://example.tld/listing/[MLS_NUMBER]");
      });
      it("strips trailing slashes from host", function () {
         baseConfig.eventsCollection.urlHost = "https://example.tld///";
         baseConfig.eventsCollection.propertyUrl = "/listing/[MLS_NUMBER]";
         const settings = new Settings();
         const result = settings.merge(baseConfig);
         assert.equal(result.eventsCollection.propertyUrl, "https://example.tld/listing/[MLS_NUMBER]");
      });
      it("strips leading slashes from path", function () {
         baseConfig.eventsCollection.urlHost = "https://example.tld";
         baseConfig.eventsCollection.propertyUrl = "///listing/[MLS_NUMBER]";
         const settings = new Settings();
         const result = settings.merge(baseConfig);
         assert.equal(result.eventsCollection.propertyUrl, "https://example.tld/listing/[MLS_NUMBER]");
      });
      it("handles both trailing and leading slashes", function () {
         baseConfig.eventsCollection.urlHost = "https://example.tld//";
         baseConfig.eventsCollection.propertyUrl = "//listing/[MLS_NUMBER]";
         const settings = new Settings();
         const result = settings.merge(baseConfig);
         assert.equal(result.eventsCollection.propertyUrl, "https://example.tld/listing/[MLS_NUMBER]");
      });
   });
   describe("constructEventsCollectionUrls (via merge)", function () {
      it("prepends urlHost to all eventsCollection URLs when urlHost is set", function () {
         baseConfig.eventsCollection.urlHost = "https://portal.tld";
         baseConfig.eventsCollection.propertyUrl = "/listing/[MLS_NUMBER]?boardId=[BOARD_ID]";
         baseConfig.eventsCollection.clientUrl = "/agent/client/[CLIENT_ID]";
         baseConfig.eventsCollection.estimateUrl = "/estimate/[ESTIMATE_ID]";
         baseConfig.eventsCollection.savedSearchUrl = "/search/[SEARCH_ID]";
         const settings = new Settings();
         const result = settings.merge(baseConfig);
         assert.equal(result.eventsCollection.propertyUrl, "https://portal.tld/listing/[MLS_NUMBER]?boardId=[BOARD_ID]");
         assert.equal(result.eventsCollection.clientUrl, "https://portal.tld/agent/client/[CLIENT_ID]");
         assert.equal(result.eventsCollection.estimateUrl, "https://portal.tld/estimate/[ESTIMATE_ID]");
         assert.equal(result.eventsCollection.savedSearchUrl, "https://portal.tld/search/[SEARCH_ID]");
      });
      it("throws when URLs are relative but urlHost is not set", function () {
         baseConfig.eventsCollection.urlHost = undefined;
         baseConfig.eventsCollection.propertyUrl = "/listing/[MLS_NUMBER]";
         baseConfig.eventsCollection.clientUrl = "/agent/client/[CLIENT_ID]";
         baseConfig.eventsCollection.estimateUrl = "/estimate/[ESTIMATE_ID]";
         const settings = new Settings();
         assert.throws(() => settings.merge(baseConfig), {
            message: "[SETTINGS] eventsCollection URLs are relative but SETTINGS_EVENTS_COLLECTOR_URL_HOST is not set"
         });
      });
      it("does not throw when URLs are absolute and urlHost is not set", function () {
         baseConfig.eventsCollection.urlHost = undefined;
         baseConfig.eventsCollection.propertyUrl = "https://example.tld/listing/[MLS_NUMBER]";
         baseConfig.eventsCollection.clientUrl = "https://example.tld/agent/client/[CLIENT_ID]";
         baseConfig.eventsCollection.estimateUrl = "https://example.tld/estimate/[ESTIMATE_ID]";
         const settings = new Settings();
         const result = settings.merge(baseConfig);
         assert.equal(result.eventsCollection.propertyUrl, "https://example.tld/listing/[MLS_NUMBER]");
         assert.equal(result.eventsCollection.clientUrl, "https://example.tld/agent/client/[CLIENT_ID]");
         assert.equal(result.eventsCollection.estimateUrl, "https://example.tld/estimate/[ESTIMATE_ID]");
      });
      it("throws when URL paths contain a scheme and urlHost is also set", function () {
         baseConfig.eventsCollection.urlHost = "https://portal.tld";
         baseConfig.eventsCollection.propertyUrl = "/listing/[MLS_NUMBER]";
         baseConfig.eventsCollection.clientUrl = "http://localhost:3000/agent/client/[CLIENT_ID]";
         baseConfig.eventsCollection.estimateUrl = "/estimate/[ESTIMATE_ID]";
         const settings = new Settings();
         assert.throws(() => settings.merge(baseConfig), /eventsCollection URL conflict/);
      });
      it("does not modify savedSearchUrl when it is empty", function () {
         baseConfig.eventsCollection.urlHost = "https://portal.tld";
         baseConfig.eventsCollection.propertyUrl = "/listing/[MLS_NUMBER]";
         baseConfig.eventsCollection.clientUrl = "/agent/client/[CLIENT_ID]";
         baseConfig.eventsCollection.estimateUrl = "/estimate/[ESTIMATE_ID]";
         baseConfig.eventsCollection.savedSearchUrl = "";
         const settings = new Settings();
         const result = settings.merge(baseConfig);
         assert.equal(result.eventsCollection.savedSearchUrl, "");
      });
      it("does not modify savedSearchUrl when it is undefined", function () {
         baseConfig.eventsCollection.urlHost = "https://portal.tld";
         baseConfig.eventsCollection.propertyUrl = "/listing/[MLS_NUMBER]";
         baseConfig.eventsCollection.clientUrl = "/agent/client/[CLIENT_ID]";
         baseConfig.eventsCollection.estimateUrl = "/estimate/[ESTIMATE_ID]";
         baseConfig.eventsCollection.savedSearchUrl = undefined;
         const settings = new Settings();
         const result = settings.merge(baseConfig);
         assert.equal(result.eventsCollection.savedSearchUrl, undefined);
      });
      it("always modifies propertyUrl, clientUrl, estimateUrl when urlHost is set", function () {
         baseConfig.eventsCollection.urlHost = "https://portal.tld";
         baseConfig.eventsCollection.propertyUrl = "relative/path";
         baseConfig.eventsCollection.clientUrl = "another/path";
         baseConfig.eventsCollection.estimateUrl = "estimate/path";
         baseConfig.eventsCollection.savedSearchUrl = "";
         const settings = new Settings();
         const result = settings.merge(baseConfig);
         assert.equal(result.eventsCollection.propertyUrl, "https://portal.tld/relative/path");
         assert.equal(result.eventsCollection.clientUrl, "https://portal.tld/another/path");
         assert.equal(result.eventsCollection.estimateUrl, "https://portal.tld/estimate/path");
         assert.equal(result.eventsCollection.savedSearchUrl, "");
      });
   });
   describe("array overrides via merge", function () {
      beforeEach(() => {
         baseConfig.eventsCollection.urlHost = "https://example.tld";
      });
      it("preset safeFields fully overrides base safeFields (no leak from trailing base items)", function () {
         const settings = new Settings("test_fixture");
         const result = settings.merge(baseConfig);
         assert.ok(!result.settings.scrubbing.safeFields.includes("images"), `safeFields should not contain "images"; got ${JSON.stringify(result.settings.scrubbing.safeFields)}`);
         assert.deepEqual(result.settings.scrubbing.safeFields, ["address", "class", "map", "propertyType", "type", "mlsNumber", "permissions", "status", "boardId", "listDate", "imageInsights", "duplicates", "resource"]);
      });
      it("preset dropFields fully overrides base dropFields (longer preset array)", function () {
         const settings = new Settings("test_fixture");
         const result = settings.merge(baseConfig);
         assert.deepEqual(result.settings.scrubbing.dropFields, ["history", "agents", "raw", "images"]);
      });
      it("arrays not declared in preset retain base defaults", function () {
         const settings = new Settings("test_fixture");
         const result = settings.merge(baseConfig);
         assert.ok(Array.isArray(result.settings.scrubbing.safeAddressFields));
         assert.ok(result.settings.scrubbing.safeAddressFields.length > 0);
      });
   });
});