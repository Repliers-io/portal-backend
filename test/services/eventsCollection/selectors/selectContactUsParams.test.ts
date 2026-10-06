import assert from "assert";
import { container } from "tsyringe";
import type { Context } from "koa";
import SelectContactUsParams from "../../../../src/services/eventsCollection/selectors/selectContactUsParams.js";
import { DummyXFFProvider } from "../../../../src/providers/dummy.xff.js";
const makeCtx = (body: Record<string, unknown> = {}, state: Record<string, unknown> = {}, headers: Record<string, string> = {}) => ({
   request: {
      body,
      headers
   },
   state
}) as unknown as Context;
const validBody = {
   name: "John Doe",
   email: "john@example.com",
   phone: "15551234567",
   message: "I am interested in your services"
};
describe("SelectContactUsParams", function () {
   let selector: SelectContactUsParams;
   before(() => {
      container.register("XForwardedFor", {
         useFactory: () => new DummyXFFProvider()
      });
      selector = container.resolve(SelectContactUsParams);
   });
   it("returns null when body is missing required fields", async function () {
      const result = await selector.select(makeCtx({}));
      assert.equal(result, null);
   });
   it("returns null when email is missing", async function () {
      const {
         email: _email,
         ...noEmail
      } = validBody;
      const result = await selector.select(makeCtx(noEmail));
      assert.equal(result, null);
   });
   it("returns null when phone is missing", async function () {
      const {
         phone: _phone,
         ...noPhone
      } = validBody;
      const result = await selector.select(makeCtx(noPhone));
      assert.equal(result, null);
   });
   it("returns correct type for valid body", async function () {
      const result = await selector.select(makeCtx(validBody));
      assert.ok(result);
      assert.equal(result.type, "General Inquiry");
   });
   it("sets message from body", async function () {
      const result = await selector.select(makeCtx(validBody));
      assert.ok(result);
      assert.equal(result.message, validBody.message);
   });
   it("sets person.emails from body email", async function () {
      const result = await selector.select(makeCtx(validBody));
      assert.ok(result);
      assert.deepEqual(result.person?.emails, [{
         value: validBody.email,
         type: "main"
      }]);
   });
   it("sets person.phones from body phone", async function () {
      const result = await selector.select(makeCtx(validBody));
      assert.ok(result);
      assert.deepEqual(result.person?.phones, [{
         value: validBody.phone,
         type: "main"
      }]);
   });
   it("sets person.firstName from body name", async function () {
      const result = await selector.select(makeCtx(validBody));
      assert.ok(result);
      assert.equal(result.person?.firstName, validBody.name);
   });
   it("uses pageUrl from body when provided", async function () {
      const result = await selector.select(makeCtx({
         ...validBody,
         pageUrl: "https://example.com/listing/123"
      }));
      assert.ok(result);
      assert.equal(result.pageUrl, "https://example.com/listing/123");
   });
   it("falls back to referer header when pageUrl not in body", async function () {
      const result = await selector.select(makeCtx(validBody, {}, {
         referer: "https://example.com/listing/123"
      }));
      assert.ok(result);
      assert.equal(result.pageUrl, "https://example.com/listing/123");
   });
   describe("form tags", function () {
      it("tags the lead with the tags sent by the form", async function () {
         const result = await selector.select(makeCtx({
            ...validBody,
            tags: ["Consult", "John Pasalis"]
         }));
         assert.ok(result);
         assert.deepEqual(result.person?.tags, ["Consult", "John Pasalis"]);
      });
      it("accepts apostrophes and accents in a tag (agent names)", async function () {
         const result = await selector.select(makeCtx({
            ...validBody,
            tags: ["Consult", "Renée O'Brien"]
         }));
         assert.ok(result);
         assert.deepEqual(result.person?.tags, ["Consult", "Renée O'Brien"]);
      });
      it("leaves tags unset when no tags are sent", async function () {
         const result = await selector.select(makeCtx(validBody));
         assert.ok(result);
         assert.equal(result.person?.tags, undefined);
      });
      it("leaves tags unset for an empty list", async function () {
         const result = await selector.select(makeCtx({
            ...validBody,
            tags: []
         }));
         assert.ok(result);
         assert.equal(result.person?.tags, undefined);
      });
      it("rejects a tag holding characters outside a plain label", async function () {
         const result = await selector.select(makeCtx({
            ...validBody,
            tags: ["<script>alert(1)</script>"]
         }));
         assert.equal(result, null);
      });
      it("rejects a tag longer than 50 characters", async function () {
         const result = await selector.select(makeCtx({
            ...validBody,
            tags: ["T".repeat(51)]
         }));
         assert.equal(result, null);
      });
      it("rejects more than 5 tags", async function () {
         const result = await selector.select(makeCtx({
            ...validBody,
            tags: Array(6).fill("Tag")
         }));
         assert.equal(result, null);
      });
   });
});