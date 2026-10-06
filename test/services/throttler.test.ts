import assert from "node:assert";
import { container } from "tsyringe";
import type { AppConfig } from "../../src/config.js";
import RepliersListings, { type RplListingsSingleResponse } from "../../src/services/repliers/listings.js";
import { mockSingle } from "../mocks/repliers/listings.js";
import { DummyXFFProvider } from "../../src/providers/dummy.xff.js";
describe("Integration test for p-throttle with axios and tsyringe", function () {
   it("Should throttle if more than limit per interval requests performed via repliers API", async function () {
      this.slow(1000);
      const config = container.resolve<AppConfig>("config");
      const onDelay = container.resolve<any>("throttler:ondelay");
      container.register("XForwardedFor", {
         useFactory: () => new DummyXFFProvider()
      });
      const repliersApi = container.resolve(RepliersListings);
      const singlePersist = mockSingle("123456", {}).persist();
      const requests: Array<Promise<RplListingsSingleResponse>> = [];
      const totalRequests = config.repliers.limit + 2; // exceed limit to test throttling
      for (let i = 0; i < totalRequests; i++) {
         requests.push(repliersApi.single({
            mlsNumber: "123456",
            boardId: 2,
            app_state: {
               user: {}
            }
         }));
      }
      await Promise.all(requests);
      const onDelayCount = onDelay.mock.callCount();
      assert(onDelayCount > 2);
      assert(singlePersist.isDone);
      singlePersist.persist(false);
   });
});