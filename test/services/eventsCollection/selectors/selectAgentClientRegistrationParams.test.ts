import assert from "assert";
import { container } from "tsyringe";
import SelectAgentClientRegistrationParams from "../../../../src/services/eventsCollection/selectors/selectAgentClientRegistrationParams.js";
import RepliersService from "../../../../src/services/repliers.js";
import RepliersAgents from "../../../../src/services/repliers/agents.js";
import BossService from "../../../../src/services/boss.js";
import type { AppConfig } from "../../../../src/config.js";
import { DummyXFFProvider } from "../../../../src/providers/dummy.xff.js";
import { secureFubAvmLink } from "../../../../src/lib/utils.js";
import type { Context } from "koa";
import type { RplAgentsAgent } from "../../../../src/services/repliers/agents.js";
const agentFixture: RplAgentsAgent = {
   agentId: 10,
   fname: "Agent",
   lname: "Smith",
   phone: "5551234567",
   email: "agent@example.com",
   proxyPhone: "",
   proxyEmail: "",
   avatar: null,
   brokerage: "Test Brokerage",
   designation: "",
   location: null,
   externalId: "777",
   status: true,
   data: null
};
const makeCtx = (body: Record<string, unknown> = {}, overrides: Record<string, unknown> = {}): Context => ({
   request: {
      body,
      headers: {
         referer: "https://example.com"
      }
   },
   state: {
      user: {
         sub: 10,
         email: "agent@example.com"
      }
   },
   ...overrides
}) as unknown as Context;
describe("SelectAgentClientRegistrationParams", function () {
   let selector: SelectAgentClientRegistrationParams;
   let config: AppConfig;
   let agentsService: RepliersAgents;
   let bossService: BossService;
   let originalAgentsGet: RepliersAgents["get"];
   let originalBossGetUsers: BossService["getUsers"];
   before(() => {
      container.register("XForwardedFor", {
         useFactory: () => new DummyXFFProvider()
      });
      agentsService = container.resolve(RepliersAgents);
      bossService = container.resolve(BossService);
      config = container.resolve<AppConfig>("config");
      originalAgentsGet = agentsService.get.bind(agentsService);
      originalBossGetUsers = bossService.getUsers.bind(bossService);
      agentsService.get = async () => agentFixture;
      bossService.getUsers = async () => ({
         users: []
      }) as unknown as Awaited<ReturnType<BossService["getUsers"]>>;
      selector = new SelectAgentClientRegistrationParams(container.resolve(RepliersService), agentsService, bossService, config);
   });
   afterEach(() => {
      agentsService.get = async () => agentFixture;
   });
   after(() => {
      agentsService.get = originalAgentsGet;
      bossService.getUsers = originalBossGetUsers;
   });
   const validBody = {
      fname: "Jane",
      lname: "Doe",
      email: "jane@example.com",
      phone: "5559876543"
   };
   describe("select", function () {
      it("returns null when validation fails (missing email)", async function () {
         const ctx = makeCtx({
            fname: "Jane",
            lname: "Doe"
         });
         const result = await selector.select(ctx);
         assert.equal(result, null);
      });
      it("returns Registration type for valid body", async function () {
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.type, "Registration");
      });
      it("sets person name fields from validated body", async function () {
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.person?.firstName, "Jane");
         assert.equal(result.person?.lastName, "Doe");
      });
      it("sets person.emails from body email", async function () {
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.deepEqual(result.person?.emails, [{
            value: "jane@example.com",
            type: "main"
         }]);
      });
      it("sets person.phones from body phone", async function () {
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.deepEqual(result.person?.phones, [{
            value: "5559876543",
            type: "main"
         }]);
      });
      it("sets Registration tag", async function () {
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.deepEqual(result.person?.tags, ["Registration"]);
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
         agentsService.get = async agentId => {
            capturedAgentId = agentId;
            return agentFixture;
         };
         const ctx = makeCtx(validBody, {
            state: {
               user: {
                  sub: 42,
                  email: "a@b.com"
               }
            }
         });
         await selector.select(ctx);
         assert.equal(capturedAgentId, 42);
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
      it("does not set assignedTo from config defaultPersonFields", async function () {
         const original = config.eventsCollection.defaultPersonFields.assignedTo;
         config.eventsCollection.defaultPersonFields.assignedTo = "Default Agent";
         agentsService.get = async () => ({
            ...agentFixture,
            externalId: null
         });
         bossService.getUsers = async () => ({
            users: []
         }) as unknown as Awaited<ReturnType<BossService["getUsers"]>>;
         const ctx = makeCtx(validBody);
         const result = await selector.select(ctx);
         assert.ok(result);
         assert.equal(result.person?.assignedTo, undefined);
         config.eventsCollection.defaultPersonFields.assignedTo = original;
      });
   });
   describe("envSpecificPersonFields", function () {
      it("returns only customAuthType Agent when custom_AVM_field is not configured", function () {
         const original = config.boss.custom_AVM_field;
         config.boss.custom_AVM_field = undefined;
         const ctx = makeCtx(validBody);
         const result = selector.envSpecificPersonFields(ctx);
         assert.deepEqual(result, {
            customAuthType: "Agent"
         });
         config.boss.custom_AVM_field = original;
      });
      it("always sets customAuthType to Agent", function () {
         const original = config.boss.custom_AVM_field;
         config.boss.custom_AVM_field = undefined;
         const ctx = makeCtx(validBody);
         const result = selector.envSpecificPersonFields(ctx);
         assert.equal(result.customAuthType, "Agent");
         config.boss.custom_AVM_field = original;
      });
      it("includes AVM link when custom_AVM_field is configured and ctx has clientId", function () {
         const original = config.boss.custom_AVM_field;
         config.boss.custom_AVM_field = "customTestAVM";
         const ctx = makeCtx(validBody);
         (ctx as unknown as Record<string, unknown>)["body"] = {
            clientId: 42
         };
         const result = selector.envSpecificPersonFields(ctx);
         assert.equal(result.customAuthType, "Agent");
         const expectedLink = secureFubAvmLink(config.eventsCollection.clientUrl, "42", config.auth.agents_signature_salt);
         assert.equal(result["customTestAVM" as keyof typeof result], expectedLink);
         config.boss.custom_AVM_field = original;
      });
      it("sets AVM field to undefined when ctx body has no clientId", function () {
         const original = config.boss.custom_AVM_field;
         config.boss.custom_AVM_field = "customTestAVM";
         const ctx = makeCtx(validBody);
         (ctx as unknown as Record<string, unknown>)["body"] = {
            clientId: 0
         };
         const result = selector.envSpecificPersonFields(ctx);
         assert.equal(result.customAuthType, "Agent");
         assert.equal(result["customTestAVM" as keyof typeof result], undefined);
         config.boss.custom_AVM_field = original;
      });
   });
});