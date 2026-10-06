import assert from "assert";
import supertest from "supertest";
import app from "../../src/app.js";
import _ from "lodash";
import { mockSearch, mockSingle, mockHistory } from "../mocks/repliers/listings.js";
import type { RplListingsSingleResponse } from "../../src/services/repliers/listings.js";
import type { AppConfig } from "../../src/config.js";
import { container } from "tsyringe";
import { RplYesNo } from "../../src/types/repliers.js";
const config = container.resolve<AppConfig>("config");
describe("Listings", function () {
   const setupApp = () => {
      return supertest(app.callback());
   };
   describe("Single listing", function () {
      const setupSingle = (mlsNumber: string, stub: Partial<RplListingsSingleResponse>) => {
         mockSingle(mlsNumber, stub);
         return setupApp();
      };
      it("should return single listing by mls number", async function () {
         this.slow(1000);
         const appInstance = setupSingle('new', {
            mlsNumber: 'new'
         });
         const listing = await appInstance.get("/api/listings/new?boardId=1");
         assert.equal(listing.status, 200);
         assert.equal(listing.body.mlsNumber, 'new');
      });
      it("should respond with `unavailable_listings_http_code` when listing's last status is Ter", async function () {
         const appInstance = setupSingle('terminated', {
            lastStatus: 'Ter'
         });
         const listing = await appInstance.get("/api/listings/terminated?boardId=1");
         assert.equal(listing.status, config.settings.hide_unavailable_listings_http_code);
      });
      it("should respond with `unavailable_listings_http_code` when listing's last status is Exp", async function () {
         const appInstance = setupSingle('expired', {
            lastStatus: 'Exp'
         });
         const listing = await appInstance.get("/api/listings/expired?boardId=1");
         assert.equal(listing.status, config.settings.hide_unavailable_listings_http_code);
      });
      it("should respond with `unavailable_listings_http_code` when listing's last status is Random", async function () {
         const appInstance = setupSingle('random', {
            lastStatus: 'Random'
         });
         const listing = await appInstance.get("/api/listings/random?boardId=1");
         assert.equal(listing.status, config.settings.hide_unavailable_listings_http_code);
      });
      it("should respond with `unavailable_listings_http_code` when listing's standard status is hidden", async function () {
         const appInstance = setupSingle('canceled', {
            standardStatus: 'Canceled'
         });
         const listing = await appInstance.get("/api/listings/canceled?boardId=1");
         assert.equal(listing.status, config.settings.hide_unavailable_listings_http_code);
      });
      it("should respond with `unavailable_listings_http_code` when listing's permissions.displayInternetEntireListing == 'Y' ", async function () {
         const appInstance = setupSingle('ABC12345', {
            permissions: {
               displayInternetEntireListing: RplYesNo.N,
               displayAddressOnInternet: RplYesNo.N,
               displayPublic: RplYesNo.N
            }
         });
         const listing = await appInstance.get("/api/listings/ABC12345?boardId=1");
         assert.equal(listing.status, config.settings.hide_unavailable_listings_http_code);
      });
   });
   describe("Search standardStatus", function () {
      const allowed = config.settings.allowedListingsStandardStatuses;
      const sentStatuses = (value: unknown) => value === undefined ? undefined : [value].flat();

      // Without a filter Repliers returns every status, so the allowed set has to be
      // sent even when the client never asked for one.
      it("should apply the allowed set to an unfiltered search", async function () {
         const sent = mockSearch();
         const res = await setupApp().get("/api/listings/search");
         assert.equal(res.status, 200);
         assert.deepEqual(sentStatuses(sent.query["standardStatus"]), allowed);
      });
      it("should apply the allowed set to unfiltered body.queries", async function () {
         const sent = mockSearch();
         const res = await setupApp().post("/api/listings/search").send({
            queries: [{
               city: ["Seattle"]
            }]
         });
         assert.equal(res.status, 200);
         assert.deepEqual(sent.body.queries?.map(query => query["standardStatus"]), [allowed]);
      });
      it("should drop statuses outside the allowed set", async function () {
         const sent = mockSearch();
         const res = await setupApp().get("/api/listings/search?standardStatus=Active&standardStatus=Expired");
         assert.equal(res.status, 200);
         assert.deepEqual(sentStatuses(sent.query["standardStatus"]), ["Active"]);
      });

      // An empty standardStatus is ignored by Repliers, which would widen the search to
      // every status — the exact listings the allowed set exists to hide.
      it("should fall back to the allowed set when nothing requested is allowed", async function () {
         const sent = mockSearch();
         const res = await setupApp().get("/api/listings/search?standardStatus=Expired&standardStatus=Canceled");
         assert.equal(res.status, 200);
         assert.deepEqual(sentStatuses(sent.query["standardStatus"]), allowed);
      });
      it("should constrain statuses inside body.queries", async function () {
         const sent = mockSearch();
         const res = await setupApp().post("/api/listings/search").send({
            queries: [{
               standardStatus: ["Pending", "Expired"]
            }, {
               standardStatus: ["Canceled"]
            }]
         });
         assert.equal(res.status, 200);
         assert.deepEqual(sent.body.queries?.map(query => query["standardStatus"]), [["Pending"], allowed]);
      });
   });

   // describe("NLP", function () {
   //    const setupNLPResponse = (prompt: Partial<RplNlpDto>, stub: Partial<RplNlpResponse>) => {
   //       mockNLP(prompt, stub);
   //       return setupApp();
   //    }

   //    it("should return NLP response", async function () {
   //       const appInstance = setupNLPResponse({ prompt: "find me homes" }, {
   //          request: {
   //             url: "https://api.repliers.io/listings?minBeds=4",
   //             summary: "Searching for homes with 4 bedrooms.",
   //             locations: []
   //          },
   //          nlpId: "6c152ffe-0cc1-4fb7-a0fa-d2b68b2ce77e",
   //          nlpVersion: "3"
   //       });
   //       const response = await appInstance
   //          .post("/api/listings/nlp")
   //          .send({ prompt: "find me homes" });

   //       assert.equal(response.status, 200);
   //       assert.equal(response.body.params.minBeds, 4);
   //    });

   // })

   describe("Property history", function () {
      // test.env pins scrubbing to board 12; board 99 is outside it.
      const sold = (mlsNumber: string, boardId: number, listDate: string) => ({
         mlsNumber,
         boardId,
         listDate,
         lastStatus: "Sld",
         listPrice: 500000,
         soldPrice: 495000,
         timestamps: {
            listingEntryDate: listDate
         },
         permissions: {
            displayPublic: "N",
            displayAddressOnInternet: "Y",
            displayInternetEntireListing: "Y"
         }
      });
      it("scrubs closed records for a guest", async function () {
         mockHistory({
            history: [sold("closed", 12, "2020-01-01T00:00:00.000-00:00")]
         });
         const response = await setupApp().get("/api/listings/history?mlsNumber=other");
         assert.equal(response.status, 200);
         assert.equal(response.body.history[0].listPrice, "!scrubbed!");
         assert.equal(response.body.history[0].lastStatus, "!scrubbed!");
      });
      it("passes a closed record through unscrubbed when its board is outside the scrubbing gate (deliberate)", async function () {
         // Decision record: `scrubbing.board_ids` (test.env pins it to board 12) lists
         // boards that REQUIRE scrubbing, not an allowlist of every board the route may
         // return. `ListingsScrubber.scrub()` passes a record through untouched when its
         // board isn't a member (scrubber/listings.ts:193-196), by design — the gate is
         // per-board, not per-route. Board 99 is outside it, so even a closed record
         // (lastStatus "Sld", displayPublic "N") comes back with its real listPrice.
         mockHistory({
            history: [sold("outsidegate", 99, "2020-01-01T00:00:00.000-00:00")]
         });
         const response = await setupApp().get("/api/listings/history?mlsNumber=outsidegate");
         assert.equal(response.status, 200);
         assert.equal(response.body.history[0].listPrice, 500000);
         assert.notEqual(response.body.history[0].listPrice, "!scrubbed!");
      });
      it("drops records without a boardId instead of passing them through unscrubbed", async function () {
         const record = sold("orphan", 12, "2020-01-01T00:00:00.000-00:00");
         delete (record as Partial<typeof record>).boardId;
         mockHistory({
            history: [record]
         });
         const response = await setupApp().get("/api/listings/history?mlsNumber=orphan");
         assert.equal(response.status, 200);
         assert.deepEqual(response.body.history, []);
      });
      it("drops records the MLS forbids from internet display", async function () {
         const record = sold("hidden", 12, "2020-01-01T00:00:00.000-00:00");
         record.permissions = {
            displayPublic: "Y",
            displayAddressOnInternet: "Y",
            displayInternetEntireListing: "N"
         };
         mockHistory({
            history: [record]
         });
         const response = await setupApp().get("/api/listings/history?mlsNumber=hidden");
         assert.equal(response.status, 200);
         assert.deepEqual(response.body.history, []);
      });
      it("scrubs a closed record that arrives without permissions", async function () {
         const record = sold("nopermissions", 12, "2020-01-01T00:00:00.000-00:00");
         delete (record as Partial<typeof record>).permissions;
         mockHistory({
            history: [record]
         });
         const response = await setupApp().get("/api/listings/history?mlsNumber=nopermissions");
         assert.equal(response.status, 200);
         assert.equal(response.body.history[0].listPrice, "!scrubbed!");
      });
      it("rejects an mlsNumber with path characters", async function () {
         const response = await setupApp().get("/api/listings/history?mlsNumber=..%2F..%2Fsecret");
         assert.equal(response.status, 400);
      });
   });
});