import assert from "assert";
import { container } from "tsyringe";
import SelectEstimateParams from "../../../../src/services/eventsCollection/selectors/selectEstimateParams.js";
import RepliersService from "../../../../src/services/repliers.js";
import RepliersAgents from "../../../../src/services/repliers/agents.js";
import BossService from "../../../../src/services/boss.js";
import type { AppConfig } from "../../../../src/config.js";
import { DummyXFFProvider } from "../../../../src/providers/dummy.xff.js";
import type { Context } from "koa";
const validBody = {
   boardId: 2,
   address: {
      city: "Toronto",
      streetName: "Queen",
      streetNumber: "100",
      streetSuffix: "St",
      zip: "M5H 2N2"
   },
   details: {
      numBedrooms: 3,
      numBathrooms: 2,
      propertyType: "Detached",
      sqft: 2000,
      style: "2-Storey"
   }
};
const makeCtx = (body: Record<string, unknown> = {}, overrides: Record<string, unknown> = {}): Context => ({
   request: {
      body,
      headers: {
         referer: "https://example.com"
      }
   },
   response: {
      body: null
   },
   state: {
      user: {
         sub: "42",
         email: "jane@example.com"
      }
   },
   ...overrides
}) as unknown as Context;
describe("SelectEstimateParams", function () {
   let selector: SelectEstimateParams;
   let config: AppConfig;
   before(() => {
      container.register("XForwardedFor", {
         useFactory: () => new DummyXFFProvider()
      });
      config = container.resolve<AppConfig>("config");
      selector = new SelectEstimateParams(container.resolve(RepliersService), container.resolve(RepliersAgents), container.resolve(BossService), config);
   });
   describe("select", function () {
      it("returns null when validation fails", async function () {
         const ctx = makeCtx({});
         const result = await selector.select(ctx);
         assert.equal(result, null);
      });
      it("returns Seller Inquiry type for valid body", async function () {
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.type, "Seller Inquiry");
      });
      it("sets property street from address fields", async function () {
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.property?.street, "100 Queen St");
      });
      it("sets property city and code from address", async function () {
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.property?.city, "Toronto");
         assert.equal(result.property?.code, "M5H 2N2");
      });
      it("sets property type from details.style", async function () {
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.property?.type, "2-Storey");
      });
      it("sets property bedrooms, bathrooms, and area from details", async function () {
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.property?.bedrooms, "3");
         assert.equal(result.property?.bathrooms, "2");
         assert.equal(result.property?.area, "2000");
      });
      it("extracts price from response body estimate when present", async function () {
         const ctx = makeCtx(validBody, {
            response: {
               body: {
                  estimate: 750000,
                  estimateId: 1
               }
            }
         });
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.property?.price, 750000);
      });
      it("sets price to undefined when response body is not an estimate", async function () {
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.property?.price, undefined);
      });
      it("includes sell intention tags when sellingTimeline is set", async function () {
         const body = {
            ...validBody,
            data: {
               salesIntentions: {
                  sellingTimeline: "asap"
               }
            }
         };
         const ctx = makeCtx(body);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.ok(result.person?.tags?.includes("Sell ASAP"));
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
      it("sets pageReferrer from ctx referer header", async function () {
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.pageReferrer, "https://example.com");
      });
   });
});