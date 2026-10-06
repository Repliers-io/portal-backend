import assert from "assert";
import supertest from "supertest";
import TestAgent from "supertest/lib/agent.js";
import app from "../../src/app.js";
import _ from "lodash";
import { mockNbStats } from "../mocks/repliers/stats.js";
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
});