import assert from "assert";
import { container } from "tsyringe";
import SelectViewPropertyParams from "../../../../src/services/eventsCollection/selectors/selectViewPropertyParams.js";
import RepliersService from "../../../../src/services/repliers.js";
import RepliersAgents from "../../../../src/services/repliers/agents.js";
import BossService from "../../../../src/services/boss.js";
import type { AppConfig } from "../../../../src/config.js";
import { DummyXFFProvider } from "../../../../src/providers/dummy.xff.js";
import type { Context } from "koa";
const propertyFixture = {
   mlsNumber: "W1234567",
   boardId: 2,
   listPrice: "750000",
   type: "Sale",
   address: {
      streetNumber: "100",
      streetName: "QUEEN STREET",
      streetSuffix: "W",
      unitNumber: "2501",
      city: "Toronto",
      state: "Ontario",
      zip: "M5H 2N2"
   },
   details: {
      numBedrooms: "3",
      numBathrooms: "2"
   }
};
const makeCtx = (property: Record<string, unknown>, referer?: string): Context => ({
   request: {
      body: {},
      headers: referer ? {
         referer
      } : {}
   },
   response: {
      body: property
   },
   body: property,
   state: {
      user: {
         sub: "42",
         email: "jane@example.com"
      }
   }
}) as unknown as Context;
describe("SelectViewPropertyParams", function () {
   let selector: SelectViewPropertyParams;
   let config: AppConfig;
   before(() => {
      container.register("XForwardedFor", {
         useFactory: () => new DummyXFFProvider()
      });
      config = container.resolve<AppConfig>("config");
      selector = new SelectViewPropertyParams(container.resolve(RepliersService), container.resolve(RepliersAgents), container.resolve(BossService), config);
   });
   describe("select", function () {
      it("returns Viewed Property type", async function () {
         const ctx = makeCtx(propertyFixture, "https://example.com");
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.type, "Viewed Property");
      });
      it("builds pageUrl from property mlsNumber and boardId", async function () {
         const original = config.eventsCollection.propertyUrl;
         config.eventsCollection.propertyUrl = "https://example.tld/listing/[MLS_NUMBER]?boardId=[BOARD_ID]";
         const ctx = makeCtx(propertyFixture, "https://example.com");
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.pageUrl, "https://example.tld/listing/W1234567?boardId=2");
         config.eventsCollection.propertyUrl = original;
      });
      it("maps property via mapRplPropertyToBoss", async function () {
         const ctx = makeCtx(propertyFixture, "https://example.com");
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.property?.mlsNumber, "W1234567");
         assert.equal(result.property?.city, "Toronto");
         assert.equal(result.property?.street, "#2501 - 100 Queen Street W");
         assert.equal(result.property?.price, 750000);
         assert.equal(result.property?.forRent, false);
      });
      it("sets pageReferrer from ctx referer header", async function () {
         const ctx = makeCtx(propertyFixture, "https://example.com");
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.pageReferrer, "https://example.com");
      });
      it("falls back pageReferrer to pageUrl when no referer", async function () {
         const original = config.eventsCollection.propertyUrl;
         config.eventsCollection.propertyUrl = "https://example.tld/listing/[MLS_NUMBER]?boardId=[BOARD_ID]";
         const ctx = makeCtx(propertyFixture);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.pageReferrer, "https://example.tld/listing/W1234567?boardId=2");
         config.eventsCollection.propertyUrl = original;
      });
      it("sets occurredAt to current time", async function () {
         const before = new Date().toISOString();
         const ctx = makeCtx(propertyFixture, "https://example.com");
         const result = await selector.select(ctx);
         const after = new Date().toISOString();
         assert.ok(result);
         assert.ok(result.occurredAt! >= before);
         assert.ok(result.occurredAt! <= after);
      });
   });
});