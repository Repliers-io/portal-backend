import assert from "assert";
import { container } from "tsyringe";
import SelectClientRegistrationParams from "../../../../src/services/eventsCollection/selectors/selectClientRegistrationParams.js";
import RepliersService from "../../../../src/services/repliers.js";
import RepliersAgents from "../../../../src/services/repliers/agents.js";
import BossService from "../../../../src/services/boss.js";
import type { AppConfig } from "../../../../src/config.js";
import type { RplClientsClient } from "../../../../src/services/repliers/clients.js";
import { DummyXFFProvider } from "../../../../src/providers/dummy.xff.js";
import { secureFubAvmLink } from "../../../../src/lib/utils.js";

// The global test registry stubs SelectClientRegistrationParams with { select: () => null }.
// Instantiate the real class directly to test its logic.
const makeSelector = () => {
   container.register("XForwardedFor", {
      useFactory: () => new DummyXFFProvider()
   });
   return new SelectClientRegistrationParams(container.resolve(RepliersService), container.resolve(RepliersAgents), container.resolve(BossService), container.resolve<AppConfig>("config"));
};
const userFixture: RplClientsClient = {
   clientId: 42,
   agentId: 1,
   fname: "Jane",
   lname: "Smith",
   email: "jane@example.com",
   phone: "5559876543",
   proxyEmail: "",
   status: true,
   lastActivity: null,
   tags: "",
   preferences: {
      email: true,
      sms: false,
      unsubscribe: false,
      whatsapp: false
   },
   expiryDate: null,
   createdOn: "2024-01-01",
   externalId: null,
   data: {}
};
describe("SelectClientRegistrationParams", function () {
   let selector: SelectClientRegistrationParams;
   before(() => {
      selector = makeSelector();
   });
   it("returns null when user is not provided", async function () {
      // @ts-expect-error testing null/undefined case
      const result = await selector.select({
         user: null,
         provider: "email"
      });
      assert.equal(result, null);
   });
   it("returns correct type for a registered user", async function () {
      const result = await selector.select({
         user: userFixture,
         provider: "email"
      });
      assert.ok(result);
      assert.equal(result.type, "Registration");
   });
   it("sets Registration tag", async function () {
      const result = await selector.select({
         user: userFixture,
         provider: "email"
      });
      assert.ok(result);
      assert.deepEqual(result.person?.tags, ["Registration"]);
   });
   it("sets person name fields", async function () {
      const result = await selector.select({
         user: userFixture,
         provider: "email"
      });
      assert.ok(result);
      assert.equal(result.person?.firstName, userFixture.fname);
      assert.equal(result.person?.lastName, userFixture.lname);
   });
   it("sets person.emails from user email", async function () {
      const result = await selector.select({
         user: userFixture,
         provider: "email"
      });
      assert.ok(result);
      assert.deepEqual(result.person?.emails, [{
         value: userFixture.email,
         type: "main"
      }]);
   });
   it("sets person.phones from user phone", async function () {
      const result = await selector.select({
         user: userFixture,
         provider: "email"
      });
      assert.ok(result);
      assert.deepEqual(result.person?.phones, [{
         value: userFixture.phone,
         type: "main"
      }]);
   });
   it("omits phones when user has no phone", async function () {
      const userWithoutPhone = {
         ...userFixture,
         phone: ""
      };
      const result = await selector.select({
         user: userWithoutPhone,
         provider: "email"
      });
      assert.ok(result);
      assert.deepEqual(result.person?.phones, []);
   });
   it("sets customAuthType from provider", async function () {
      const result = await selector.select({
         user: userFixture,
         provider: "google"
      });
      assert.ok(result);
      assert.equal(result.person?.customAuthType, "google");
   });
   it("sets pageReferrer when referer is provided", async function () {
      const result = await selector.select({
         user: userFixture,
         provider: "email",
         referer: "https://example.com"
      });
      assert.ok(result);
      assert.equal(result.pageReferrer, "https://example.com");
   });
   it("sets occurredAt to current time", async function () {
      const before = new Date().toISOString();
      const result = await selector.select({
         user: userFixture,
         provider: "email"
      });
      const after = new Date().toISOString();
      assert.ok(result);
      assert.ok(result.occurredAt! >= before, "occurredAt should be >= test start");
      assert.ok(result.occurredAt! <= after, "occurredAt should be <= test end");
   });
   it("does not set assignedTo even when config.defaultPersonFields.assignedTo is set", async function () {
      const config = container.resolve<AppConfig>("config");
      const original = config.eventsCollection.defaultPersonFields.assignedTo;
      config.eventsCollection.defaultPersonFields.assignedTo = "Default Agent";
      const result = await selector.select({
         user: userFixture,
         provider: "email"
      });
      assert.ok(result);
      assert.equal(result.person?.assignedTo, undefined);
      config.eventsCollection.defaultPersonFields.assignedTo = original;
   });
   it("sets tags to Registration only, ignoring config.defaultPersonFields.tags", async function () {
      const config = container.resolve<AppConfig>("config");
      const original = config.eventsCollection.defaultPersonFields.tags;
      config.eventsCollection.defaultPersonFields.tags = ["dev", "estimates"];
      const result = await selector.select({
         user: userFixture,
         provider: "email"
      });
      assert.ok(result);
      assert.deepEqual(result.person?.tags, ["Registration"]);
      config.eventsCollection.defaultPersonFields.tags = original;
   });
   describe("envSpecificPersonFields", function () {
      it("returns only customAuthType when custom_AVM_field is not configured", function () {
         const config = container.resolve<AppConfig>("config");
         const original = config.boss.custom_AVM_field;
         config.boss.custom_AVM_field = undefined;
         const result = selector.envSpecificPersonFields(userFixture, "email");
         assert.deepEqual(result, {
            customAuthType: "email"
         });
         config.boss.custom_AVM_field = original;
      });
      it("includes AVM link when custom_AVM_field is configured and user has clientId", function () {
         const config = container.resolve<AppConfig>("config");
         const original = config.boss.custom_AVM_field;
         config.boss.custom_AVM_field = "customTestAVM";
         const result = selector.envSpecificPersonFields(userFixture, "google");
         assert.equal(result.customAuthType, "google");
         const expectedLink = secureFubAvmLink(config.eventsCollection.clientUrl, userFixture.clientId.toString(), config.auth.agents_signature_salt);
         assert.equal(result["customTestAVM" as keyof typeof result], expectedLink);
         config.boss.custom_AVM_field = original;
      });
      it("sets AVM field to undefined when user has no clientId", function () {
         const config = container.resolve<AppConfig>("config");
         const original = config.boss.custom_AVM_field;
         config.boss.custom_AVM_field = "customTestAVM";
         const userWithoutClientId = {
            ...userFixture,
            clientId: 0
         };
         const result = selector.envSpecificPersonFields(userWithoutClientId, "email");
         assert.equal(result.customAuthType, "email");
         assert.equal(result["customTestAVM" as keyof typeof result], undefined);
         config.boss.custom_AVM_field = original;
      });
      it("preserves provider value across different providers", function () {
         const config = container.resolve<AppConfig>("config");
         const original = config.boss.custom_AVM_field;
         config.boss.custom_AVM_field = undefined;
         assert.equal(selector.envSpecificPersonFields(userFixture, "google").customAuthType, "google");
         assert.equal(selector.envSpecificPersonFields(userFixture, "email").customAuthType, "email");
         assert.equal(selector.envSpecificPersonFields(userFixture, "phone").customAuthType, "phone");
         config.boss.custom_AVM_field = original;
      });
   });
});