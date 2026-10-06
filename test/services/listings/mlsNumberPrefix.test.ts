import assert from "assert";
import { addMlsPrefix, stripMlsPrefix, addMlsNumbers, addMlsSearchVariant, stripMlsNumbers } from "../../../src/services/listings/mlsNumberPrefix.js";
const PREFIX = "NWM";
describe("mlsNumberPrefix", function () {
   describe("addMlsPrefix", function () {
      it("prepends the prefix when missing", function () {
         assert.equal(addMlsPrefix("2559393", PREFIX), "NWM2559393");
      });
      it("is idempotent when already prefixed", function () {
         assert.equal(addMlsPrefix("NWM2559393", PREFIX), "NWM2559393");
      });
      it("is a no-op on an empty prefix", function () {
         assert.equal(addMlsPrefix("2559393", ""), "2559393");
      });
      it("is a no-op on an empty value", function () {
         assert.equal(addMlsPrefix("", PREFIX), "");
      });
   });
   describe("stripMlsPrefix", function () {
      it("removes a leading prefix", function () {
         assert.equal(stripMlsPrefix("NWM2559393", PREFIX), "2559393");
      });
      it("is idempotent when the prefix is absent", function () {
         assert.equal(stripMlsPrefix("2559393", PREFIX), "2559393");
      });
      it("is a no-op on an empty prefix", function () {
         assert.equal(stripMlsPrefix("NWM2559393", ""), "NWM2559393");
      });
      it("only strips a leading occurrence", function () {
         assert.equal(stripMlsPrefix("XNWM1", PREFIX), "XNWM1");
      });
   });
   describe("stripMlsNumbers (deep)", function () {
      it("strips top-level listings and nested history/comparables", function () {
         const data = {
            listings: [{
               mlsNumber: "NWM1"
            }, {
               mlsNumber: "NWM2"
            }],
            history: [{
               mlsNumber: "NWM3"
            }],
            comparables: [{
               mlsNumber: "NWM4"
            }]
         };
         stripMlsNumbers(data, PREFIX);
         assert.deepEqual(data, {
            listings: [{
               mlsNumber: "1"
            }, {
               mlsNumber: "2"
            }],
            history: [{
               mlsNumber: "3"
            }],
            comparables: [{
               mlsNumber: "4"
            }]
         });
      });
      it("strips a single listing plus cluster-inlined listings", function () {
         const data = {
            mlsNumber: "NWM10",
            aggregates: {
               map: {
                  clusters: [{
                     listings: [{
                        mlsNumber: "NWM11"
                     }]
                  }]
               }
            }
         };
         stripMlsNumbers(data, PREFIX);
         assert.equal(data.mlsNumber, "10");
         assert.equal(data.aggregates.map.clusters[0]!.listings[0]!.mlsNumber, "11");
      });
      it("strips similar listings under the `similar` key", function () {
         const data = {
            similar: [{
               mlsNumber: "NWM20"
            }]
         };
         stripMlsNumbers(data, PREFIX);
         assert.equal(data.similar[0]!.mlsNumber, "20");
      });
      it("never touches the raw MLS payload", function () {
         const data = {
            mlsNumber: "NWM30",
            raw: {
               mlsNumber: "NWM30",
               ListingId: "NWM30"
            }
         };
         stripMlsNumbers(data, PREFIX);
         assert.equal(data.mlsNumber, "30");
         assert.equal(data.raw.mlsNumber, "NWM30");
         assert.equal(data.raw.ListingId, "NWM30");
      });
      it("is a no-op on an empty prefix", function () {
         const data = {
            listings: [{
               mlsNumber: "NWM1"
            }]
         };
         stripMlsNumbers(data, "");
         assert.equal(data.listings[0]!.mlsNumber, "NWM1");
      });
   });
   describe("addMlsNumbers (deep)", function () {
      it("prefixes a scalar mlsNumber param", function () {
         const params = {
            mlsNumber: "12345"
         };
         addMlsNumbers(params, PREFIX);
         assert.equal(params.mlsNumber, "NWM12345");
      });
      it("prefixes every entry of an mlsNumber array", function () {
         const params = {
            mlsNumber: ["1", "NWM2"]
         };
         addMlsNumbers(params, PREFIX);
         assert.deepEqual(params.mlsNumber, ["NWM1", "NWM2"]);
      });
      it("prefixes mlsNumber nested inside body.queries[]", function () {
         const params = {
            body: {
               queries: [{
                  mlsNumber: ["1"]
               }, {
                  style: ["Townhouse"]
               }]
            }
         };
         addMlsNumbers(params, PREFIX);
         assert.deepEqual(params.body.queries[0]!.mlsNumber, ["NWM1"]);
         assert.deepEqual(params.body.queries[1], {
            style: ["Townhouse"]
         });
      });
      it("is a no-op on an empty prefix", function () {
         const params = {
            mlsNumber: "12345"
         };
         addMlsNumbers(params, "");
         assert.equal(params.mlsNumber, "12345");
      });
   });
   describe("addMlsSearchVariant", function () {
      it("widens a digit-only search with the prefixed variant and OR", function () {
         const query = {
            search: "2563312",
            searchFields: "address.streetName,mlsNumber,address.zip"
         };
         addMlsSearchVariant(query, PREFIX);
         assert.equal(query.search, "2563312 NWM2563312");
         assert.equal((query as {
            searchOperator?: string;
         }).searchOperator, "OR");
      });
      it("widens a space-padded field list too", function () {
         const query = {
            search: "2563312",
            searchFields: "address.zip, mlsNumber"
         };
         addMlsSearchVariant(query, PREFIX);
         assert.equal(query.search, "2563312 NWM2563312");
         assert.equal((query as {
            searchOperator?: string;
         }).searchOperator, "OR");
      });
      it("skips when searchFields is absent — the Repliers default field set breaks the OR union", function () {
         const query: {
            search: string;
            searchOperator?: string;
         } = {
            search: "2563312"
         };
         addMlsSearchVariant(query, PREFIX);
         assert.deepEqual(query, {
            search: "2563312"
         });
      });
      it("skips when searchFields excludes mlsNumber", function () {
         const query = {
            search: "2563312",
            searchFields: "address.streetName,address.zip"
         };
         addMlsSearchVariant(query, PREFIX);
         assert.deepEqual(query, {
            search: "2563312",
            searchFields: "address.streetName,address.zip"
         });
      });
      it("skips when searchFields contains address.streetNumber — an unmatched digit keyword zeroes the OR union", function () {
         const fields = "address.streetName,mlsNumber,address.zip,address.streetNumber";
         const query = {
            search: "98004",
            searchFields: fields
         };
         addMlsSearchVariant(query, PREFIX);
         assert.deepEqual(query, {
            search: "98004",
            searchFields: fields
         });
      });
      it("skips non-digit queries, including hand-typed prefixed numbers", function () {
         const query = {
            search: "NWM2563312"
         };
         addMlsSearchVariant(query, PREFIX);
         assert.deepEqual(query, {
            search: "NWM2563312"
         });
      });
      it("skips multi-token queries to preserve AND semantics", function () {
         const query = {
            search: "188 Bellevue"
         };
         addMlsSearchVariant(query, PREFIX);
         assert.deepEqual(query, {
            search: "188 Bellevue"
         });
      });
      it("is idempotent — a rewritten search is no longer a single token", function () {
         const query = {
            search: "2563312",
            searchFields: "mlsNumber"
         };
         addMlsSearchVariant(query, PREFIX);
         addMlsSearchVariant(query, PREFIX);
         assert.equal(query.search, "2563312 NWM2563312");
      });
      it("is a no-op on an empty prefix or missing search", function () {
         const bare = {
            search: "2563312"
         };
         addMlsSearchVariant(bare, "");
         assert.deepEqual(bare, {
            search: "2563312"
         });
         const empty: {
            search?: string;
         } = {};
         addMlsSearchVariant(empty, PREFIX);
         assert.deepEqual(empty, {});
      });
   });
});