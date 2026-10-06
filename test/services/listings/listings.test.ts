import assert from "assert";
import { urlToParams } from "../../../src/services/listings.js";
describe("NLP unit tests", function () {
   describe("NLP Request Params processing", function () {
      it("Should parse single param", function () {
         const params = urlToParams("https://api.repliers.io/listings?minBeds=4");
         assert.deepEqual(params, {
            minBeds: "4"
         });
      });
      it("Should parse multiple params", function () {
         const params = urlToParams("https://api.repliers.io/listings?minBeds=4&maxBeds=6");
         assert.deepEqual(params, {
            minBeds: "4",
            maxBeds: "6"
         });
      });
      it("Should parse arrays of params", function () {
         const params = urlToParams("https://api.repliers.io/listings?minBeds=4&maxBeds=6&city=Toronto&city=Ottawa");
         assert.deepEqual(params, {
            minBeds: "4",
            maxBeds: "6",
            city: ["Toronto", "Ottawa"]
         });
      });
   });
});