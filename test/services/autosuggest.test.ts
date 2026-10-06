import assert from "assert";
import nock from "nock";
import { container } from "tsyringe";
import type { Context } from "koa";
import config from "../../src/config.js";
import { XFFProvider } from "../../src/lib/xffprovider.js";
import AutosuggestService, { mergeMlsNumberListings } from "../../src/services/autosuggest.js";
type ListingsBlock = Parameters<typeof mergeMlsNumberListings>[0];
const block = (count: number, mlsNumbers: string[]): ListingsBlock => ({
   count,
   listings: mlsNumbers.map(mlsNumber => ({
      mlsNumber
   }))
}) as ListingsBlock;
describe("autosuggest mergeMlsNumberListings", function () {
   it("returns the primary block untouched when the MLS leg is null or empty", function () {
      const primary = block(2, ["1", "2"]);
      assert.equal(mergeMlsNumberListings(primary, null, 5), primary);
      assert.equal(mergeMlsNumberListings(primary, block(0, []), 5), primary);
   });
   it("appends MLS matches after primary results, deduplicated by mlsNumber", function () {
      const merged = mergeMlsNumberListings(block(2, ["1", "2"]), block(2, ["2", "3"]), 5);
      assert.deepEqual(merged.listings.map(l => l.mlsNumber), ["1", "2", "3"]);
   });
   it("caps the merged page at resultsPerPage", function () {
      const merged = mergeMlsNumberListings(block(2, ["1", "2"]), block(2, ["3", "4"]), 3);
      assert.deepEqual(merged.listings.map(l => l.mlsNumber), ["1", "2", "3"]);
   });
   it("sums counts as an upper bound", function () {
      const merged = mergeMlsNumberListings(block(40, ["1"]), block(8, ["2"]), 5);
      assert.equal(merged.count, 48);
   });
});

// Guards a regression where the inner Repliers services were pulled from the root
// container, which carries the no-op DummyXFFProvider — the client IP was silently
// dropped even though the route had set enable.xff.
describe("autosuggest listings wiring", function () {
   const proxyXff = config.repliers.proxy_xff;
   const clientIp = "203.0.113.9";
   before(() => {
      config.repliers.proxy_xff = true;
   });
   after(() => {
      config.repliers.proxy_xff = proxyXff;
   });
   it("forwards the client IP on both Repliers legs of a search", async function () {
      const ctx = {
         get: (name: string) => name.toLowerCase() === "x-forwarded-for" ? clientIp : "",
         state: {
            "enable.xff": true
         }
      } as unknown as Context;
      const child = container.createChildContainer();
      child.register<XFFProvider>("XForwardedFor", {
         useFactory: () => new XFFProvider(ctx)
      });
      const service = child.resolve(AutosuggestService);
      nock(config.mapbox.base_url).get("/suggest").query(true).reply(200, {
         suggestions: [],
         attribution: ""
      });
      const listings = nock(config.repliers.base_url).matchHeader("x-repliers-forwarded-for", clientIp).post("/listings").query(true).reply(200, {
         listings: [],
         count: 0
      });
      const locations = nock(config.repliers.base_url).matchHeader("x-repliers-forwarded-for", clientIp).get("/locations/autocomplete").query(true).reply(200, {
         locations: []
      });
      await service.search({
         q: "king",
         lat: "43.65",
         long: "-79.38",
         resultsPerPage: 5
      } as Parameters<typeof service.search>[0]);
      listings.done();
      locations.done();
   });
});