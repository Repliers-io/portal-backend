import assert from "assert";
import { container } from "tsyringe";
import SelectEstimateNoteParams from "../../../../src/services/eventsCollection/selectors/selectEstimateNoteParams.js";
import BaseEventCollectionSelector from "../../../../src/services/eventsCollection/selectors/baseEventCollectionSelector.js";
import RepliersService from "../../../../src/services/repliers.js";
import RepliersAgents from "../../../../src/services/repliers/agents.js";
import BossService from "../../../../src/services/boss.js";
import type { AppConfig } from "../../../../src/config.js";
import { DummyXFFProvider } from "../../../../src/providers/dummy.xff.js";
import type { Context } from "koa";
const addressFixture = {
   city: "Toronto",
   streetName: "QUEEN STREET",
   streetNumber: "100",
   streetSuffix: "W",
   unitNumber: "",
   zip: "M5H 2N2"
};
const detailsFixture = {
   style: "2-Storey",
   propertyType: "Detached",
   sqft: 2000,
   numBedrooms: 3,
   numBathrooms: 2,
   numGarageSpaces: 1,
   yearBuilt: "1990"
};
const estimateSingleFixture = {
   estimateId: 1,
   estimate: 750000,
   estimateLow: 700000,
   estimateHigh: 800000,
   confidence: 85,
   clientId: 42,
   createdOn: "2024-01-01",
   updatedOn: null,
   sendEmailMonthly: false,
   payload: {
      address: addressFixture,
      details: detailsFixture,
      boardId: 2
   }
};
const estimateAddResponseFixture = {
   estimateId: 2,
   estimate: 500000,
   estimateLow: 450000,
   estimateHigh: 550000,
   confidence: 80,
   request: {
      address: addressFixture,
      details: detailsFixture,
      clientId: 99,
      boardId: 2
   }
};
const makeCtx = (responseBody: unknown): Context => ({
   request: {
      body: {},
      headers: {}
   },
   response: {
      body: responseBody
   },
   state: {}
}) as unknown as Context;
describe("SelectEstimateNoteParams", function () {
   let selector: SelectEstimateNoteParams;
   let config: AppConfig;
   before(() => {
      container.register("XForwardedFor", {
         useFactory: () => new DummyXFFProvider()
      });
      config = container.resolve<AppConfig>("config");
      const baseSelector = new BaseEventCollectionSelector(container.resolve(RepliersService), container.resolve(RepliersAgents), container.resolve(BossService), config);
      selector = new SelectEstimateNoteParams(baseSelector);
   });
   describe("select", function () {
      it("returns null when response body is not an estimate", async function () {
         const ctx = makeCtx({});
         const result = await selector.select(ctx);
         assert.equal(result, null);
      });
      it("returns null when response body is null", async function () {
         const ctx = makeCtx(null);
         const result = await selector.select(ctx);
         assert.equal(result, null);
      });
      it("returns null when estimate has no address", async function () {
         const ctx = makeCtx({
            ...estimateSingleFixture,
            payload: {
               ...estimateSingleFixture.payload,
               address: undefined
            }
         });
         const result = await selector.select(ctx);
         assert.equal(result, null);
      });
      it("returns null when estimate has no details", async function () {
         const ctx = makeCtx({
            ...estimateSingleFixture,
            payload: {
               ...estimateSingleFixture.payload,
               details: undefined
            }
         });
         const result = await selector.select(ctx);
         assert.equal(result, null);
      });
      it("returns null when estimate has no clientId", async function () {
         const ctx = makeCtx({
            ...estimateSingleFixture,
            clientId: undefined
         });
         const result = await selector.select(ctx);
         assert.equal(result, null);
      });
      it("generates note for RplEstimateSingle shape", async function () {
         const ctx = makeCtx(estimateSingleFixture);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.isHtml, true);
         assert.equal(result.clientId, 42);
      });
      it("generates note for RplEstimateAddResponse shape", async function () {
         const ctx = makeCtx(estimateAddResponseFixture);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.isHtml, true);
         assert.equal(result.clientId, 99);
      });
      it("sets subject with property type and address", async function () {
         const ctx = makeCtx(estimateSingleFixture);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.ok(result.subject.includes("Detached"));
         assert.ok(result.subject.includes("100 Queen Street W"));
      });
      it("includes property details in HTML body", async function () {
         const ctx = makeCtx(estimateSingleFixture);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.ok(result.body.includes("2-Storey"));
         assert.ok(result.body.includes("2000"));
         assert.ok(result.body.includes("1990"));
         assert.ok(result.body.includes("3"));
         assert.ok(result.body.includes("2"));
      });
      it("includes formatted price in body", async function () {
         const ctx = makeCtx(estimateSingleFixture);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.ok(result.body.includes("$750K"));
      });
      it("includes estimate URL link when available", async function () {
         const original = config.eventsCollection.estimateUrl;
         config.eventsCollection.estimateUrl = "https://example.tld/estimate/[ESTIMATE_ID]";
         const ctx = makeCtx(estimateSingleFixture);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.ok(result.body.includes("https://example.tld/estimate/1"));
         assert.ok(result.body.includes("Click here"));
         config.eventsCollection.estimateUrl = original;
      });
   });
});