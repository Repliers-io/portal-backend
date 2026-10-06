import assert from "assert";
import { container } from "tsyringe";
import SelectViewEstimateParams from "../../../../src/services/eventsCollection/selectors/selectViewEstimateParams.js";
import RepliersService from "../../../../src/services/repliers.js";
import RepliersAgents from "../../../../src/services/repliers/agents.js";
import BossService from "../../../../src/services/boss.js";
import type { AppConfig } from "../../../../src/config.js";
import { DummyXFFProvider } from "../../../../src/providers/dummy.xff.js";
import { UserRole } from "../../../../src/constants.js";
import type { Context } from "koa";
const estimateFixture = {
   estimateId: 1,
   estimate: 750000,
   estimateLow: 700000,
   estimateHigh: 800000,
   confidence: 85
};
const makeCtx = (responseBody: unknown, role?: number): Context => ({
   request: {
      body: {},
      headers: {
         referer: "https://example.com"
      }
   },
   response: {
      body: responseBody
   },
   state: {
      user: {
         sub: "42",
         email: "jane@example.com",
         role: role
      }
   }
}) as unknown as Context;
describe("SelectViewEstimateParams", function () {
   let selector: SelectViewEstimateParams;
   let config: AppConfig;
   before(() => {
      container.register("XForwardedFor", {
         useFactory: () => new DummyXFFProvider()
      });
      config = container.resolve<AppConfig>("config");
      selector = new SelectViewEstimateParams(container.resolve(RepliersService), container.resolve(RepliersAgents), container.resolve(BossService), config);
   });
   describe("select", function () {
      it("returns null when reportClientViewEstimate is disabled", async function () {
         const original = config.eventsCollection.reportClientViewEstimate;
         config.eventsCollection.reportClientViewEstimate = false;
         const ctx = makeCtx(estimateFixture, UserRole.User);
         const result = await selector.select(ctx);
         assert.equal(result, null);
         config.eventsCollection.reportClientViewEstimate = original;
      });
      it("returns null when response body is not an estimate model", async function () {
         const original = config.eventsCollection.reportClientViewEstimate;
         config.eventsCollection.reportClientViewEstimate = true;
         const ctx = makeCtx({
            notAnEstimate: true
         }, UserRole.User);
         const result = await selector.select(ctx);
         assert.equal(result, null);
         config.eventsCollection.reportClientViewEstimate = original;
      });
      it("returns null when response body is null", async function () {
         const original = config.eventsCollection.reportClientViewEstimate;
         config.eventsCollection.reportClientViewEstimate = true;
         const ctx = makeCtx(null, UserRole.User);
         const result = await selector.select(ctx);
         assert.equal(result, null);
         config.eventsCollection.reportClientViewEstimate = original;
      });
      it("returns null when user role is Admin", async function () {
         const original = config.eventsCollection.reportClientViewEstimate;
         config.eventsCollection.reportClientViewEstimate = true;
         const ctx = makeCtx(estimateFixture, UserRole.Admin);
         const result = await selector.select(ctx);
         assert.equal(result, null);
         config.eventsCollection.reportClientViewEstimate = original;
      });
      it("returns null when user role is Root", async function () {
         const original = config.eventsCollection.reportClientViewEstimate;
         config.eventsCollection.reportClientViewEstimate = true;
         const ctx = makeCtx(estimateFixture, UserRole.Root);
         const result = await selector.select(ctx);
         assert.equal(result, null);
         config.eventsCollection.reportClientViewEstimate = original;
      });
      it("returns result when user role is User", async function () {
         const original = config.eventsCollection.reportClientViewEstimate;
         config.eventsCollection.reportClientViewEstimate = true;
         const ctx = makeCtx(estimateFixture, UserRole.User);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.type, "Visited Website - Estimate");
         config.eventsCollection.reportClientViewEstimate = original;
      });
      it("returns result when role is undefined (guest)", async function () {
         const original = config.eventsCollection.reportClientViewEstimate;
         config.eventsCollection.reportClientViewEstimate = true;
         const ctx = makeCtx(estimateFixture, undefined);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.type, "Visited Website - Estimate");
         config.eventsCollection.reportClientViewEstimate = original;
      });
      it("includes estimate URL in description", async function () {
         const originalFlag = config.eventsCollection.reportClientViewEstimate;
         const originalUrl = config.eventsCollection.estimateUrl;
         config.eventsCollection.reportClientViewEstimate = true;
         config.eventsCollection.estimateUrl = "https://example.tld/estimate/[ESTIMATE_ID]";
         const ctx = makeCtx(estimateFixture, UserRole.User);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.description, "Estimate: https://example.tld/estimate/1");
         config.eventsCollection.reportClientViewEstimate = originalFlag;
         config.eventsCollection.estimateUrl = originalUrl;
      });
      it("sets occurredAt and pageReferrer", async function () {
         const original = config.eventsCollection.reportClientViewEstimate;
         config.eventsCollection.reportClientViewEstimate = true;
         const before = new Date().toISOString();
         const ctx = makeCtx(estimateFixture, UserRole.User);
         const result = await selector.select(ctx);
         const after = new Date().toISOString();
         assert.ok(result);
         assert.ok(result.occurredAt! >= before);
         assert.ok(result.occurredAt! <= after);
         assert.equal(result.pageReferrer, "https://example.com");
         config.eventsCollection.reportClientViewEstimate = original;
      });
   });
});