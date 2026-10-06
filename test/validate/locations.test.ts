import assert from "assert";
import { locationsAutocompleteSchema, locationsGetSchema } from "../../src/validate/locations.js";

// Downtown Austin viewport, the shape the map sends for a parcel layer request
const viewport = "[[[-97.75,30.27],[-97.74,30.27],[-97.74,30.26],[-97.75,30.26],[-97.75,30.27]]]";
describe("locationsGetSchema", function () {
   it("accepts a public-record parcel query", function () {
      const {
         error,
         value
      } = locationsGetSchema.validate({
         source: "PublicRecord",
         type: "property",
         map: viewport,
         resultsPerPage: 300
      });
      assert.equal(error, undefined);
      assert.deepEqual(value.source, ["PublicRecord"]);
      assert.deepEqual(value.type, ["property"]);
   });
   it("rejects an unknown location type", function () {
      const {
         error
      } = locationsGetSchema.validate({
         type: "parcel"
      });
      assert.notEqual(error, undefined);
   });
});
describe("locationsAutocompleteSchema", function () {
   it("accepts a public-record parcel search", function () {
      const {
         error,
         value
      } = locationsAutocompleteSchema.validate({
         search: "317 W 3RD",
         source: "PublicRecord",
         type: "property"
      });
      assert.equal(error, undefined);
      assert.deepEqual(value.type, ["property"]);
   });
});