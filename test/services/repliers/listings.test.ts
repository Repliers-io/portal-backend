import assert from "assert";
import { constrainStandardStatus } from "../../../src/services/listings/listingHelpers.js";
import type { RplStandardStatus } from "../../../src/types/repliers.js";
const allowed: RplStandardStatus[] = ["Active", "Pending", "Closed"];
describe("constrainStandardStatus", function () {
   it("drops disallowed values", function () {
      const query: {
         standardStatus?: RplStandardStatus | RplStandardStatus[];
      } = {
         standardStatus: ["Active", "Expired", "Closed"]
      };
      constrainStandardStatus(query, allowed);
      assert.deepEqual(query.standardStatus, ["Active", "Closed"]);
   });
   it("falls back to the allowed set when nothing requested is allowed", function () {
      const query: {
         standardStatus?: RplStandardStatus | RplStandardStatus[];
      } = {
         standardStatus: "Canceled"
      };
      constrainStandardStatus(query, allowed);
      assert.deepEqual(query.standardStatus, allowed);
   });
   it("applies the allowed set when no filter was requested", function () {
      const query: {
         standardStatus?: RplStandardStatus | RplStandardStatus[];
      } = {};
      constrainStandardStatus(query, allowed);
      assert.deepEqual(query.standardStatus, allowed);
   });
   it("is a no-op when unconfigured", function () {
      const query: {
         standardStatus?: RplStandardStatus | RplStandardStatus[];
      } = {
         standardStatus: ["Canceled"]
      };
      constrainStandardStatus(query, undefined);
      assert.deepEqual(query.standardStatus, ["Canceled"]);
   });
});