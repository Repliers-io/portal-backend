import assert from "assert";
import nock from "nock";
import { container } from "tsyringe";
import config from "../../../src/config.js";
import { DummyXFFProvider } from "../../../src/providers/dummy.xff.js";
import RepliersListings from "../../../src/services/repliers/listings.js";
import type { RplListingsSearchRequest } from "../../../src/services/repliers/listings.js";
import { RplStatus } from "../../../src/types/repliers.js";
const listings = () => {
   const scope = container.createChildContainer();
   scope.register("XForwardedFor", {
      useFactory: () => new DummyXFFProvider()
   });
   scope.registerInstance("config", {
      ...config,
      settings: {
         ...config.settings,
         restrictedListings: ["X7599124"]
      }
   });
   return scope.resolve(RepliersListings);
};
describe("Restricted listings at the Repliers boundary", function () {
   afterEach(() => nock.cleanAll());
   it("excludes the blocklist from every search, whatever the status", async function () {
      for (const status of [RplStatus.U, RplStatus.A]) {
         let sent: Record<string, unknown> | undefined;
         nock(config.repliers.base_url).post("/listings", body => (sent = body, true)).query(true).reply(200, {
            listings: []
         });
         await listings().search({
            status: [status]
         } as RplListingsSearchRequest, true);
         assert.deepEqual(sent?.["mlsNumber"], ["not:X7599124"], `status ${status}`);
      }
   });
});