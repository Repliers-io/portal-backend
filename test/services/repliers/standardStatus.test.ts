import assert from "assert";
import type { RplStandardStatus } from "../../../src/types/repliers.js";
import { constrainStandardStatus } from "../../../src/services/listings/listingHelpers.js";
type StandardStatusFilter = {
   standardStatus?: RplStandardStatus | RplStandardStatus[];
};
const allowed: RplStandardStatus[] = ["Active", "Pending", "Active Under Contract", "Closed"];
describe("constrainStandardStatus", function () {
   it("keeps a fully allowed request untouched", function () {
      const query: StandardStatusFilter = {
         standardStatus: ["Active", "Pending"]
      };
      constrainStandardStatus(query, allowed);
      assert.deepEqual(query.standardStatus, ["Active", "Pending"]);
   });
   it("drops disallowed values from a mixed request", function () {
      const query: StandardStatusFilter = {
         standardStatus: ["Active", "Expired", "Closed", "Withdrawn"]
      };
      constrainStandardStatus(query, allowed);
      assert.deepEqual(query.standardStatus, ["Active", "Closed"]);
   });
   it("normalizes a single allowed value to an array", function () {
      const query: StandardStatusFilter = {
         standardStatus: "Pending"
      };
      constrainStandardStatus(query, allowed);
      assert.deepEqual(query.standardStatus, ["Pending"]);
   });
   it("falls back to the allowed set when a single value is disallowed", function () {
      const query: StandardStatusFilter = {
         standardStatus: "Canceled"
      };
      constrainStandardStatus(query, allowed);
      assert.deepEqual(query.standardStatus, allowed);
   });
   it("falls back to the allowed set when every requested value is disallowed", function () {
      const query: StandardStatusFilter = {
         standardStatus: ["Canceled", "Expired"]
      };
      constrainStandardStatus(query, allowed);
      assert.deepEqual(query.standardStatus, allowed);
   });
   it("does not copy the allowed array by reference on fallback", function () {
      const query: StandardStatusFilter = {
         standardStatus: ["Expired"]
      };
      constrainStandardStatus(query, allowed);
      assert.notEqual(query.standardStatus, allowed);
      assert.deepEqual(allowed, ["Active", "Pending", "Active Under Contract", "Closed"]);
   });
   it("applies the allowed set when no filter was requested", function () {
      const query: StandardStatusFilter = {};
      constrainStandardStatus(query, allowed);
      assert.deepEqual(query.standardStatus, allowed);
   });
   it("is a no-op when no allowed set is configured", function () {
      const query: StandardStatusFilter = {
         standardStatus: ["Canceled", "Expired"]
      };
      constrainStandardStatus(query, undefined);
      assert.deepEqual(query.standardStatus, ["Canceled", "Expired"]);
   });
   it("is a no-op when the allowed set is empty", function () {
      const query: StandardStatusFilter = {
         standardStatus: ["Canceled"]
      };
      constrainStandardStatus(query, []);
      assert.deepEqual(query.standardStatus, ["Canceled"]);
   });
   it("is idempotent", function () {
      const query: StandardStatusFilter = {
         standardStatus: ["Active", "Expired"]
      };
      constrainStandardStatus(query, allowed);
      constrainStandardStatus(query, allowed);
      assert.deepEqual(query.standardStatus, ["Active"]);
   });
});