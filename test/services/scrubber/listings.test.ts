import assert from "assert";
import { ListingsScrubber, scrubbed
// scrubListings
} from "../../../src/services/scrubber/listings.js";
import { singleListing, singleListingStatusUDisplayPublicY, singleListingStatusUDisplayPublicYNoHistory, singleListingDispayPublicN, singleListingDispayAddressOnInternetN, singleListingWComparables, singleListingsAStatusNoDuplicates, singleListingHistoryHasDisplayInternetEntireListingN, singleListingWComparablesWDisplayInternetEntireListingN, singleListingDisplayOnMapN, singleListingDispayPublicNStatusU, singleListingInternetAutomatedValuationDisplayYes, singleListingInternetAutomatedValuationDisplayNo
// singleListingDisplayInternetEntireListingN,
// listingsArray1
} from "../../mocks/scrubber/listings.js";
import _ from "lodash";
import { before } from "mocha";
import { container } from "tsyringe";
import type { AppConfig } from "../../../src/config.js";
const FILL_STR = "!scrubbed!";

/**
 * Helper function to reload the ListingsScrubber module with updated config
 * @param configModifier - Function that modifies the config.settings.scrubbing object
 * @returns Promise that resolves to the reloaded ListingsScrubber class
 */
async function reloadListingsScrubber(configModifier: (scrubbingConfig: AppConfig['settings']['scrubbing']) => void): Promise<typeof ListingsScrubber> {
   const config = container.resolve<AppConfig>('config');
   configModifier(config.settings.scrubbing);

   // Clear the module cache to force reload
   const modulePath = '../../../src/services/scrubber/listings.js';
   const resolvedPath = await import.meta.resolve(modulePath);
   const moduleUrl = new URL(resolvedPath).href;

   // Force reimport with cache-busting query parameter
   const reloadedModule = await import(moduleUrl + '?reload=' + Date.now());
   return reloadedModule.ListingsScrubber;
}
describe("Scrubbing tests", function () {
   describe("Listings scrubber for authorised users", function () {
      it("Should Not scrub anything for authenticated user - singleListing ", function () {
         const listingsScrubber = new ListingsScrubber([{
            app_state: {
               user: {
                  sub: 123
               }
            }
         }]);
         const before = JSON.parse(JSON.stringify(singleListing));
         const after = listingsScrubber.scrub(before);
         assert.deepEqual(after, before);
      });
      it("Should Not scrub anything for authenticated user - singleListingDispayPublicN", function () {
         const listingsScrubber = new ListingsScrubber([{
            app_state: {
               user: {
                  sub: 123
               }
            }
         }]);
         const before = JSON.parse(JSON.stringify(singleListingDispayPublicN));
         const after = listingsScrubber.scrub(before);
         assert.deepEqual(after, before);
      });
      it("Should Not scrub anything for authenticated user - singleListingDispayPublicNStatusU", function () {
         const listingsScrubber = new ListingsScrubber([{
            app_state: {
               user: {
                  sub: 123
               }
            }
         }]);
         const before = JSON.parse(JSON.stringify(singleListingDispayPublicNStatusU));
         const after = listingsScrubber.scrub(before);
         assert.deepEqual(after, before);
      });
      it("Should scrub Address if permissions.displayAddressOnInternet = N", function () {
         const listingsScrubber = new ListingsScrubber([{
            app_state: {
               user: {
                  sub: 123
               }
            }
         }]);
         const before = JSON.parse(JSON.stringify(singleListingDispayAddressOnInternetN));
         const after = listingsScrubber.scrub(before);
         assert.notDeepEqual(before, after);
         assert.equal(after.address?.streetNumber, FILL_STR);
      });
      it("Should drop map if permissions.displayOnMap = N", function () {
         const listingsScrubber = new ListingsScrubber([{
            app_state: {
               user: {
                  sub: 123
               }
            }
         }]);
         const before = JSON.parse(JSON.stringify(singleListingDisplayOnMapN));
         const after = listingsScrubber.scrub(before);
         assert.notDeepEqual(before, after);
         assert.ok(!('map' in after));
      });
   });
   describe("Listings scrubber for guests", function () {
      describe("Listing proper scrubbing", function () {
         it("Should NOT scrub if status = U & displayPublic = Y, no history", function () {
            const listingsScrubber = new ListingsScrubber([{
               app_state: {}
            }]);
            const before = JSON.parse(JSON.stringify(singleListingStatusUDisplayPublicYNoHistory));
            const after = listingsScrubber.scrub(before);
            assert.deepEqual(before, after);
         });
         it("Should tolerate history: null and comparables: null from Repliers", function () {
            const listingsScrubber = new ListingsScrubber([{
               app_state: {}
            }]);
            const before = {
               ...JSON.parse(JSON.stringify(singleListingStatusUDisplayPublicYNoHistory)),
               history: null,
               comparables: null
            };
            const after = listingsScrubber.scrub(before);
            assert.equal(after.history, null);
            assert.equal(after.comparables, null);
         });
         it("Should NOT scrub if status = U & displayPublic = Y, with history", function () {
            const listingsScrubber = new ListingsScrubber([{
               app_state: {}
            }]);
            const before = JSON.parse(JSON.stringify(singleListingStatusUDisplayPublicY));
            const after = listingsScrubber.scrub(before);
            assert.equal(after.listPrice, "874900.00");
            assert.equal(after.lastStatus, "New");
            assert.equal(after.address?.streetNumber, "1657");
         });
         it("Should drop fields if permissions.displayPublic = N", function () {
            const listingsScrubber = new ListingsScrubber([{
               app_state: {}
            }]);
            const before = JSON.parse(JSON.stringify(singleListingDispayPublicN));
            const after = listingsScrubber.scrub(before);
            assert.notDeepEqual(before, after);
            assert.ok(!('history' in after));
            assert.ok(!('agents' in after));
            assert.ok(!('raw' in after));
         });
         it("Should scrub if permissions.displayPublic = N", function () {
            const listingsScrubber = new ListingsScrubber([{
               app_state: {}
            }]);
            const before = JSON.parse(JSON.stringify(singleListingDispayPublicN));
            const after = listingsScrubber.scrub(before);
            assert.notDeepEqual(before, after);
            assert.equal(after.listPrice, FILL_STR);
            assert.equal(after.lastStatus, FILL_STR);
            assert.equal(after.address?.streetNumber, FILL_STR);
         });
         it("Should scrub address if permissions.displayAddressOnInternet = N", function () {
            const listingsScrubber = new ListingsScrubber([{
               app_state: {}
            }]);
            const before = JSON.parse(JSON.stringify(singleListingDispayAddressOnInternetN));
            const after = listingsScrubber.scrub(before);
            assert.notDeepEqual(before, after);
            assert.equal(after.address?.streetNumber, FILL_STR);
         });
         it("Should drop map if permissions.displayOnMap = N", function () {
            const listingsScrubber = new ListingsScrubber([{
               app_state: {}
            }]);
            const before = JSON.parse(JSON.stringify(singleListingDisplayOnMapN));
            const after = listingsScrubber.scrub(before);
            assert.notDeepEqual(before, after);
            assert.ok(!('map' in after));
         });
         it("Should scrub nested array if permissions.displayPublic = N", function () {
            const listingsScrubber = new ListingsScrubber([{
               app_state: {}
            }]);
            const before = JSON.parse(JSON.stringify(singleListingDispayPublicN));
            const after = listingsScrubber.scrub(before);
            assert.notDeepEqual(before, after);
            assert.ok(Array.isArray(after.condominium?.ammenities));
            const ammenitiesArray = after.condominium?.ammenities as string[];
            assert.equal(ammenitiesArray.length, 6);
            ammenitiesArray.forEach(ammenity => {
               assert.equal(ammenity, FILL_STR);
            });
         });
      });
      describe("Comparables scrubbing", function () {
         it("Should NOT scrub comparables with permissions.displayPublic = Y", function () {
            const listingsScrubber = new ListingsScrubber([{
               app_state: {}
            }]);
            const before = JSON.parse(JSON.stringify(singleListingWComparables));
            const after = listingsScrubber.scrub(before);
            assert.equal(after?.comparables?.at(0)?.listPrice, "799900.00");
            assert.equal(after?.comparables?.at(0)?.lastStatus, "Sld");
            assert.equal(after?.comparables?.at(0)?.address?.streetNumber, 1233);
         });
         it("Should scrub comparables with permissions.displayPublic = N", function () {
            const listingsScrubber = new ListingsScrubber([{
               app_state: {}
            }]);
            const before = JSON.parse(JSON.stringify(singleListingWComparables));
            const after = listingsScrubber.scrub(before);
            assert.notDeepEqual(before, after);
            assert.equal(after?.comparables?.at(1)?.listPrice, FILL_STR);
            assert.equal(after?.comparables?.at(1)?.lastStatus, FILL_STR);
            assert.equal(after?.comparables?.at(1)?.address?.streetNumber, FILL_STR);
         });
         it("Should scrub comparables without permissions based on lastStatus", function () {
            const listingsScrubber = new ListingsScrubber([{
               app_state: {}
            }]);
            const before = JSON.parse(JSON.stringify(singleListingWComparables));
            const after = listingsScrubber.scrub(before);
            assert.notDeepEqual(before, after);
            assert.equal(after?.comparables?.at(2)?.listPrice, FILL_STR);
            assert.equal(after?.comparables?.at(2)?.lastStatus, FILL_STR);
            assert.equal(after?.comparables?.at(2)?.address?.streetNumber, FILL_STR);
         });
         it("Should drop comparables with permissions.displayInternetEntireListing = N", function () {
            const listingsScrubber = new ListingsScrubber([{
               app_state: {}
            }]);
            const before = JSON.parse(JSON.stringify(singleListingWComparablesWDisplayInternetEntireListingN));
            const after = listingsScrubber.scrub(before);
            assert.notDeepEqual(before, after);
            assert.equal(after?.comparables?.length, 0);
         });
      });
      describe("History scrubbing", function () {
         it("Should NOT scrub history item with permissions.displayPublic = Y", function () {
            const listingsScrubber = new ListingsScrubber([{
               app_state: {}
            }]);
            const before = JSON.parse(JSON.stringify(singleListing));
            const after = listingsScrubber.scrub(before);
            assert.equal(after?.history?.length, 9);
            assert.equal(after?.history?.at(0)?.listPrice, "1074900.00");
            assert.equal(after?.history?.at(0)?.lastStatus, "Sld");
            assert.equal(after?.history?.at(0)?.address?.streetNumber, 1657);
         });
         it("Should scrub history item Address with permissions.displayAddressOnInternet = N & permissions.displayPublic = Y", function () {
            const listingsScrubber = new ListingsScrubber([{
               app_state: {}
            }]);
            const before = JSON.parse(JSON.stringify(singleListing));
            const after = listingsScrubber.scrub(before);
            assert.equal(after?.history?.length, 9);
            assert.equal(after?.history?.at(1)?.listPrice, "925000.00");
            assert.equal(after?.history?.at(1)?.lastStatus, "Ter");
            assert.equal(after?.history?.at(1)?.address?.streetNumber, FILL_STR);
         });
         it("Should scrub history item with permissions.displayPublic = N", function () {
            const listingsScrubber = new ListingsScrubber([{
               app_state: {}
            }]);
            const before = JSON.parse(JSON.stringify(singleListing));
            const after = listingsScrubber.scrub(before);
            assert.equal(after?.history?.length, 9);
            assert.equal(after?.history?.at(2)?.listPrice, FILL_STR);
            assert.equal(after?.history?.at(2)?.lastStatus, FILL_STR);
            assert.equal(after?.history?.at(2)?.address?.streetNumber, FILL_STR);
         });
         it("Should scrub history item Without permissions based on Status", function () {
            const listingsScrubber = new ListingsScrubber([{
               app_state: {}
            }]);
            const before = JSON.parse(JSON.stringify(singleListing));
            const after = listingsScrubber.scrub(before);
            assert.equal(after?.history?.length, 9);
            assert.equal(after?.history?.at(3)?.listPrice, FILL_STR);
            assert.equal(after?.history?.at(3)?.lastStatus, FILL_STR);
            assert.equal(after?.history?.at(3)?.address?.streetNumber, FILL_STR);
         });
         it("Should drop history item with permissions.displayInternetEntireListing = N", function () {
            const listingsScrubber = new ListingsScrubber([{
               app_state: {}
            }]);
            const before = JSON.parse(JSON.stringify(singleListingHistoryHasDisplayInternetEntireListingN));
            const after = listingsScrubber.scrub(before);
            assert.equal(after?.history?.length, 8);
         });
      });
      describe('With scrubbing_duplicates = true', function () {
         before(function () {
            const config = container.resolve<AppConfig>('config');
            config.settings.scrubbing.duplicates_enabled = true;
         });
         it("Should scrub if status = A and no duplicates", function () {
            const listingsScrubber = new ListingsScrubber([{
               app_state: {}
            }]);
            const before = JSON.parse(JSON.stringify(singleListingsAStatusNoDuplicates));
            const after = listingsScrubber.scrub(before);
            assert.notDeepEqual(before, after);
            assert.equal(after.listPrice, FILL_STR);
            assert.equal(after.lastStatus, FILL_STR);
            assert.equal(after.address?.streetNumber, FILL_STR);

            // and should update displayPublic to N
            assert.equal(after.permissions?.displayPublic, "N");
         });
      });
      describe('With scrubbing_duplicates = false', function () {
         before(function () {
            const config = container.resolve<AppConfig>('config');
            config.settings.scrubbing.duplicates_enabled = false;
         });
         it("Should scrub if status = A and no duplicates", function () {
            const listingsScrubber = new ListingsScrubber([{
               app_state: {}
            }]);
            const before = JSON.parse(JSON.stringify(singleListingsAStatusNoDuplicates));
            const after = listingsScrubber.scrub(before);
            assert.notDeepEqual(before, after);
            assert.equal(after.resource, 'Property:6585');
            assert.equal(after.listPrice, '874900.00');
            assert.equal(after.lastStatus, 'New');
            assert.equal(after.address?.streetNumber, '1657');

            // and should update displayPublic to N
            assert.equal(after.permissions?.displayPublic, "Y");
         });
      });
   });
   describe("Listings scrubber for Everyone", function () {
      it("Should Not scrub estimates - singleListingInternetAutomatedValuationDisplayYes", function () {
         const listingsScrubber = new ListingsScrubber([{
            app_state: {}
         }]);
         const before = JSON.parse(JSON.stringify(singleListingInternetAutomatedValuationDisplayYes));
         const after = listingsScrubber.scrub(before);
         assert.deepEqual(after.estimate, before.estimate);
      });
      it("Should Scrub estimates - singleListingInternetAutomatedValuationDisplayNo", function () {
         const listingsScrubber = new ListingsScrubber([{
            app_state: {}
         }]);
         const before = JSON.parse(JSON.stringify(singleListingInternetAutomatedValuationDisplayNo));
         const after = listingsScrubber.scrub(before);
         assert.ok(!('estimate' in after));
      });
   });

   // TODO: Finish permissions.displayInternetEntireListing == N handling

   // it("Should drop single listing with permissions.displayInternetEntireListing == N", function () {
   //       const listingsScrubber = new ListingsScrubber([{ app_state: {} }]);
   //       const before = JSON.parse(JSON.stringify(singleListingDisplayInternetEntireListingN));
   //       const after = listingsScrubber.scrub(before);

   //       assert.deepEqual(after, null);
   // });

   // it("Should drop listing with permissions.displayInternetEntireListing == N from listingsArray1", function () {
   //       const beforeArray = {
   //          listings: [...listingsArray1]
   //       };
   //       const afterArray = scrubListings(beforeArray, "listings", { app_state: {} });

   //       assert.equal(afterArray.length, 1);
   //       assert.equal(afterArray[0].mlsNumber, "1391537");
   // });
});
describe("@scrubbed decorator - cluster aggregates wiring", function () {
   // A restricted (displayPublic=N) listing that Repliers inlines into a small
   // map cluster. Repliers returns boardId on cluster-inlined listings; the
   // scrubber gates on it (12 is the test config's scrubbing board id).
   const restrictedClusterListing = () => ({
      mlsNumber: "C1",
      boardId: 12,
      status: "U",
      listPrice: "999000.00",
      address: {
         streetNumber: "42",
         streetName: "King"
      },
      permissions: {
         displayAddressOnInternet: "Y",
         displayPublic: "N",
         displayInternetEntireListing: "Y"
      }
   });
   class FakeListingsService {
      @scrubbed("listings")
      async search(_params: {
         app_state: Record<string, unknown>;
      }) {
         return {
            listings: [{
               mlsNumber: "T1",
               boardId: 12,
               status: "U",
               listPrice: "111000.00",
               address: {
                  streetNumber: "1",
                  streetName: "Queen"
               },
               permissions: {
                  displayAddressOnInternet: "Y",
                  displayPublic: "N",
                  displayInternetEntireListing: "Y"
               }
            }],
            aggregates: {
               map: {
                  clusters: [{
                     count: 1,
                     listings: [restrictedClusterListing()]
                  }]
               }
            }
         };
      }
      @scrubbed()
      async single(_params: {
         app_state: Record<string, unknown>;
      }) {
         return restrictedClusterListing();
      }
   }
   it("Should scrub cluster-inlined listings (guest)", async function () {
      const result: any = await new FakeListingsService().search({
         app_state: {}
      });
      const clusterListing = result.aggregates.map.clusters[0].listings[0];
      assert.equal(clusterListing.listPrice, FILL_STR);
      assert.equal(clusterListing.address.streetNumber, FILL_STR);
   });
   it("Should still scrub the top-level listings array (guest)", async function () {
      const result: any = await new FakeListingsService().search({
         app_state: {}
      });
      assert.equal(result.listings[0].listPrice, FILL_STR);
      assert.equal(result.listings[0].address.streetNumber, FILL_STR);
   });
   it("Should be a no-op on results without cluster aggregates", async function () {
      const result: any = await new FakeListingsService().single({
         app_state: {}
      });
      // single() returns no aggregates — the cluster pass must not throw.
      assert.equal(result.listPrice, FILL_STR);
   });
});
describe("Scrubbing tests - Config changes", function () {
   let ListingsScrubberReloaded: typeof ListingsScrubber;
   describe("Guest - should drop fields", function () {
      before(async function () {
         ListingsScrubberReloaded = await reloadListingsScrubber(scrubbing => {
            scrubbing.dropFields = ["history", "agents", "raw", "images"];
            scrubbing.safeFields = ["address", "class", "map", "propertyType", "type", "mlsNumber", "permissions", "status", "boardId", "listDate", "imageInsights", "duplicates", "resource"];
         });
      });
      it("Should drop fields if permissions.displayPublic = N", function () {
         const listingsScrubber = new ListingsScrubberReloaded([{
            app_state: {}
         }]);
         const before = JSON.parse(JSON.stringify(singleListingDispayPublicN));
         const after = listingsScrubber.scrub(before);
         assert.notDeepEqual(before, after);
         assert.ok(!('history' in after));
         assert.ok(!('agents' in after));
         assert.ok(!('raw' in after));

         // Remvoved for backward compatability
         assert.ok(!('images' in after));
      });
   });
   describe("Guest - should drop Address fields", function () {
      before(async function () {
         ListingsScrubberReloaded = await reloadListingsScrubber(scrubbing => {
            scrubbing.safeAddressFields = ["area", "city", "neighborhood"];
         });
      });
      it("Should drop fields if permissions.displayPublic = N", function () {
         const listingsScrubber = new ListingsScrubberReloaded([{
            app_state: {}
         }]);
         const before = JSON.parse(JSON.stringify(singleListingDispayPublicN));
         const after = listingsScrubber.scrub(before);
         assert.notDeepEqual(before, after);
         assert.equal(after.address?.area, "Ottawa");
         assert.equal(after.address?.city, "Ottawa");
         assert.equal(after.address?.neighborhood, "Riverview Park");
         assert.equal(after.address?.district, FILL_STR);
         assert.equal(after.address?.streetName, FILL_STR);
         assert.equal(after.address?.streetSuffix, FILL_STR);
      });
   });
   describe("Guest - Safe Fields override DropFields", function () {
      before(async function () {
         ListingsScrubberReloaded = await reloadListingsScrubber(scrubbing => {
            scrubbing.dropFields = ["history", "agents", "raw", "status"];
         });
      });
      it("Should drop fields if permissions.displayPublic = N", function () {
         const listingsScrubber = new ListingsScrubberReloaded([{
            app_state: {}
         }]);
         const before = JSON.parse(JSON.stringify(singleListingDispayPublicN));
         const after = listingsScrubber.scrub(before);
         assert.notDeepEqual(before, after);
         assert.ok('status' in after);
         assert.equal(after.status, "A");
      });
   });
   describe("Guest - SafeFields with dotted notation partially preserve drop fields", function () {
      before(async function () {
         ListingsScrubberReloaded = await reloadListingsScrubber(scrubbing => {
            scrubbing.dropFields = ["history", "agents", "raw"];
            scrubbing.safeFields = ["address", "class", "map", "propertyType", "type", "mlsNumber", "permissions", "status", "boardId", "listDate", "duplicates", "resource", "raw.Exposure"];
         });
      });
      it("Should keep raw.Exposure but drop other raw sub-fields when raw is a drop field and raw.Exposure is safe", function () {
         const listingsScrubber = new ListingsScrubberReloaded([{
            app_state: {}
         }]);
         const before = JSON.parse(JSON.stringify(singleListingDispayPublicN));
         const after = listingsScrubber.scrub(before);
         assert.ok('raw' in after, "raw field should still exist");
         assert.ok(!('history' in after), "history should be dropped");
         assert.ok(!('agents' in after), "agents should be dropped");

         // Only Exposure should remain (it doesn't exist in mock, so raw should be empty object with no keys except Exposure if it existed)
         const rawKeys = Object.keys(after.raw!);
         assert.equal(rawKeys.length, 0, "raw should have no keys since Exposure doesn't exist in the mock data");
      });
   });
   describe("Guest - SafeFields with dotted notation preserves matching sub-fields", function () {
      before(async function () {
         ListingsScrubberReloaded = await reloadListingsScrubber(scrubbing => {
            scrubbing.dropFields = ["history", "agents", "raw"];
            scrubbing.safeFields = ["address", "class", "map", "propertyType", "type", "mlsNumber", "permissions", "status", "boardId", "listDate", "duplicates", "resource", "raw.City", "raw.Board", "condominium.fees.parkingIncl", "condominium.fees.heatIncl", "condominium.fees.taxesIncl", "nearby.ammenities"];
         });
      });
      it("Should keep only raw.City and raw.Board, drop all other raw sub-fields", function () {
         const listingsScrubber = new ListingsScrubberReloaded([{
            app_state: {}
         }]);
         const before = JSON.parse(JSON.stringify(singleListingDispayPublicN));
         const after = listingsScrubber.scrub(before);
         assert.ok('raw' in after, "raw field should still exist");
         assert.equal(after.raw!.City, "Ottawa", "raw.City should be preserved");
         assert.equal(after.raw!.Board, "Ottawa", "raw.Board should be preserved");
         const rawKeys = Object.keys(after.raw!);
         assert.equal(rawKeys.length, 2, "raw should only have City and Board");
         assert.ok(!('DOM' in after.raw!), "raw.DOM should be dropped");
         assert.ok(!('Status' in after.raw!), "raw.Status should be dropped");
      });
      it("Should keep only condominium.fees.parkingIncl, condominium.fees.heatIncl and condominium.fees.taxesIncl, scrub all other condominium sub-fields", function () {
         const listingsScrubber = new ListingsScrubberReloaded([{
            app_state: {}
         }]);
         const before = JSON.parse(JSON.stringify(singleListingDispayPublicN));
         const after = listingsScrubber.scrub(before);
         assert.ok('condominium' in after, "condominium field should still exist");
         assert.ok(after.condominium && 'fees' in after.condominium, "condominium.fees field should still exist");
         assert.equal(after.condominium!.fees!.parkingIncl, "Y", "condominium.fees.parkingIncl should be preserved");
         assert.equal(after.condominium!.fees!.heatIncl, "Y", "condominium.fees.heatIncl should be preserved");
         assert.equal(after.condominium!.fees!.taxesIncl, null, "condominium.fees.taxesIncl should be preserved");
         const feesKeys = Object.keys(after.condominium!.fees!);
         assert.equal(feesKeys.length, 7, "condominium.fees should still have all fields");
         assert.equal(after.condominium!.fees!.cableInlc!, FILL_STR);
         assert.equal(after.condominium!.fees!.hydroIncl!, FILL_STR);
         assert.equal(after.condominium!.fees!.waterIncl!, null);
      });
      it("Should keep nested array - nearby.ammenities - values untouched", function () {
         const listingsScrubber = new ListingsScrubberReloaded([{
            app_state: {}
         }]);
         const before = JSON.parse(JSON.stringify(singleListingDispayPublicN));
         const after = listingsScrubber.scrub(before);
         assert.ok(Array.isArray(after.nearby?.ammenities));
         const ammenitiesArray = after.nearby?.ammenities as string[];
         assert.equal(ammenitiesArray.length, 4);
         assert.equal(after.nearby?.ammenities[0], "Playground Nearby");
         ammenitiesArray.forEach(ammenity => {
            assert.notEqual(ammenity, FILL_STR);
         });
      });
   });

   // TODO: if permissions.displayInternetEntireListing == N - we need to drop everything and log warning

   // TODO: if permissions missing we need to treat listng as  - permissions.displayInternetEntireListing == N and log warning
});