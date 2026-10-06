import assert from "assert";
import { container } from "tsyringe";
import type { Context } from "koa";
import SelectUnsubscribedParams from "../../../../src/services/eventsCollection/selectors/selectUnsubscribedParams.js";
import type { AppConfig } from "../../../../src/config.js";
import { DummyXFFProvider } from "../../../../src/providers/dummy.xff.js";
const makeCtx = (body: Record<string, unknown> = {}, user: Record<string, unknown> = {}, headers: Record<string, string> = {}) => ({
   request: {
      body,
      headers
   },
   state: {
      user
   }
}) as unknown as Context;
describe("SelectUnsubscribedParams", function () {
   let selector: SelectUnsubscribedParams;
   before(() => {
      container.register("XForwardedFor", {
         useFactory: () => new DummyXFFProvider()
      });
      selector = container.resolve(SelectUnsubscribedParams);
   });
   it("returns null when preferences.unsubscribe is not set", async function () {
      const result = await selector.select(makeCtx({
         clientId: 1
      }, {
         sub: 1,
         email: "user@example.com"
      }));
      assert.equal(result, null);
   });
   it("returns null when preferences.unsubscribe is false", async function () {
      const result = await selector.select(makeCtx({
         clientId: 2,
         preferences: {
            unsubscribe: false
         }
      }, {
         sub: 2,
         email: "user@example.com"
      }));
      assert.equal(result, null);
   });
   it("returns payload with type Unsubscribed when preferences.unsubscribe is true", async function () {
      const result = await selector.select(makeCtx({
         clientId: 3,
         preferences: {
            unsubscribe: true
         }
      }, {
         sub: 3,
         email: "user@example.com"
      }));
      assert.ok(result);
      assert.equal(result.type, "Unsubscribed");
   });
   it("merges config event tags into person.tags", async function () {
      const config = container.resolve<AppConfig>("config");
      const configTags = config.eventsCollection.eventTags.SelectUnsubscribedParams;
      const result = await selector.select(makeCtx({
         clientId: 4,
         preferences: {
            unsubscribe: true
         }
      }, {
         sub: 4,
         email: "user@example.com"
      }));
      assert.ok(result);
      for (const tag of configTags) {
         assert.ok(result.person?.tags?.includes(tag), `expected tag '${tag}' in ${JSON.stringify(result.person?.tags)}`);
      }
   });
   it("sets person email from user state", async function () {
      const result = await selector.select(makeCtx({
         clientId: 5,
         preferences: {
            unsubscribe: true
         }
      }, {
         sub: 5,
         email: "test@example.com"
      }));
      assert.ok(result);
      assert.deepEqual(result.person?.emails, [{
         value: "test@example.com",
         type: "main"
      }]);
   });
   it("sets occurredAt to current time", async function () {
      const before = new Date().toISOString();
      const result = await selector.select(makeCtx({
         clientId: 6,
         preferences: {
            unsubscribe: true
         }
      }, {
         sub: 6,
         email: "user@example.com"
      }));
      const after = new Date().toISOString();
      assert.ok(result);
      assert.ok(result.occurredAt! >= before, "occurredAt should be >= test start");
      assert.ok(result.occurredAt! <= after, "occurredAt should be <= test end");
   });
   it("sets pageReferrer from referer header", async function () {
      const result = await selector.select(makeCtx({
         clientId: 7,
         preferences: {
            unsubscribe: true
         }
      }, {
         sub: 7,
         email: "user@example.com"
      }, {
         referer: "https://example.com"
      }));
      assert.ok(result);
      assert.equal(result.pageReferrer, "https://example.com");
   });
});