import assert from "assert";
import { ListingsScrubber } from "../../../src/services/scrubber/listings.js";
const FILL_STR = "!scrubbed!";
describe("ListingsScrubber.scrubClusters tests", function () {
   const guest = () => new ListingsScrubber([{
      app_state: {}
   }]);
   const clusterListing = (overrides: Record<string, unknown>) => ({
      mlsNumber: "X1",
      // Repliers returns boardId on cluster-inlined listings; the scrubber gates
      // on it (12 is the test config's scrubbing board id).
      boardId: 12,
      status: "U",
      listPrice: "500000.00",
      address: {
         streetNumber: "10",
         streetName: "Main"
      },
      permissions: {
         displayAddressOnInternet: "Y",
         displayPublic: "Y",
         displayInternetEntireListing: "Y"
      },
      ...overrides
   });
   const aggregatesWith = (listings: Record<string, unknown>[]) => ({
      map: {
         clusters: [{
            count: listings.length,
            listings
         }]
      }
   });
   it("Should scrub a restricted (displayPublic=N) cluster listing", function () {
      const aggregates = aggregatesWith([clusterListing({
         permissions: {
            displayAddressOnInternet: "Y",
            displayPublic: "N",
            displayInternetEntireListing: "Y"
         }
      })]);
      guest().scrubClusters(aggregates);
      const scrubbed = aggregates.map.clusters[0]!.listings[0]!;
      assert.equal(scrubbed.listPrice, FILL_STR);
      assert.equal(scrubbed.address?.streetNumber, FILL_STR);
   });
   it("Should NOT scrub a public (displayPublic=Y) cluster listing", function () {
      const aggregates = aggregatesWith([clusterListing({})]);
      guest().scrubClusters(aggregates);
      const listing = aggregates.map.clusters[0]!.listings[0]!;
      assert.equal(listing.listPrice, "500000.00");
      assert.equal(listing.address?.streetNumber, "10");
   });
   it("Should be a no-op when aggregates is undefined", function () {
      assert.doesNotThrow(() => guest().scrubClusters(undefined));
   });
   it("Should be a no-op when there is no map aggregate", function () {
      const aggregates = {
         class: {}
      };
      assert.doesNotThrow(() => guest().scrubClusters(aggregates));
   });
   it("Should leave clusters without inlined listings untouched", function () {
      const aggregates = {
         map: {
            clusters: [{
               count: 40
            }]
         }
      };
      guest().scrubClusters(aggregates);
      assert.ok(!("listings" in aggregates.map.clusters[0]!));
   });
});