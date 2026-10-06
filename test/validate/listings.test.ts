import assert from "assert";
import { listingSearchSchema, listingsHistorySchema } from "../../src/validate/listings.js";
import { RplSortBy } from "../../src/types/repliers.js";
describe("listingSearchSchema", function () {
   describe("raw.* fields", function () {
      it("accepts arbitrary raw.* keys", function () {
         const {
            error,
            value
         } = listingSearchSchema.validate({
            ["raw.BuyerAgentKey"]: "abc",
            ["raw.ListAgentMlsId"]: "xyz"
         });
         assert.equal(error, undefined);
         assert.equal(value["raw.BuyerAgentKey"], "abc");
         assert.equal(value["raw.ListAgentMlsId"], "xyz");
      });
      it("accepts an array of strings for a raw.* key", function () {
         const {
            error,
            value
         } = listingSearchSchema.validate({
            ["raw.View"]: ["lake", "river"]
         });
         assert.equal(error, undefined);
         assert.deepEqual(value["raw.View"], ["lake", "river"]);
      });
      it("rejects a non-string raw.* value", function () {
         const {
            error
         } = listingSearchSchema.validate({
            ["raw.BuyerAgentKey"]: 123
         });
         assert.notEqual(error, undefined);
      });
   });
   describe("body.queries", function () {
      it("accepts an array of query objects with assorted fields", function () {
         const {
            error,
            value
         } = listingSearchSchema.validate({
            body: {
               queries: [{
                  minPrice: 100000,
                  propertyType: "Detached"
               }, {
                  maxPrice: 500000,
                  ["raw.ListAgentMlsId"]: "xyz"
               }]
            }
         });
         assert.equal(error, undefined);
         assert.equal(value.body.queries[0].minPrice, 100000);
         assert.equal(value.body.queries[1]["raw.ListAgentMlsId"], "xyz");
      });
      it("does not inject a default boardId into query items", function () {
         const {
            error,
            value
         } = listingSearchSchema.validate({
            body: {
               queries: [{
                  minPrice: 100000
               }]
            }
         });
         assert.equal(error, undefined);
         assert.equal(value.body.queries[0].boardId, undefined);
      });
      it("rejects a query item containing app_state", function () {
         const {
            error
         } = listingSearchSchema.validate({
            body: {
               queries: [{
                  app_state: {
                     user: {}
                  }
               }]
            }
         });
         assert.notEqual(error, undefined);
      });
      it("rejects a query item containing a nested body", function () {
         const {
            error
         } = listingSearchSchema.validate({
            body: {
               queries: [{
                  body: {
                     queries: []
                  }
               }]
            }
         });
         assert.notEqual(error, undefined);
      });
      it("rejects a query item with a wrong-typed field", function () {
         const {
            error
         } = listingSearchSchema.validate({
            body: {
               queries: [{
                  minPrice: "abc"
               }]
            }
         });
         assert.notEqual(error, undefined);
      });
   });
   describe("sortBy", function () {
      it("accepts closedDate and centroidDistance sorts", function () {
         const sorts = [RplSortBy.closedDateAsc, RplSortBy.closedDateDesc, RplSortBy.centroidDistanceAsc, RplSortBy.centroidDistanceDesc];
         for (const sortBy of sorts) {
            const {
               error,
               value
            } = listingSearchSchema.validate({
               sortBy
            });
            assert.equal(error, undefined);
            assert.equal(value.sortBy, sortBy);
         }
      });
      it("rejects an unknown sortBy value", function () {
         const {
            error
         } = listingSearchSchema.validate({
            sortBy: "closedDate"
         });
         assert.notEqual(error, undefined);
      });
   });
});
describe("listingsHistorySchema", function () {
   it("accepts a bare mlsNumber", function () {
      const {
         error,
         value
      } = listingsHistorySchema.validate({
         mlsNumber: "N12814054"
      });
      assert.equal(error, undefined);
      assert.equal(value.mlsNumber, "N12814054");
   });
   it("requires mlsNumber", function () {
      const {
         error
      } = listingsHistorySchema.validate({});
      assert.notEqual(error, undefined);
   });
   it("rejects an mlsNumber with path characters", function () {
      const {
         error
      } = listingsHistorySchema.validate({
         mlsNumber: "../../secret"
      });
      assert.notEqual(error, undefined);
   });
   it("rejects boardId — the endpoint is cross-board", function () {
      const {
         error
      } = listingsHistorySchema.validate({
         mlsNumber: "N12814054",
         boardId: 90
      });
      assert.notEqual(error, undefined);
   });
});