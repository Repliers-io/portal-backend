import assert from "assert";
import { servable, withPermissions } from "../../../src/services/listings.js";
import type { RplListingsHistoryItem } from "../../../src/services/repliers/listings.js";
const record = (extra: Record<string, unknown>) => ({
   mlsNumber: "a",
   boardId: 12,
   ...extra
}) as RplListingsHistoryItem;
describe("servable", function () {
   it("keeps a record with a numeric board", function () {
      assert.equal(servable(record({})), true);
   });

   // `scrub()` returns a record untouched when its board is not in scrubbing.board_ids,
   // and no non-numeric board can be in that list, so these must never be served.
   it("drops a record whose board is missing, null or a string", function () {
      assert.equal(servable({
         mlsNumber: "a"
      } as RplListingsHistoryItem), false);
      assert.equal(servable(record({
         boardId: null
      })), false);
      assert.equal(servable(record({
         boardId: "12"
      })), false);
   });
   it("drops a record the MLS forbids from internet display", function () {
      assert.equal(servable(record({
         permissions: {
            displayInternetEntireListing: "N"
         }
      })), false);
   });
});
describe("withPermissions", function () {
   it("leaves a record that carries permissions untouched", function () {
      const permissions = {
         displayPublic: "Y",
         displayAddressOnInternet: "Y",
         displayInternetEntireListing: "Y"
      };
      assert.deepEqual(withPermissions(record({
         permissions
      })).permissions, permissions);
   });

   // Without this the record reaches asGuest() with nothing to redact on, and a closed
   // record's sold price is served in the clear.
   it("derives non-public permissions for a closed record that carries none", function () {
      const permissions = withPermissions(record({
         lastStatus: "Sld"
      })).permissions;
      assert.equal(permissions?.displayPublic, "N");
   });
   it("derives public permissions for a record still on the market", function () {
      const permissions = withPermissions(record({
         lastStatus: "New"
      })).permissions;
      assert.equal(permissions?.displayPublic, "Y");
   });
});