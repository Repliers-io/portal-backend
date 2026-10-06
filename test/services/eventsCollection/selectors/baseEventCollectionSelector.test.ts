import assert from "assert";
import { container } from "tsyringe";
import BaseEventCollectionSelector from "../../../../src/services/eventsCollection/selectors/baseEventCollectionSelector.js";
import RepliersService from "../../../../src/services/repliers.js";
import RepliersAgents from "../../../../src/services/repliers/agents.js";
import BossService from "../../../../src/services/boss.js";
import type { AppConfig } from "../../../../src/config.js";
import { DummyXFFProvider } from "../../../../src/providers/dummy.xff.js";
describe("BaseEventCollectionSelector", function () {
   let selector: BaseEventCollectionSelector;
   let config: AppConfig;
   let agentsService: RepliersAgents;
   let bossService: BossService;
   let repliersService: RepliersService;
   let originalAgentsGet: RepliersAgents["get"];
   let originalBossGetUsers: BossService["getUsers"];
   let originalListingsSingle: RepliersService["listings"]["single"];
   before(() => {
      container.register("XForwardedFor", {
         useFactory: () => new DummyXFFProvider()
      });
      agentsService = container.resolve(RepliersAgents);
      bossService = container.resolve(BossService);
      repliersService = container.resolve(RepliersService);
      config = container.resolve<AppConfig>("config");
      originalAgentsGet = agentsService.get.bind(agentsService);
      originalBossGetUsers = bossService.getUsers.bind(bossService);
      originalListingsSingle = repliersService.listings.single.bind(repliersService.listings);
      selector = new BaseEventCollectionSelector(repliersService, agentsService, bossService, config);
   });
   afterEach(() => {
      agentsService.get = originalAgentsGet;
      bossService.getUsers = originalBossGetUsers;
      repliersService.listings.single = originalListingsSingle;
   });
   describe("getPerson", function () {
      it("returns person with email set", async function () {
         const result = await selector.getPerson("jane@example.com");
         assert.deepEqual(result.emails, [{
            value: "jane@example.com",
            type: "main"
         }]);
      });
      it("merges defaults into person", async function () {
         const result = await selector.getPerson("jane@example.com", {
            firstName: "Jane",
            lastName: "Smith"
         });
         assert.equal(result.firstName, "Jane");
         assert.equal(result.lastName, "Smith");
         assert.deepEqual(result.emails, [{
            value: "jane@example.com",
            type: "main"
         }]);
      });
      it("returns person with empty defaults when none provided", async function () {
         const result = await selector.getPerson("test@example.com");
         assert.equal(result.firstName, undefined);
         assert.equal(result.lastName, undefined);
      });
   });
   describe("buildPropertyUrl", function () {
      it("replaces MLS_NUMBER and BOARD_ID placeholders", function () {
         const original = config.eventsCollection.propertyUrl;
         config.eventsCollection.propertyUrl = "https://example.tld/listing/[MLS_NUMBER]?boardId=[BOARD_ID]";
         const result = selector.buildPropertyUrl("W1234567", 2);
         assert.equal(result, "https://example.tld/listing/W1234567?boardId=2");
         config.eventsCollection.propertyUrl = original;
      });
      it("removes boardId param when boardId is not provided", function () {
         const original = config.eventsCollection.propertyUrl;
         config.eventsCollection.propertyUrl = "https://example.tld/listing/[MLS_NUMBER]?boardId=[BOARD_ID]";
         const result = selector.buildPropertyUrl("W1234567");
         assert.equal(result, "https://example.tld/listing/W1234567?");
         config.eventsCollection.propertyUrl = original;
      });
      it("handles numeric mlsNumber", function () {
         const original = config.eventsCollection.propertyUrl;
         config.eventsCollection.propertyUrl = "https://example.tld/listing/[MLS_NUMBER]?boardId=[BOARD_ID]";
         const result = selector.buildPropertyUrl(12345, 90);
         assert.equal(result, "https://example.tld/listing/12345?boardId=90");
         config.eventsCollection.propertyUrl = original;
      });
   });
   describe("addressShort", function () {
      it("formats full address with unit number", function () {
         const result = selector.addressShort({
            streetNumber: "100",
            streetName: "QUEEN STREET",
            streetSuffix: "W",
            unitNumber: "2501"
         });
         assert.equal(result, "#2501 - 100 Queen Street W");
      });
      it("formats address without unit number", function () {
         const result = selector.addressShort({
            streetNumber: "100",
            streetName: "QUEEN STREET",
            streetSuffix: "W",
            unitNumber: ""
         });
         assert.equal(result, "100 Queen Street W");
      });
      it("omits street number when it is 00", function () {
         const result = selector.addressShort({
            streetNumber: "00",
            streetName: "QUEEN STREET",
            streetSuffix: "W",
            unitNumber: ""
         });
         assert.equal(result, "Queen Street W");
      });
      it("omits street number when it is 0", function () {
         const result = selector.addressShort({
            streetNumber: "0",
            streetName: "QUEEN STREET",
            streetSuffix: "W",
            unitNumber: ""
         });
         assert.equal(result, "Queen Street W");
      });
      it("does not throw on null street parts (commercial listing S6243706)", function () {
         const result = selector.addressShort({
            streetNumber: null,
            streetName: null,
            streetSuffix: null,
            unitNumber: null
         });
         assert.equal(result, "");
      });
      it("does not throw on missing address", function () {
         assert.equal(selector.addressShort(undefined as never), "");
      });
   });
   describe("sanitizedStreetNumber", function () {
      it("returns street number as-is for normal values", function () {
         assert.equal(selector.sanitizedStreetNumber("100"), "100");
      });
      it("returns empty string for 00", function () {
         assert.equal(selector.sanitizedStreetNumber("00"), "");
      });
      it("returns empty string for 0", function () {
         assert.equal(selector.sanitizedStreetNumber("0"), "");
      });
      it("returns empty string for empty input", function () {
         assert.equal(selector.sanitizedStreetNumber(""), "");
      });
   });
   describe("capitalize", function () {
      it("capitalizes first letter of each word", function () {
         assert.equal(selector.capitalize("QUEEN STREET"), "Queen Street");
      });
      it("handles lowercase input", function () {
         assert.equal(selector.capitalize("queen street"), "Queen Street");
      });
      it("handles single word", function () {
         assert.equal(selector.capitalize("toronto"), "Toronto");
      });
      it("handles mixed case", function () {
         assert.equal(selector.capitalize("qUeEn sTrEeT"), "Queen Street");
      });
   });
   describe("mapRplPropertyToBoss", function () {
      it("maps listing fields to boss property format", function () {
         const listing = {
            mlsNumber: "W1234567",
            listPrice: "750000",
            type: "Sale",
            address: {
               streetNumber: "100",
               streetName: "QUEEN STREET",
               streetSuffix: "W",
               unitNumber: "2501",
               city: "Toronto",
               state: "Ontario",
               zip: "M5H 2N2"
            },
            details: {
               numBedrooms: "3",
               numBathrooms: "2"
            }
         };
         const result = selector.mapRplPropertyToBoss(listing as never);
         assert.equal(result.mlsNumber, "W1234567");
         assert.equal(result.price, 750000);
         assert.equal(result.city, "Toronto");
         assert.equal(result.state, "Ontario");
         assert.equal(result.code, "M5H 2N2");
         assert.equal(result.street, "#2501 - 100 Queen Street W");
         assert.equal(result.forRent, false);
         assert.equal(result.type, "Sale");
         assert.equal(result.bedrooms, "3");
         assert.equal(result.bathrooms, "2");
      });
      it("sets forRent to true for lease type", function () {
         const listing = {
            mlsNumber: "W1234567",
            listPrice: "3000",
            type: "Lease",
            address: {
               streetNumber: "1",
               streetName: "MAIN",
               streetSuffix: "St",
               unitNumber: ""
            },
            details: {
               numBedrooms: "1",
               numBathrooms: "1"
            }
         };
         const result = selector.mapRplPropertyToBoss(listing as never);
         assert.equal(result.forRent, true);
      });
   });
   describe("mapRplPropertySearchToBoss", function () {
      it("maps search DTO to boss property search format", function () {
         const search = {
            class: ["residential", "condo"],
            neighborhoods: "Yorkville",
            cities: ["Toronto", "Mississauga"],
            areas: ["GTA"],
            minPrice: 500000,
            maxPrice: 1000000,
            minBeds: 2,
            maxBeds: 4,
            minBaths: 1,
            maxBaths: 3
         };
         const result = selector.mapRplPropertySearchToBoss(search as never);
         assert.equal(result.type, "residential,condo");
         assert.equal(result.neighborhood, "Yorkville");
         assert.equal(result.city, "Toronto,Mississauga");
         assert.equal(result.state, "GTA");
         assert.equal(result.minPrice, 500000);
         assert.equal(result.maxPrice, 1000000);
         assert.equal(result.minBedrooms, 2);
         assert.equal(result.maxBedrooms, 4);
         assert.equal(result.minBathrooms, 1);
         assert.equal(result.maxBathrooms, 3);
      });
      it("falls back to minBedrooms/maxBedrooms when minBeds/maxBeds not set", function () {
         const search = {
            class: ["condo"],
            minBedrooms: 1,
            maxBedrooms: 3,
            minBathrooms: 1,
            maxBathrooms: 2
         };
         const result = selector.mapRplPropertySearchToBoss(search as never);
         assert.equal(result.minBedrooms, 1);
         assert.equal(result.maxBedrooms, 3);
         assert.equal(result.minBathrooms, 1);
         assert.equal(result.maxBathrooms, 2);
      });
   });
   describe("getSellIntentionTag", function () {
      it("returns Sell ASAP for asap timeline", function () {
         const estimate = {
            data: {
               salesIntentions: {
                  sellingTimeline: "asap"
               }
            }
         };
         assert.deepEqual(selector.getSellIntentionTag(estimate as never), ["Sell ASAP"]);
      });
      it("returns Sell in 1-3 Months for 3months", function () {
         const estimate = {
            data: {
               salesIntentions: {
                  sellingTimeline: "3months"
               }
            }
         };
         assert.deepEqual(selector.getSellIntentionTag(estimate as never), ["Sell in 1-3 Months"]);
      });
      it("returns Sell in 3-6 Months for 6months", function () {
         const estimate = {
            data: {
               salesIntentions: {
                  sellingTimeline: "6months"
               }
            }
         };
         assert.deepEqual(selector.getSellIntentionTag(estimate as never), ["Sell in 3-6 Months"]);
      });
      it("returns Sell in 6-12 Months for 12months", function () {
         const estimate = {
            data: {
               salesIntentions: {
                  sellingTimeline: "12months"
               }
            }
         };
         assert.deepEqual(selector.getSellIntentionTag(estimate as never), ["Sell in 6-12 Months"]);
      });
      it("returns Sell just Curious for other", function () {
         const estimate = {
            data: {
               salesIntentions: {
                  sellingTimeline: "other"
               }
            }
         };
         assert.deepEqual(selector.getSellIntentionTag(estimate as never), ["Sell just Curious"]);
      });
      it("returns empty array for unknown timeline", function () {
         const estimate = {
            data: {
               salesIntentions: {
                  sellingTimeline: "unknown"
               }
            }
         };
         assert.deepEqual(selector.getSellIntentionTag(estimate as never), []);
      });
      it("returns empty array when salesIntentions is missing", function () {
         const estimate = {
            data: {}
         };
         assert.deepEqual(selector.getSellIntentionTag(estimate as never), []);
      });
   });
   describe("getEstimateUrl", function () {
      it("builds URL using estimateId when template has ESTIMATE_ID", function () {
         const original = config.eventsCollection.estimateUrl;
         config.eventsCollection.estimateUrl = "https://example.tld/estimate/[ESTIMATE_ID]";
         const result = selector.getEstimateUrl({
            estimate: {},
            estimateId: 42
         });
         assert.equal(result, "https://example.tld/estimate/42");
         config.eventsCollection.estimateUrl = original;
      });
      it("builds URL using ulid when template has ULID", function () {
         const original = config.eventsCollection.estimateUrl;
         config.eventsCollection.estimateUrl = "https://example.tld/estimate/[ULID]";
         const result = selector.getEstimateUrl({
            estimate: {},
            ulid: "01ABC123"
         });
         assert.equal(result, "https://example.tld/estimate/01ABC123");
         config.eventsCollection.estimateUrl = original;
      });
      it("returns null when body is not an estimate model", function () {
         assert.equal(selector.getEstimateUrl({}), null);
         assert.equal(selector.getEstimateUrl(null), null);
         assert.equal(selector.getEstimateUrl("string"), null);
      });
   });
   describe("isEstimateModel", function () {
      it("returns true when body has estimate property", function () {
         assert.equal(selector.isEstimateModel({
            estimate: {}
         }), true);
      });
      it("returns false for null", function () {
         assert.equal(selector.isEstimateModel(null), false);
      });
      it("returns false for non-object", function () {
         assert.equal(selector.isEstimateModel("string"), false);
      });
      it("returns false for object without estimate", function () {
         assert.equal(selector.isEstimateModel({
            other: 1
         }), false);
      });
   });
   describe("stringifyIfSet", function () {
      it("converts number to string", function () {
         assert.equal(selector.stringifyIfSet(42), "42");
      });
      it("returns string as-is", function () {
         assert.equal(selector.stringifyIfSet("hello"), "hello");
      });
      it("returns undefined for undefined", function () {
         assert.equal(selector.stringifyIfSet(undefined), undefined);
      });
      it("returns undefined for null", function () {
         assert.equal(selector.stringifyIfSet(null), undefined);
      });
   });
   describe("formatPrice", function () {
      it("formats price in compact USD", function () {
         assert.equal(selector.formatPrice(750000), "$750K");
      });
      it("formats million-range price", function () {
         assert.equal(selector.formatPrice(1500000), "$1.5M");
      });
      it("returns unknown price for undefined", function () {
         assert.equal(selector.formatPrice(undefined), "unknown price");
      });
      it("returns unknown price for NaN", function () {
         assert.equal(selector.formatPrice(NaN), "unknown price");
      });
   });
   describe("getAgent", function () {
      it("returns assignedUserId from agent externalId", async function () {
         agentsService.get = async () => ({
            agentId: 1,
            fname: "Jane",
            lname: "Smith",
            externalId: "555",
            phone: "",
            email: "",
            proxyPhone: "",
            proxyEmail: "",
            avatar: null,
            brokerage: "",
            designation: "",
            location: null,
            status: true,
            data: null
         });
         const result = await selector.getAgent(1);
         assert.deepEqual(result, {
            assignedUserId: 555
         });
      });
      it("looks up boss user by name when agent has no externalId", async function () {
         agentsService.get = async () => ({
            agentId: 1,
            fname: "Jane",
            lname: "Smith",
            externalId: null,
            phone: "",
            email: "",
            proxyPhone: "",
            proxyEmail: "",
            avatar: null,
            brokerage: "",
            designation: "",
            location: null,
            status: true,
            data: null
         });
         bossService.getUsers = async () => ({
            users: [{
               id: 42,
               created: "",
               updated: "",
               name: "Jane Smith",
               firstName: "Jane",
               lastName: "Smith",
               email: "",
               phone: "",
               role: ""
            }]
         }) as Awaited<ReturnType<BossService["getUsers"]>>;
         const result = await selector.getAgent(1);
         assert.deepEqual(result, {
            assignedUserId: 42
         });
      });
      it("returns empty object when agent has no externalId and boss user not found", async function () {
         agentsService.get = async () => ({
            agentId: 1,
            fname: "Jane",
            lname: "Smith",
            externalId: null,
            phone: "",
            email: "",
            proxyPhone: "",
            proxyEmail: "",
            avatar: null,
            brokerage: "",
            designation: "",
            location: null,
            status: true,
            data: null
         });
         bossService.getUsers = async () => ({
            users: []
         }) as unknown as Awaited<ReturnType<BossService["getUsers"]>>;
         const result = await selector.getAgent(1);
         assert.deepEqual(result, {});
      });
      it("constructs agent name from fname and lname for boss lookup", async function () {
         let capturedName: string | undefined;
         agentsService.get = async () => ({
            agentId: 1,
            fname: "John",
            lname: "Doe",
            externalId: null,
            phone: "",
            email: "",
            proxyPhone: "",
            proxyEmail: "",
            avatar: null,
            brokerage: "",
            designation: "",
            location: null,
            status: true,
            data: null
         });
         bossService.getUsers = async params => {
            capturedName = params.name;
            return {
               users: []
            } as unknown as Awaited<ReturnType<BossService["getUsers"]>>;
         };
         await selector.getAgent(1);
         assert.equal(capturedName, "John Doe");
      });
   });
   describe("getProperty", function () {
      const listingFixture = {
         mlsNumber: "W1234567",
         listPrice: "750000",
         type: "Sale",
         address: {
            streetNumber: "100",
            streetName: "QUEEN STREET",
            streetSuffix: "W",
            unitNumber: "2501",
            city: "Toronto",
            state: "Ontario",
            zip: "M5H 2N2"
         },
         details: {
            numBedrooms: "3",
            numBathrooms: "2"
         }
      };
      it("returns mapped property when listing is found", async function () {
         repliersService.listings.single = async () => listingFixture as never;
         const result = await selector.getProperty("W1234567", 2);
         assert.equal(result.mlsNumber, "W1234567");
         assert.equal(result.street, "#2501 - 100 Queen Street W");
         assert.equal(result.city, "Toronto");
         assert.equal(result.price, 750000);
         assert.ok(result.url);
      });
      it("includes url built from config propertyUrl", async function () {
         const original = config.eventsCollection.propertyUrl;
         config.eventsCollection.propertyUrl = "https://example.tld/listing/[MLS_NUMBER]?boardId=[BOARD_ID]";
         repliersService.listings.single = async () => listingFixture as never;
         const result = await selector.getProperty("W1234567", 2);
         assert.equal(result.url, "https://example.tld/listing/W1234567?boardId=2");
         config.eventsCollection.propertyUrl = original;
      });
      it("returns defaults when listings.single throws", async function () {
         repliersService.listings.single = async () => {
            throw new Error("API error");
         };
         const result = await selector.getProperty("W1234567", 2);
         assert.equal(result.mlsNumber, "W1234567");
         assert.ok(result.url);
         assert.equal(result.city, undefined);
         assert.equal(result.price, undefined);
      });
      it("uses defaultBoardId from config when boardId is not provided", async function () {
         let capturedParams: unknown;
         repliersService.listings.single = async params => {
            capturedParams = params;
            return listingFixture as never;
         };
         const original = config.eventsCollection.defaultBoardId;
         config.eventsCollection.defaultBoardId = "110";
         await selector.getProperty("W1234567");
         assert.ok(capturedParams);
         assert.equal((capturedParams as Record<string, unknown>).boardId, "110");
         config.eventsCollection.defaultBoardId = original;
      });
      it("returns defaults when validation fails", async function () {
         let singleCalled = false;
         repliersService.listings.single = async () => {
            singleCalled = true;
            return listingFixture as never;
         };

         // empty mlsNumber should fail Joi validation
         const result = await selector.getProperty("");
         assert.equal(singleCalled, false);
         assert.equal(result.mlsNumber, "");
         assert.ok("url" in result);
      });
   });
});