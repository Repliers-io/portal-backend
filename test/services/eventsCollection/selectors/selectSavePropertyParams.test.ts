import assert from "assert";
import { container } from "tsyringe";
import SelectSavePropertyParams from "../../../../src/services/eventsCollection/selectors/selectSavePropertyParams.js";
import RepliersService from "../../../../src/services/repliers.js";
import RepliersAgents from "../../../../src/services/repliers/agents.js";
import BossService from "../../../../src/services/boss.js";
import type { AppConfig } from "../../../../src/config.js";
import { DummyXFFProvider } from "../../../../src/providers/dummy.xff.js";
import type { Context } from "koa";
const listingFixture = {
   mlsNumber: "W1234567",
   listPrice: "750000",
   type: "Sale",
   address: {
      streetNumber: "100",
      streetName: "QUEEN STREET",
      streetSuffix: "W",
      unitNumber: "",
      city: "Toronto",
      state: "Ontario",
      zip: "M5H 2N2"
   },
   details: {
      numBedrooms: "3",
      numBathrooms: "2"
   }
};
const makeCtx = (body: Record<string, unknown> = {}, overrides: Record<string, unknown> = {}): Context => ({
   request: {
      body,
      headers: {
         referer: "https://example.com"
      }
   },
   state: {
      user: {
         sub: 42,
         email: "jane@example.com"
      }
   },
   ...overrides
}) as unknown as Context;
describe("SelectSavePropertyParams", function () {
   let selector: SelectSavePropertyParams;
   let config: AppConfig;
   let repliersService: RepliersService;
   let originalListingsSingle: RepliersService["listings"]["single"];
   before(() => {
      container.register("XForwardedFor", {
         useFactory: () => new DummyXFFProvider()
      });
      repliersService = container.resolve(RepliersService);
      config = container.resolve<AppConfig>("config");
      originalListingsSingle = repliersService.listings.single.bind(repliersService.listings);
      repliersService.listings.single = async () => listingFixture as never;
      selector = new SelectSavePropertyParams(repliersService, container.resolve(RepliersAgents), container.resolve(BossService), config);
   });
   after(() => {
      repliersService.listings.single = originalListingsSingle;
   });
   describe("select", function () {
      it("returns null when validation fails (missing mlsNumber)", async function () {
         const ctx = makeCtx({});
         const result = await selector.select(ctx);
         assert.equal(result, null);
      });
      it("returns Saved Property type for valid body", async function () {
         const ctx = makeCtx({
            mlsNumber: "W1234567",
            boardId: 2
         });
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.type, "Saved Property");
      });
      it("builds pageUrl from mlsNumber and boardId", async function () {
         const original = config.eventsCollection.propertyUrl;
         config.eventsCollection.propertyUrl = "https://example.tld/listing/[MLS_NUMBER]?boardId=[BOARD_ID]";
         const ctx = makeCtx({
            mlsNumber: "W1234567",
            boardId: 2
         });
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.pageUrl, "https://example.tld/listing/W1234567?boardId=2");
         config.eventsCollection.propertyUrl = original;
      });
      it("falls back pageReferrer to pageUrl when no referer", async function () {
         const original = config.eventsCollection.propertyUrl;
         config.eventsCollection.propertyUrl = "https://example.tld/listing/[MLS_NUMBER]?boardId=[BOARD_ID]";
         const ctx = makeCtx({
            mlsNumber: "W1234567",
            boardId: 2
         }, {
            request: {
               body: {
                  mlsNumber: "W1234567",
                  boardId: 2
               },
               headers: {}
            }
         });
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.pageReferrer, "https://example.tld/listing/W1234567?boardId=2");
         config.eventsCollection.propertyUrl = original;
      });
      it("includes property data from getProperty", async function () {
         const ctx = makeCtx({
            mlsNumber: "W1234567",
            boardId: 2
         });
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.property?.mlsNumber, "W1234567");
         assert.equal(result.property?.city, "Toronto");
      });
      it("sets occurredAt to current time", async function () {
         const before = new Date().toISOString();
         const ctx = makeCtx({
            mlsNumber: "W1234567",
            boardId: 2
         });
         const result = await selector.select(ctx);
         const after = new Date().toISOString();
         assert.ok(result);
         assert.ok(result.occurredAt! >= before);
         assert.ok(result.occurredAt! <= after);
      });
   });
});