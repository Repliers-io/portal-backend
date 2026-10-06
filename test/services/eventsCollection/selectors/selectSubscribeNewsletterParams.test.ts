import assert from "assert";
import { container } from "tsyringe";
import type { Context } from "koa";
import SelectSubscribeNewsletterParams from "../../../../src/services/eventsCollection/selectors/selectSubscribeNewsletterParams.js";
import type { AppConfig } from "../../../../src/config.js";
import { DummyXFFProvider } from "../../../../src/providers/dummy.xff.js";
const makeCtx = (body: Record<string, unknown> = {}, state: Record<string, unknown> = {}, headers: Record<string, string> = {}) => ({
   request: {
      body,
      headers
   },
   state
}) as unknown as Context;
describe("SelectSubscribeNewsletterParams", function () {
   let selector: SelectSubscribeNewsletterParams;
   before(() => {
      container.register("XForwardedFor", {
         useFactory: () => new DummyXFFProvider()
      });
      selector = container.resolve(SelectSubscribeNewsletterParams);
   });
   it("returns null when body is missing email", async function () {
      const result = await selector.select(makeCtx({}));
      assert.equal(result, null);
   });
   it("returns null when email is invalid", async function () {
      const result = await selector.select(makeCtx({
         email: "not-an-email"
      }));
      assert.equal(result, null);
   });
   it("returns correct type and message for valid email", async function () {
      const result = await selector.select(makeCtx({
         email: "user@example.com"
      }));
      assert.ok(result);
      assert.equal(result.type, "General Inquiry");
      assert.equal(result.message, "Newsletter subscription");
   });
   it("sets person.emails from body email", async function () {
      const result = await selector.select(makeCtx({
         email: "user@example.com"
      }));
      assert.ok(result);
      assert.deepEqual(result.person?.emails, [{
         value: "user@example.com",
         type: "main"
      }]);
   });
   it("merges config event tags into person.tags", async function () {
      const config = container.resolve<AppConfig>("config");
      const configTags = config.eventsCollection.eventTags.SelectSubscribeNewsletterParams;
      const result = await selector.select(makeCtx({
         email: "user@example.com"
      }));
      assert.ok(result);
      for (const tag of configTags) {
         assert.ok(result.person?.tags?.includes(tag), `expected tag '${tag}' in ${JSON.stringify(result.person?.tags)}`);
      }
   });
   it("uses pageUrl from body when provided", async function () {
      const result = await selector.select(makeCtx({
         email: "user@example.com",
         pageUrl: "https://example.com/page"
      }));
      assert.ok(result);
      assert.equal(result.pageUrl, "https://example.com/page");
   });
   it("falls back to referer header when pageUrl not in body", async function () {
      const result = await selector.select(makeCtx({
         email: "user@example.com"
      }, {}, {
         referer: "https://example.com/referer"
      }));
      assert.ok(result);
      assert.equal(result.pageUrl, "https://example.com/referer");
   });
   it("sets occurredAt to current time", async function () {
      const before = new Date().toISOString();
      const result = await selector.select(makeCtx({
         email: "user@example.com"
      }));
      const after = new Date().toISOString();
      assert.ok(result);
      assert.ok(result.occurredAt! >= before, "occurredAt should be >= test start");
      assert.ok(result.occurredAt! <= after, "occurredAt should be <= test end");
   });
   it("sets pageReferrer from referer header", async function () {
      const result = await selector.select(makeCtx({
         email: "user@example.com"
      }, {}, {
         referer: "https://example.com"
      }));
      assert.ok(result);
      assert.equal(result.pageReferrer, "https://example.com");
   });
});