import assert from "assert";
import { container } from "tsyringe";
import SelectRequestInfoParams from "../../../../src/services/eventsCollection/selectors/selectRequestInfoParams.js";
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
const validBody = {
   name: "Jane Doe",
   email: "jane@example.com",
   phone: "15559876543",
   message: "I am interested in this property",
   mlsNumber: "W1234567"
};
const makeCtx = (body: Record<string, unknown> = {}): Context => ({
   request: {
      body,
      headers: {
         referer: "https://example.com"
      }
   },
   state: {
      user: {
         sub: "42",
         email: "jane@example.com"
      }
   }
}) as unknown as Context;
describe("SelectRequestInfoParams", function () {
   let selector: SelectRequestInfoParams;
   let repliersService: RepliersService;
   let originalListingsSingle: RepliersService["listings"]["single"];
   before(() => {
      container.register("XForwardedFor", {
         useFactory: () => new DummyXFFProvider()
      });
      repliersService = container.resolve(RepliersService);
      const config = container.resolve<AppConfig>("config");
      originalListingsSingle = repliersService.listings.single.bind(repliersService.listings);
      repliersService.listings.single = async () => listingFixture as never;
      selector = new SelectRequestInfoParams(repliersService, container.resolve(RepliersAgents), container.resolve(BossService), config);
   });
   after(() => {
      repliersService.listings.single = originalListingsSingle;
   });
   describe("select", function () {
      it("returns null when validation fails (missing email)", async function () {
         const ctx = makeCtx({
            name: "Jane",
            phone: "555",
            message: "hi",
            mlsNumber: "X1"
         });
         const result = await selector.select(ctx);
         assert.equal(result, null);
      });
      it("returns Inquiry type for valid body", async function () {
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.type, "Inquiry");
      });
      it("sets person.firstName from name", async function () {
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.person?.firstName, "Jane Doe");
      });
      it("sets person.emails from email", async function () {
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.deepEqual(result.person?.emails, [{
            value: "jane@example.com",
            type: "main"
         }]);
      });
      it("sets person.phones from phone", async function () {
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.deepEqual(result.person?.phones, [{
            value: "15559876543",
            type: "main"
         }]);
      });
      it("sets message from body", async function () {
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.message, "I am interested in this property");
      });
      it("includes property data from getProperty", async function () {
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.property?.mlsNumber, "W1234567");
         assert.equal(result.property?.city, "Toronto");
      });
      it("sets pageReferrer from ctx referer header", async function () {
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.pageReferrer, "https://example.com");
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
   describe("form tags", function () {
      let taggingSelector: SelectRequestInfoParams;
      before(() => {
         const config = container.resolve<AppConfig>("config");
         const configWithTags = {
            ...config,
            eventsCollection: {
               ...config.eventsCollection,
               formTags: {
                  inquiry: {
                     sale: "Property Inquiry",
                     rent: "Rental Inquiry"
                  }
               }
            }
         } as AppConfig;
         taggingSelector = new SelectRequestInfoParams(repliersService, container.resolve(RepliersAgents), container.resolve(BossService), configWithTags);
      });
      it("tags a for-sale inquiry as Property Inquiry", async function () {
         repliersService.listings.single = async () => ({
            ...listingFixture,
            type: "Sale"
         }) as never;
         const result = await taggingSelector.select(makeCtx(validBody));
         assert.ok(result);
         assert.deepEqual(result.person?.tags, ["Property Inquiry"]);
      });
      it("tags a rental inquiry as Rental Inquiry", async function () {
         repliersService.listings.single = async () => ({
            ...listingFixture,
            type: "Lease"
         }) as never;
         const result = await taggingSelector.select(makeCtx(validBody));
         assert.ok(result);
         assert.deepEqual(result.person?.tags, ["Rental Inquiry"]);
      });
   });
});