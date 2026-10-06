import assert from "assert";
import { container } from "tsyringe";
import SelectAgentEstimateParams from "../../../../src/services/eventsCollection/selectors/selectAgentEstimateParams.js";
import RepliersService from "../../../../src/services/repliers.js";
import RepliersAgents from "../../../../src/services/repliers/agents.js";
import BossService from "../../../../src/services/boss.js";
import UserService from "../../../../src/services/user.js";
import type { AppConfig } from "../../../../src/config.js";
import type { RplAgentsAgent } from "../../../../src/services/repliers/agents.js";
import { DummyXFFProvider } from "../../../../src/providers/dummy.xff.js";
import type { Context } from "koa";
const agentFixture: RplAgentsAgent = {
   agentId: 10,
   fname: "Agent",
   lname: "Smith",
   phone: "5551234567",
   email: "agent@example.com",
   proxyPhone: "",
   proxyEmail: "",
   avatar: null,
   brokerage: "",
   designation: "",
   location: null,
   externalId: "777",
   status: true,
   data: null
};
const clientFixture = {
   clientId: 42,
   agentId: 10,
   fname: "Jane",
   lname: "Doe",
   email: "jane@example.com",
   phone: "5559876543",
   proxyEmail: "",
   status: true,
   lastActivity: null,
   tags: "",
   expiryDate: null,
   preferences: {
      email: true,
      sms: false,
      unsubscribe: false,
      whatsapp: false
   },
   createdOn: "2024-01-01",
   externalId: null,
   data: {},
   communities: []
};
const validBody = {
   boardId: 2,
   address: {
      city: "Toronto",
      streetName: "Queen",
      streetNumber: "100",
      streetSuffix: "St",
      zip: "M5H 2N2"
   },
   details: {
      numBedrooms: 3,
      numBathrooms: 2,
      propertyType: "Detached",
      sqft: 2000,
      style: "2-Storey"
   }
};
const makeCtx = (body: Record<string, unknown> = {}, overrides: Record<string, unknown> = {}): Context => ({
   request: {
      body,
      headers: {
         referer: "https://example.com"
      }
   },
   response: {
      body: null
   },
   params: {
      clientId: 42
   },
   state: {
      user: {
         sub: 10,
         email: "agent@example.com"
      }
   },
   ...overrides
}) as unknown as Context;
describe("SelectAgentEstimateParams", function () {
   let selector: SelectAgentEstimateParams;
   let config: AppConfig;
   let agentsService: RepliersAgents;
   let bossService: BossService;
   let userService: UserService;
   let originalAgentsGet: RepliersAgents["get"];
   let originalBossGetUsers: BossService["getUsers"];
   let originalUserInfo: UserService["info"];
   before(() => {
      container.register("XForwardedFor", {
         useFactory: () => new DummyXFFProvider()
      });
      agentsService = container.resolve(RepliersAgents);
      bossService = container.resolve(BossService);
      userService = container.resolve(UserService);
      config = container.resolve<AppConfig>("config");
      originalAgentsGet = agentsService.get.bind(agentsService);
      originalBossGetUsers = bossService.getUsers.bind(bossService);
      originalUserInfo = userService.info.bind(userService);
      agentsService.get = async () => agentFixture;
      bossService.getUsers = async () => ({
         users: []
      }) as unknown as Awaited<ReturnType<BossService["getUsers"]>>;
      userService.info = async () => clientFixture;
      selector = new SelectAgentEstimateParams(userService, container.resolve(RepliersService), agentsService, bossService, config);
   });
   afterEach(() => {
      agentsService.get = async () => agentFixture;
      userService.info = async () => clientFixture;
   });
   after(() => {
      agentsService.get = originalAgentsGet;
      bossService.getUsers = originalBossGetUsers;
      userService.info = originalUserInfo;
   });
   describe("select", function () {
      it("returns null when validation fails", async function () {
         const ctx = makeCtx({});
         const result = await selector.select(ctx);
         assert.equal(result, null);
      });
      it("returns Seller Inquiry type for valid body", async function () {
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.type, "Seller Inquiry");
      });
      it("sets property street from address fields", async function () {
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.property?.street, "100 Queen St");
      });
      it("sets property city and code from address", async function () {
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.property?.city, "Toronto");
         assert.equal(result.property?.code, "M5H 2N2");
      });
      it("sets property type from details.style", async function () {
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.property?.type, "2-Storey");
      });
      it("sets property bedrooms, bathrooms, and area from details", async function () {
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.property?.bedrooms, "3");
         assert.equal(result.property?.bathrooms, "2");
         assert.equal(result.property?.area, "2000");
      });
      it("sets property price from response body estimate when present", async function () {
         const ctx = makeCtx(validBody, {
            response: {
               body: {
                  estimate: 750000,
                  estimateId: 1
               }
            }
         });
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.property?.price, 750000);
      });
      it("sets property price to undefined when response body is not an estimate", async function () {
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.property?.price, undefined);
      });
      it("sets assignedUserId from agent externalId via getAgent", async function () {
         agentsService.get = async () => ({
            ...agentFixture,
            externalId: "999"
         });
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.person?.assignedUserId, 999);
      });
      it("passes agentId from ctx.state.user.sub to getAgent", async function () {
         let capturedAgentId: number | undefined;
         agentsService.get = async id => {
            capturedAgentId = id;
            return agentFixture;
         };
         const ctx = makeCtx(validBody, {
            state: {
               user: {
                  sub: 55,
                  email: "a@b.com"
               }
            }
         });
         await selector.select(ctx);
         assert.equal(capturedAgentId, 55);
      });
      it("sets pageReferrer from ctx referer header", async function () {
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.pageReferrer, "https://example.com");
      });
      it("sets occurredAt to current time", async function () {
         const before = new Date().toISOString();
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         const after = new Date().toISOString();
         assert.ok(result);
         assert.ok(result.occurredAt! >= before);
         assert.ok(result.occurredAt! <= after);
      });
      it("includes sell intention tags when sellingTimeline is set", async function () {
         const body = {
            ...validBody,
            data: {
               salesIntentions: {
                  sellingTimeline: "asap"
               }
            }
         };
         const ctx = makeCtx(body);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.ok(result.person?.tags?.includes("Sell ASAP"));
      });
      it("does not include sell intention tags for unknown timeline", async function () {
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         assert.ok(result);
         const sellTags = result.person?.tags?.filter(t => t.startsWith("Sell"));
         assert.deepEqual(sellTags, []);
      });
   });
   describe("getOwner", function () {
      it("returns emails and phones from client when clientId is provided", async function () {
         userService.info = async () => ({
            ...clientFixture,
            email: "owner@example.com",
            phone: "5551112222"
         });
         const result = await selector.getOwner({
            clientId: 42
         } as never);
         assert.deepEqual(result.emails, [{
            value: "owner@example.com",
            type: "main"
         }]);
         assert.deepEqual(result.phones, [{
            value: "5551112222",
            type: "main"
         }]);
      });
      it("passes clientId to usersService.info", async function () {
         let capturedClientId: number | undefined;
         userService.info = async id => {
            capturedClientId = id;
            return clientFixture;
         };
         await selector.getOwner({
            clientId: 99
         } as never);
         assert.equal(capturedClientId, 99);
      });
      it("returns empty object when clientId is not provided", async function () {
         const result = await selector.getOwner({} as never);
         assert.deepEqual(result, {});
      });
      it("returns empty object when usersService.info returns falsy", async function () {
         userService.info = async () => null as never;
         const result = await selector.getOwner({
            clientId: 42
         } as never);
         assert.deepEqual(result, {});
      });
   });
});