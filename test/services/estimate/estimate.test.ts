import assert from "node:assert";
import supertest from "supertest";
import TestAgent from "supertest/lib/agent.js";
import app from "../../../src/app.js";
import { mockBossEvents } from "../../mocks/boss/boss.js";
import { estimateBounds, ownerAdjustedEstimates } from "../../../src/services/estimate.js";
import { mockAverageTax, mockClientEstimatesGet, mockDynamicPropertyDetails, mockEmptyAddressLookup, mockEmptyPropertyDetails, mockFailedAddressLookup, mockSameParityAddressLookup, mockTaxStats } from "../../mocks/repliers/estimatesDetails.js";
import { generateAuthToken } from "../../mocks/auth.js";
describe("Estimates tests", function () {
   describe("Owner Adjusted Estimates tests", function () {
      describe("estimateBounds", function () {
         it("Correct Bounds", function () {
            assert.deepEqual(estimateBounds(1000, 0.1), {
               estimateLow: 900,
               estimateHigh: 1100
            });
         });
      });
      describe("ownerAdjustedEstimate", function () {
         it("Correct Bounds with no History", function () {
            assert.deepEqual(ownerAdjustedEstimates(1000, 0.1, undefined), {
               estimate: 1000,
               estimateLow: 900,
               estimateHigh: 1100
            });
         });
         it("Correct Bounds with no History", function () {
            assert.deepEqual(ownerAdjustedEstimates(1000, 0.1, {
               improvements: {
                  maintenanceSpent: 100,
                  improvementSpent: 100,
                  landscapingSpent: 100
               }
            }), {
               estimate: 1210,
               estimateHigh: 1331,
               estimateLow: 1089
            });
         });
         it("Correct Bounds with partial History", function () {
            assert.deepEqual(ownerAdjustedEstimates(1000, 0.1, {
               improvements: {
                  maintenanceSpent: 100
               }
            }), {
               estimate: 1060,
               estimateHigh: 1166,
               estimateLow: 954
            });
         });
      });
   });
   describe("propertyDetails", function () {
      let appInstance: TestAgent;
      let GlobalDate = Date;
      const mockDate = (mock: Date) => {
         global.Date = class extends Date {
            constructor(...args: any[]) {
               super();
               if (args.length === 0) {
                  return mock;
               }
               return new GlobalDate(...(args as [number, number, number]));
            }
         } as DateConstructor;
      };
      before(done => {
         appInstance = supertest(app.callback());
         done();
      });
      beforeEach(done => {
         mockBossEvents();
         global.Date = GlobalDate;
         done();
      });
      describe("hood lookup", function () {
         it("Should return only city and tax details when no history as well as closest listings", async function () {
            mockDate(new Date(2024, 6, 1));
            mockEmptyPropertyDetails();
            mockEmptyAddressLookup();
            mockAverageTax();
            const propertyDetailsResponse = await appInstance.get("/api/estimate/property_details?city=Toronto&streetName=Yonge&streetNumber=150&unitNumber=1");
            assert.deepEqual(propertyDetailsResponse.body, {
               address: {
                  city: "Toronto"
               },
               taxes: {
                  annualAmount: 1000,
                  assessmentYear: 2024
               }
            });
            assert.equal(propertyDetailsResponse.status, 200);
         });
         it("Should return closest listing's neighborhood and taxes when no history", async function () {
            mockDate(new Date(2025, 5, 30));
            mockEmptyPropertyDetails();
            mockSameParityAddressLookup();
            mockAverageTax();
            const propertyDetailsResponse = await appInstance.get("/api/estimate/property_details?city=Toronto&streetName=Yonge&streetNumber=150&unitNumber=1");
            assert.deepEqual(propertyDetailsResponse.body, {
               address: {
                  city: "Toronto",
                  neighborhood: "154"
               },
               taxes: {
                  annualAmount: 1000,
                  assessmentYear: 2024
               }
            });
            assert.equal(propertyDetailsResponse.status, 200);
         });
         it("Should return just city when address lookup throws", async function () {
            mockDate(new Date(2025, 0, 1));
            mockEmptyPropertyDetails();
            mockFailedAddressLookup();
            mockAverageTax();
            const propertyDetailsResponse = await appInstance.get("/api/estimate/property_details?city=Toronto&streetName=Yonge&streetNumber=150&unitNumber=1");
            assert.deepEqual(propertyDetailsResponse.body, {
               address: {
                  city: "Toronto"
               },
               taxes: {
                  annualAmount: 1000,
                  assessmentYear: 2024
               }
            });
            assert.equal(propertyDetailsResponse.status, 200);
         });
         it("Should still return address when average tax response failed", async function () {
            this.slow(1000);
            mockEmptyPropertyDetails();
            mockSameParityAddressLookup();
            mockAverageTax(500, {
               message: "Internal Server Error"
            });
            const propertyDetailsResponse = await appInstance.get("/api/estimate/property_details?city=Toronto&streetName=Yonge&streetNumber=150&unitNumber=1");
            assert.deepEqual(propertyDetailsResponse.body, {
               address: {
                  city: "Toronto",
                  neighborhood: "154"
               }
            });
            assert.equal(propertyDetailsResponse.status, 200);
         });
      });
      describe("validation", function () {
         it("Should return 400 when city is missing", async function () {
            const res = await appInstance.get("/api/estimate/property_details?streetName=Yonge&streetNumber=150");
            assert.equal(res.status, 400);
         });
         it("Should return 400 when streetName is missing", async function () {
            const res = await appInstance.get("/api/estimate/property_details?city=Toronto&streetNumber=150");
            assert.equal(res.status, 400);
         });
         it("Should return 400 when streetNumber is missing", async function () {
            const res = await appInstance.get("/api/estimate/property_details?city=Toronto&streetName=Yonge");
            assert.equal(res.status, 400);
         });
      });
      describe("successful listing lookup", function () {
         it("Should return listing when found by address", async function () {
            mockDate(new Date(2025, 5, 30));
            const listing = {
               class: "residential",
               address: {
                  city: "FoundCity",
                  streetName: "Main",
                  streetNumber: "100"
               },
               images: ["https://img.example.com/1.jpg"],
               listDate: "2025-06-01T00:00:00.000Z",
               updatedOn: "2025-06-15T00:00:00.000Z",
               details: {
                  propertyType: "Detached",
                  numBedrooms: 3,
                  numBathrooms: 2,
                  sqft: "1500"
               },
               lot: {
                  depth: "100",
                  width: "50"
               },
               taxes: {
                  annualAmount: 5000,
                  assessmentYear: 2025
               },
               condominium: {}
            };
            mockDynamicPropertyDetails(query => query.city === "FoundCity", [listing]);
            const res = await appInstance.get("/api/estimate/property_details?city=FoundCity&streetName=Main&streetNumber=100");
            assert.equal(res.status, 200);
            assert.equal(res.body.address.city, "FoundCity");
            assert.equal(res.body.details.numBedrooms, 3);
            assert.equal(res.body.taxes.annualAmount, 5000);
         });
         it("Should forward optional address fields", async function () {
            mockDate(new Date(2025, 5, 30));
            const listing = {
               class: "residential",
               address: {
                  city: "OptCity",
                  streetName: "Oak",
                  streetNumber: "200",
                  streetSuffix: "St",
                  streetDirection: "W",
                  zip: "M5V1A1"
               },
               images: [],
               listDate: "2025-06-01T00:00:00.000Z",
               updatedOn: "2025-06-15T00:00:00.000Z",
               details: {
                  propertyType: "Detached",
                  numBedrooms: 2,
                  numBathrooms: 1
               },
               lot: {},
               taxes: {
                  annualAmount: 3000,
                  assessmentYear: 2025
               },
               condominium: {}
            };
            mockDynamicPropertyDetails(query => query.city === "OptCity" && query.streetSuffix === "St" && query.streetDirection === "W" && query.zip === "M5V1A1", [listing]);
            const res = await appInstance.get("/api/estimate/property_details?city=OptCity&streetName=Oak&streetNumber=200&streetSuffix=St&streetDirection=W&zip=M5V1A1");
            assert.equal(res.status, 200);
            assert.equal(res.body.address.streetSuffix, "St");
            assert.equal(res.body.address.streetDirection, "W");
            assert.equal(res.body.address.zip, "M5V1A1");
         });
      });
      describe("authenticated user with client estimates", function () {
         it("Should merge estimate data when similarity >= 0.9", async function () {
            mockDate(new Date(2025, 5, 30));
            const listing = {
               class: "residential",
               address: {
                  city: "MergeCity",
                  streetName: "Elm",
                  streetNumber: "300",
                  zip: "M5V2B2"
               },
               images: [],
               listDate: "2025-06-01T00:00:00.000Z",
               updatedOn: "2025-06-15T00:00:00.000Z",
               details: {
                  propertyType: "Detached",
                  numBedrooms: 4
               },
               lot: {},
               taxes: {
                  annualAmount: 6000,
                  assessmentYear: 2025
               },
               condominium: {}
            };
            mockDynamicPropertyDetails(query => query.city === "MergeCity", [listing]);
            const estimateData = {
               purchasePrice: 800000,
               purchaseDate: "2020-01-01",
               improvements: {
                  maintenanceSpent: 5000
               }
            };
            mockClientEstimatesGet(999, [{
               payload: {
                  address: {
                     city: "MergeCity",
                     streetName: "Elm",
                     streetNumber: "300",
                     unitNumber: "5",
                     zip: "M5V2B2"
                  },
                  data: estimateData
               }
            }]);
            const token = generateAuthToken({
               email: "merge@test.com",
               sub: "999"
            });
            const res = await appInstance.get("/api/estimate/property_details?city=MergeCity&streetName=Elm&streetNumber=300&unitNumber=5&zip=M5V2B2").set("Authorization", `Bearer ${token}`);
            assert.equal(res.status, 200);
            assert.equal(res.body.data.purchasePrice, 800000);
            assert.ok(res.body.similarity >= 0.9);
         });
         it("Should not merge estimate data when similarity < 0.9", async function () {
            mockDate(new Date(2025, 5, 30));
            const listing = {
               class: "residential",
               address: {
                  city: "NoMergeCity",
                  streetName: "Pine",
                  streetNumber: "400"
               },
               images: [],
               listDate: "2025-06-01T00:00:00.000Z",
               updatedOn: "2025-06-15T00:00:00.000Z",
               details: {
                  propertyType: "Detached",
                  numBedrooms: 2
               },
               lot: {},
               taxes: {
                  annualAmount: 4000,
                  assessmentYear: 2025
               },
               condominium: {}
            };
            mockDynamicPropertyDetails(query => query.city === "NoMergeCity", [listing]);
            mockClientEstimatesGet(998, [{
               payload: {
                  address: {
                     city: "TotallyDifferent",
                     streetName: "Other",
                     streetNumber: "999",
                     zip: "X0X0X0"
                  },
                  data: {
                     purchasePrice: 500000
                  }
               }
            }]);
            const token = generateAuthToken({
               email: "nomerge@test.com",
               sub: "998"
            });
            const res = await appInstance.get("/api/estimate/property_details?city=NoMergeCity&streetName=Pine&streetNumber=400").set("Authorization", `Bearer ${token}`);
            assert.equal(res.status, 200);
            assert.equal(res.body.data, undefined);
            assert.equal(res.body.similarity, undefined);
         });
      });
      describe("searchStrategy - streetSuffixInStreetName", function () {
         it("Should find listing when streetSuffix is inside streetName", async function () {
            mockDate(new Date(2025, 5, 30));
            const listing = {
               class: "residential",
               address: {
                  city: "Tacoma",
                  streetName: "99th Ave",
                  streetNumber: "1234",
                  zip: "98406"
               },
               images: [],
               listDate: "2025-06-01T00:00:00.000Z",
               updatedOn: "2025-06-15T00:00:00.000Z",
               details: {
                  propertyType: "Detached",
                  numBedrooms: 3
               },
               lot: {},
               taxes: {
                  annualAmount: 3000,
                  assessmentYear: 2025
               },
               condominium: {}
            };
            mockDynamicPropertyDetails(query => query.city === "Tacoma" && (query.streetName as string).includes("99th Ave"), [listing]);
            const res = await appInstance.get("/api/estimate/property_details?city=Tacoma&streetName=99th&streetNumber=1234&streetSuffix=Ave&searchStrategy=streetSuffixInStreetName");
            assert.equal(res.status, 200);
            assert.equal(res.body.address.streetName, "99th Ave");
            assert.equal(res.body.address.city, "Tacoma");
         });
         it("Should find listing normally when streetName has no embedded suffix", async function () {
            mockDate(new Date(2025, 5, 30));
            const listing = {
               class: "residential",
               address: {
                  city: "Seattle",
                  streetName: "Mockingbird",
                  streetNumber: "7777",
                  streetSuffix: "Place",
                  streetDirection: "S",
                  zip: "98144"
               },
               images: [],
               listDate: "2025-06-01T00:00:00.000Z",
               updatedOn: "2025-06-15T00:00:00.000Z",
               details: {
                  propertyType: "Detached",
                  numBedrooms: 4
               },
               lot: {},
               taxes: {
                  annualAmount: 5500,
                  assessmentYear: 2025
               },
               condominium: {}
            };
            mockDynamicPropertyDetails(query => query.city === "Seattle" && (query.streetName as string).includes("Mockingbird"), [listing]);
            const res = await appInstance.get("/api/estimate/property_details?city=Seattle&streetName=Mockingbird&streetNumber=7777&streetSuffix=Place&streetDirection=S&searchStrategy=streetSuffixInStreetName");
            assert.equal(res.status, 200);
            assert.equal(res.body.address.streetName, "Mockingbird");
            assert.equal(res.body.address.city, "Seattle");
         });
         it("Should not pass streetSuffix in Repliers params when strategy is set", async function () {
            mockDate(new Date(2025, 5, 30));
            const listing = {
               class: "residential",
               address: {
                  city: "SuffixCheck",
                  streetName: "10th St",
                  streetNumber: "100"
               },
               images: [],
               listDate: "2025-06-01T00:00:00.000Z",
               updatedOn: "2025-06-15T00:00:00.000Z",
               details: {
                  propertyType: "Detached",
                  numBedrooms: 2
               },
               lot: {},
               taxes: {
                  annualAmount: 2000,
                  assessmentYear: 2025
               },
               condominium: {}
            };
            mockDynamicPropertyDetails(query => query.city === "SuffixCheck" && query.streetSuffix === undefined, [listing]);
            const res = await appInstance.get("/api/estimate/property_details?city=SuffixCheck&streetName=10th&streetNumber=100&streetSuffix=St&searchStrategy=streetSuffixInStreetName");
            assert.equal(res.status, 200);
            assert.equal(res.body.address.city, "SuffixCheck");
         });
         it("Should not alter search when searchStrategy is not set", async function () {
            mockDate(new Date(2025, 5, 30));
            const listing = {
               class: "residential",
               address: {
                  city: "NoStrategy",
                  streetName: "Maple",
                  streetNumber: "500",
                  streetSuffix: "Dr"
               },
               images: [],
               listDate: "2025-06-01T00:00:00.000Z",
               updatedOn: "2025-06-15T00:00:00.000Z",
               details: {
                  propertyType: "Detached",
                  numBedrooms: 3
               },
               lot: {},
               taxes: {
                  annualAmount: 4500,
                  assessmentYear: 2025
               },
               condominium: {}
            };
            mockDynamicPropertyDetails(query => query.city === "NoStrategy" && query.streetSuffix === "Dr" && query.streetName === "Maple", [listing]);
            const res = await appInstance.get("/api/estimate/property_details?city=NoStrategy&streetName=Maple&streetNumber=500&streetSuffix=Dr");
            assert.equal(res.status, 200);
            assert.equal(res.body.address.streetSuffix, "Dr");
         });
      });
      describe("tax adjustment", function () {
         it("Should adjust property tax if old data", async function () {
            mockDate(new Date(2025, 5, 30));
            mockDynamicPropertyDetails(queryObject => queryObject.city === "TaxAdjust", [{
               address: {
                  city: "Toronto"
               },
               taxes: {
                  annualAmount: 100
               },
               updatedOn: "2020-01-17T18:38:41.000-00:00"
            }]);
            mockTaxStats({
               "2020": {
                  avg: 50,
                  count: 52
               },
               "2021": {
                  avg: 0,
                  count: 0
               },
               "2022": {
                  avg: 4007,
                  count: 4272
               },
               "2023": {
                  avg: 4120,
                  count: 15046
               },
               "2024": {
                  avg: 200,
                  // this value should be used givin 4x multiplier
                  count: 19681
               },
               "2025": {
                  avg: 4300,
                  count: 1633
               }
            });
            const propertyDetailsResponse = await appInstance.get("/api/estimate/property_details?city=TaxAdjust&streetName=whatever&streetNumber=whocares");
            assert.equal(propertyDetailsResponse.body.taxes.annualAmount, 400);
            assert.equal(propertyDetailsResponse.status, 200);
         });
         it("Should not adjust property tax if recent data", async function () {
            mockDynamicPropertyDetails(query => query.city === "RecentTax", [{
               address: {
                  city: "Toronto"
               },
               taxes: {
                  annualAmount: 5000
               },
               updatedOn: "2027-01-17T18:38:41.000-00:00" // date is mocked to the first half of 2028 so 2027 would be current tax year
            }]);
            mockDate(new Date(2028, 0, 23));
            const propertyDetailsResponse = await appInstance.get("/api/estimate/property_details?city=RecentTax&streetName=whatever&streetNumber=whocares");
            assert.equal(propertyDetailsResponse.body.taxes.annualAmount, 5000);
            assert.equal(propertyDetailsResponse.status, 200);
         });
         it("Should not adjust property tax if stats missing", async function () {
            mockDynamicPropertyDetails(query => query.city === "NoStats", [{
               address: {
                  city: "Toronto"
               },
               taxes: {
                  annualAmount: "as is"
               },
               updatedOn: "2020-01-17T18:38:41.000-00:00"
            }]);
            mockTaxStats({
               "2024": {
                  med: 200,
                  count: 19681
               },
               "2025": {
                  med: 4300,
                  count: 1633
               }
            });
            const propertyDetailsResponse = await appInstance.get("/api/estimate/property_details?city=NoStats&streetName=whatever&streetNumber=whocares");
            assert.equal(propertyDetailsResponse.body.taxes.annualAmount, "as is");
            assert.equal(propertyDetailsResponse.status, 200);
         });
         it("Should return current year med tax if no tax in history", async function () {
            this.slow(1000);
            mockDate(new Date(2025, 5, 23));
            mockDynamicPropertyDetails(query => query.city === "NoTax", [{
               address: {
                  city: "Toronto"
               },
               taxes: {
                  annualAmount: 0
               },
               updatedOn: "2020-01-17T18:38:41.000-00:00"
            }]);
            mockTaxStats({
               "2024": {
                  avg: 9999,
                  count: 19681
               },
               "2025": {
                  avg: 4300,
                  count: 1633
               }
            });
            const propertyDetailsResponse = await appInstance.get("/api/estimate/property_details?city=NoTax&streetName=whatever&streetNumber=whocares");
            assert.equal(propertyDetailsResponse.body.taxes.annualAmount, 9999);
            assert.equal(propertyDetailsResponse.status, 200);
         });
      });
   });
});