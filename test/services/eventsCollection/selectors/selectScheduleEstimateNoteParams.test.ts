import assert from "assert";
import { container } from "tsyringe";
import SelectScheduleEstimateNoteParams from "../../../../src/services/eventsCollection/selectors/selectScheduleEstimateNoteParams.js";
import BaseEventCollectionSelector from "../../../../src/services/eventsCollection/selectors/baseEventCollectionSelector.js";
import RepliersService from "../../../../src/services/repliers.js";
import RepliersAgents from "../../../../src/services/repliers/agents.js";
import BossService from "../../../../src/services/boss.js";
import type { AppConfig } from "../../../../src/config.js";
import { DummyXFFProvider } from "../../../../src/providers/dummy.xff.js";
const estimateFixture = {
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
      address: {
         city: "Toronto",
         streetName: "QUEEN STREET",
         streetNumber: "100",
         streetSuffix: "W",
         unitNumber: "",
         zip: "M5H 2N2"
      },
      details: {
         style: "2-Storey",
         propertyType: "Detached",
         sqft: 2000,
         numBedrooms: 3,
         numBathrooms: 2
      },
      boardId: 2
   }
};
describe("SelectScheduleEstimateNoteParams", function () {
   let selector: SelectScheduleEstimateNoteParams;
   let config: AppConfig;
   before(() => {
      container.register("XForwardedFor", {
         useFactory: () => new DummyXFFProvider()
      });
      config = container.resolve<AppConfig>("config");
      const baseSelector = new BaseEventCollectionSelector(container.resolve(RepliersService), container.resolve(RepliersAgents), container.resolve(BossService), config);
      selector = new SelectScheduleEstimateNoteParams(baseSelector);
   });
   describe("select", function () {
      it("sets subject about scheduling a meeting", async function () {
         const result = await selector.select({
            estimate: estimateFixture as never,
            date: "2024-03-15",
            time: "10:00 AM"
         });
         assert.ok(result.subject.includes("schedule a meeting"));
      });
      it("includes date and time in HTML body", async function () {
         const result = await selector.select({
            estimate: estimateFixture as never,
            date: "2024-03-15",
            time: "10:00 AM"
         });
         assert.ok(result.body.includes("2024-03-15"));
         assert.ok(result.body.includes("10:00 AM"));
      });
      it("includes formatted price in body", async function () {
         const result = await selector.select({
            estimate: estimateFixture as never,
            date: "2024-03-15",
            time: "10:00 AM"
         });
         assert.ok(result.body.includes("$750K"));
      });
      it("includes formatted address in body", async function () {
         const result = await selector.select({
            estimate: estimateFixture as never,
            date: "2024-03-15",
            time: "10:00 AM"
         });
         assert.ok(result.body.includes("100 Queen Street W"));
         assert.ok(result.body.includes("Toronto"));
      });
      it("includes estimate URL link in body", async function () {
         const original = config.eventsCollection.estimateUrl;
         config.eventsCollection.estimateUrl = "https://example.tld/estimate/[ESTIMATE_ID]";
         const result = await selector.select({
            estimate: estimateFixture as never,
            date: "2024-03-15",
            time: "10:00 AM"
         });
         assert.ok(result.body.includes("https://example.tld/estimate/1"));
         config.eventsCollection.estimateUrl = original;
      });
      it("sets isHtml to true", async function () {
         const result = await selector.select({
            estimate: estimateFixture as never,
            date: "2024-03-15",
            time: "10:00 AM"
         });
         assert.equal(result.isHtml, true);
      });
      it("falls back to unknown address when payload.address is missing", async function () {
         const estimate = {
            ...estimateFixture,
            payload: {
               ...estimateFixture.payload,
               address: undefined
            }
         };
         const result = await selector.select({
            estimate: estimate as never,
            date: "2024-03-15",
            time: "10:00 AM"
         });
         assert.ok(result.body.includes("unknown address"));
      });
      it("falls back to unknown city when address.city is missing", async function () {
         const estimate = {
            ...estimateFixture,
            payload: {
               ...estimateFixture.payload,
               address: {
                  ...estimateFixture.payload.address,
                  city: ""
               }
            }
         };
         const result = await selector.select({
            estimate: estimate as never,
            date: "2024-03-15",
            time: "10:00 AM"
         });
         assert.ok(result.body.includes("unknown city"));
      });
   });
});