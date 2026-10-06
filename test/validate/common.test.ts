import assert from "assert";
import { rplMapSchema, rplMapFlexibleSchema } from "../../src/validate/common.js";
const validRing: number[][] = [[-79.38, 43.65], [-79.37, 43.65], [-79.37, 43.66], [-79.38, 43.65]];
const polygon: number[][][] = [validRing];
const polygonWithHole: number[][][] = [validRing, validRing];
const multiPolygon: number[][][][] = [[validRing], [validRing], [validRing]];
const realMultiPolygon: number[][][][] = [[[[-79.56100344657898, 43.89857271083062], [-79.53203558921814, 43.90469523719227], [-79.52130675315857, 43.90720745533315], [-79.51766967773438, 43.907949505638186], [-79.49974179267883, 43.912015158730526], [-79.50017094612122, 43.913723268523995], [-79.48629856109619, 43.913723268523995], [-79.48264002799988, 43.89609878421578], [-79.48138475418091, 43.88716086798604], [-79.48216795921326, 43.88697529149823], [-79.48015093803406, 43.88147732577599], [-79.48655605316162, 43.880232286989155], [-79.48997855186462, 43.87948989123103], [-79.49167370796204, 43.87937389105821], [-79.49306845664978, 43.87913415665207], [-79.49457049369812, 43.87868561872088], [-79.51239109039307, 43.874664093324014], [-79.51352834701538, 43.87434699997047], [-79.51521277427673, 43.87364320137681], [-79.52953577041626, 43.87062682754507], [-79.5389449596405, 43.868778256341045], [-79.5420241355896, 43.86832190567196], [-79.54357981681824, 43.86785781666251], [-79.54548954963684, 43.8667981332128], [-79.55291390419006, 43.86508867713894], [-79.55988764762878, 43.89470715532573], [-79.56100344657898, 43.89857271083062]]], [[[-79.56100344657898, 43.89857271083062], [-79.53203558921814, 43.90469523719227], [-79.52130675315857, 43.90720745533315], [-79.51904296875, 43.90767123785787], [-79.51904296875, 43.872862052546225], [-79.52953577041626, 43.87062682754507], [-79.5389449596405, 43.868778256341045], [-79.5420241355896, 43.86832190567196], [-79.54357981681824, 43.86785781666251], [-79.54548954963684, 43.8667981332128], [-79.55291390419006, 43.86508867713894], [-79.55988764762878, 43.89470715532573], [-79.56100344657898, 43.89857271083062]]], [[[-79.56100344657898, 43.89857271083062], [-79.53203558921814, 43.90469523719227], [-79.52130675315857, 43.90720745533315], [-79.51766967773438, 43.907949505638186], [-79.49974179267883, 43.912015158730526], [-79.50066447257996, 43.91570956079133], [-79.48727488517761, 43.918422249737006], [-79.48264002799988, 43.89609878421578], [-79.48138475418091, 43.88716086798604], [-79.48216795921326, 43.88697529149823], [-79.48036551475525, 43.882057303905356], [-79.55691576004028, 43.882057303905356], [-79.55988764762878, 43.89470715532573], [-79.56100344657898, 43.89857271083062]]], [[[-79.56100344657898, 43.89857271083062], [-79.53203558921814, 43.90469523719227], [-79.52130675315857, 43.90720745533315], [-79.51904296875, 43.90767123785787], [-79.51904296875, 43.882057303905356], [-79.55691576004028, 43.882057303905356], [-79.55988764762878, 43.89470715532573], [-79.56100344657898, 43.89857271083062]]]];
describe("rplMapSchema", function () {
   describe("accepts", function () {
      it("a GeoJSON Polygon (single ring)", function () {
         assert.equal(rplMapSchema.validate(polygon).error, undefined);
      });
      it("a GeoJSON Polygon with holes (multi-ring)", function () {
         assert.equal(rplMapSchema.validate(polygonWithHole).error, undefined);
      });
      it("a GeoJSON MultiPolygon", function () {
         assert.equal(rplMapSchema.validate(multiPolygon).error, undefined);
      });
      it("the real-world MultiPolygon payload from the bug report", function () {
         assert.equal(rplMapSchema.validate(realMultiPolygon).error, undefined);
      });
   });
   describe("rejects", function () {
      it("a string value", function () {
         assert.notEqual(rplMapSchema.validate("not-a-polygon").error, undefined);
      });
      it("a number value", function () {
         assert.notEqual(rplMapSchema.validate(42).error, undefined);
      });
      it("a GeoJSON Geometry object (we only accept bare coordinates)", function () {
         assert.notEqual(rplMapSchema.validate({
            type: "Polygon",
            coordinates: polygon
         }).error, undefined);
      });
      it("an empty array", function () {
         assert.notEqual(rplMapSchema.validate([]).error, undefined);
      });
      it("a ring with fewer than 3 coord pairs", function () {
         assert.notEqual(rplMapSchema.validate([[[-79.38, 43.65], [-79.37, 43.65]]]).error, undefined);
      });
      it("coordinate pairs of wrong length", function () {
         assert.notEqual(rplMapSchema.validate([[[-79.38, 43.65, 0], [-79.37, 43.65, 0], [-79.37, 43.66, 0]]]).error, undefined);
      });
      it("non-numeric coordinates", function () {
         assert.notEqual(rplMapSchema.validate([[["a", "b"], ["c", "d"], ["e", "f"]]]).error, undefined);
      });
      it("a 5-deep array (over-nested)", function () {
         assert.notEqual(rplMapSchema.validate([multiPolygon]).error, undefined);
      });
   });
});
describe("rplMapFlexibleSchema", function () {
   describe("string input (query-param shape)", function () {
      it("accepts a JSON-stringified Polygon", function () {
         assert.equal(rplMapFlexibleSchema.validate(JSON.stringify(polygon)).error, undefined);
      });
      it("accepts a JSON-stringified MultiPolygon", function () {
         assert.equal(rplMapFlexibleSchema.validate(JSON.stringify(multiPolygon)).error, undefined);
      });
      it("accepts the JSON-stringified real-world MultiPolygon payload", function () {
         assert.equal(rplMapFlexibleSchema.validate(JSON.stringify(realMultiPolygon)).error, undefined);
      });
      it("rejects a malformed JSON string", function () {
         assert.notEqual(rplMapFlexibleSchema.validate("{not-json").error, undefined);
      });
      it("rejects a JSON-stringified value with wrong structure", function () {
         assert.notEqual(rplMapFlexibleSchema.validate(JSON.stringify([[[1, 2]]])).error, undefined);
      });
   });
   describe("array input (POST-body shape)", function () {
      it("accepts a Polygon array", function () {
         assert.equal(rplMapFlexibleSchema.validate(polygon).error, undefined);
      });
      it("accepts a MultiPolygon array", function () {
         assert.equal(rplMapFlexibleSchema.validate(multiPolygon).error, undefined);
      });
      it("rejects an empty array", function () {
         assert.notEqual(rplMapFlexibleSchema.validate([]).error, undefined);
      });
   });
});