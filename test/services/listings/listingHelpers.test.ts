import assert from "assert";
import { excludeRestrictedListings, dropRestricted } from "../../../src/services/listings/listingHelpers.ts";
type Filter = {
   mlsNumber?: string[];
   queries?: Filter[];
};
const blocked = ["X7599124", "X13640584"];
const excluded = ["not:X7599124", "not:X13640584"];
const post = {
   prefix: "",
   usePost: true
};
describe("excludeRestrictedListings tests", function () {
   it("Should place the exclusion in the body of a POST and the query string of a GET", function () {
      const body: Filter = {};
      excludeRestrictedListings({}, body, blocked, post);
      assert.deepEqual(body.mlsNumber, excluded);
      const query: Filter = {};
      excludeRestrictedListings(query, {}, blocked, {
         prefix: "",
         usePost: false
      });
      assert.deepEqual(query.mlsNumber, excluded);
   });
   it("Should join the caller's own filter instead of adding a second one", function () {
      const query: Filter = {
         mlsNumber: ["W1234567"]
      };
      const body: Filter = {};
      excludeRestrictedListings(query, body, blocked, post);
      assert.deepEqual(query.mlsNumber, ["W1234567", ...excluded]);
      assert.equal(body.mlsNumber, undefined, "a second placement is a 400 Parameter conflict");
   });
   it("Should cover every branch once any of them filters by mlsNumber, one top-level entry otherwise", function () {
      const mixed: Filter = {
         queries: [{
            mlsNumber: ["W1234567"]
         }, {}]
      };
      excludeRestrictedListings({}, mixed, blocked, post);
      assert.deepEqual(mixed.queries?.[0]?.mlsNumber, ["W1234567", ...excluded]);
      assert.deepEqual(mixed.queries?.[1]?.mlsNumber, excluded, "an open branch leaks through the union");
      assert.equal(mixed.mlsNumber, undefined);
      const plain: Filter = {
         queries: [{}, {}]
      };
      excludeRestrictedListings({}, plain, blocked, post);
      assert.deepEqual(plain.mlsNumber, excluded);
      assert.equal(plain.queries?.[0]?.mlsNumber, undefined);
   });
   it("Should prefix the number without swallowing the operator", function () {
      const body: Filter = {};
      excludeRestrictedListings({}, body, ["2559393"], {
         prefix: "NWM",
         usePost: true
      });
      assert.deepEqual(body.mlsNumber, ["not:NWM2559393"]);
   });
});
describe("dropRestricted tests", function () {
   it("Should drop blocked entries and keep everything else, including records with no mlsNumber", function () {
      const items = [{
         mlsNumber: "X7599124"
      }, {
         mlsNumber: "W1234567"
      }, {
         favoriteId: 1
      }];
      assert.deepEqual(dropRestricted(items, blocked), [{
         mlsNumber: "W1234567"
      }, {
         favoriteId: 1
      }]);
      assert.deepEqual(dropRestricted(items, []), items);
   });
   it("Should return an empty array when Repliers sends null instead of a list", function () {
      assert.deepEqual(dropRestricted(null, blocked), []);
      assert.deepEqual(dropRestricted(undefined, blocked), []);
   });
});