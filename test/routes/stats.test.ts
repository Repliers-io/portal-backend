import assert from "assert";
import supertest from "supertest";
import TestAgent from "supertest/lib/agent.js";
import app from "../../src/app.js";
import _ from "lodash";
import nock from "nock";
import { mockGraphSearch, mockNbStats } from "../mocks/repliers/stats.js";
import config from "../../src/config.js";
import { generateAuthToken } from "../mocks/auth.js";
describe("Stats", function () {
   let appInstance: TestAgent;
   before(function (done) {
      appInstance = supertest(app.callback());
      done();
   });
   describe("Neighborghood rankings", function () {
      it("Should be able to calulate neighborhood rankings stats", async function () {
         this.slow(1000);
         mockNbStats();
         const token = generateAuthToken({
            email: "test@user",
            sub: "1"
         });
         const nbStatsResponse = await appInstance.get("/api/stats/neighborhoodsranking").query({
            class: "residential",
            limit: 9
         }).set("Authorization", `Bearer ${token}`);
         assert.equal(nbStatsResponse.status, 200);
         assert.deepEqual(nbStatsResponse.body, {
            monthlyChange: [{
               name: "Orleans East",
               value: -2,
               avgCurrent: 701449,
               avgPrevious: 713724
            }, {
               name: "Cumberland",
               value: -11,
               avgCurrent: 781556,
               avgPrevious: 875152
            }],
            threeMonthChange: [{
               name: "Cumberland",
               value: 30,
               avgCurrent: 913097,
               avgPrevious: 704179
            }, {
               name: "Orleans East",
               value: 3,
               avgCurrent: 710773,
               avgPrevious: 689402
            }],
            yoyChange: [{
               name: "Orleans East",
               value: 2,
               avgCurrent: 686037,
               avgPrevious: 670542
            }, {
               name: "Cumberland",
               value: -6,
               avgCurrent: 823493,
               avgPrevious: 874712
            }]
         });
         assert.notEqual(nbStatsResponse.body.monthlyChange[0].value, 71); // check that we are not replying with stubby stats for guests
      });
   });
   describe("GET|POST /stats/graph", function () {
      const statistics = {
         soldPrice: {
            mth: {
               "2026-09": {
                  count: 4,
                  avg: 700000,
                  med: 650000,
                  sum: 2800000
               }
            }
         }
      };
      afterEach(function () {
         nock.cleanAll();
      });
      it("returns Repliers aggregates unwrapped with a Cache-Control header", async function () {
         const {
            sent,
            scope
         } = mockGraphSearch({
            statistics
         });
         const res = await appInstance.get("/api/stats/graph").query({
            city: "Ottawa",
            class: "residential",
            statistics: "avg-soldPrice,med-soldPrice,grp-mth",
            minSoldDate: "2026-01-01",
            maxSoldDate: "2026-10-31"
         });
         assert.equal(res.status, 200);
         assert.ok(scope.isDone());
         assert.deepEqual(res.body.statistics, statistics);
         assert.deepEqual(res.body.listings, []);
         assert.equal(sent.query["listings"], "false");
         assert.equal(sent.query["statistics"], "avg-soldPrice,med-soldPrice,grp-mth");
         // No status filter given: the instance's allowed set is applied upstream, as in /listings/search.
         assert.deepEqual(sent.query["standardStatus"], config.settings.allowedListingsStandardStatuses);
         assert.match(res.headers["cache-control"], /^private, max-age=\d+$/);
         assert.ok(Number(res.headers["cache-control"].split("=")[1]) <= config.cache.statsgraph.ttl_ms / 1000);
      });
      it("serves a repeat request from cache without calling Repliers again", async function () {
         const {
            scope
         } = mockGraphSearch({
            statistics
         });
         const query = {
            city: "Kanata",
            class: "condo",
            statistics: "sum-soldPrice,grp-mth"
         };
         await appInstance.get("/api/stats/graph").query(query);
         const res = await appInstance.get("/api/stats/graph").query(query);
         assert.ok(scope.isDone());
         assert.equal(res.status, 200);
         assert.deepEqual(res.body.statistics, statistics);
         assert.match(res.headers["cache-control"], /^private, max-age=\d+$/);
      });
      it("forwards a POST body to Repliers", async function () {
         const {
            sent
         } = mockGraphSearch({
            statistics
         });
         const map = [[[-75.7, 45.4], [-75.6, 45.4], [-75.6, 45.5], [-75.7, 45.4]]];
         const res = await appInstance.post("/api/stats/graph").query({
            city: "Orleans",
            statistics: "cnt-new,grp-mth"
         }).send({
            map
         });
         assert.equal(res.status, 200);
         assert.deepEqual(sent.body["map"], map);
      });
      it("rejects listings=true and radius without coordinates", async function () {
         const withListings = await appInstance.get("/api/stats/graph").query({
            city: "Nepean",
            listings: true
         });
         assert.equal(withListings.status, 400);
         const withRadius = await appInstance.get("/api/stats/graph").query({
            city: "Nepean",
            radius: 5
         });
         assert.equal(withRadius.status, 400);
      });
   });
});