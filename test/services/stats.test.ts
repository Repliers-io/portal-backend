import assert from "assert";
import StatsService from "../../src/services/stats.js";
import type { RplListingsSearchResponse } from "../../src/services/repliers/listings.js";
const service = new StatsService({} as never, {} as never);
const curr = "2026-09-01";
const prev = "2026-08-01";
describe("StatsService.calcPeriodAvg", function () {
   it("treats a response without statistics as no change", function () {
      const result = service.calcPeriodAvg({
         statistics: {}
      } as RplListingsSearchResponse, "grp-30-days", curr, prev);
      assert.deepEqual(result, {
         change: 0,
         avgCurrent: 0,
         avgPrevious: 0
      });
   });
   it("treats a missing period bucket as no change", function () {
      const stats = {
         statistics: {
            soldPrice: {
               "grp-30-days": {}
            }
         }
      } as RplListingsSearchResponse;
      const result = service.calcPeriodAvg(stats, "grp-30-days", curr, prev);
      assert.equal(result.change, 0);
   });
});