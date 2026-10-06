import assert from "assert";
import { howSimilar, normalizePhoneNumber, normalizeEmail, calcSignature, secureFubAvmLink, withRequiredFields } from "../../src/lib/utils.js";
describe("howSimilar tests", function () {
   it("Should return 0 when the target is missing (estimate payload without address)", function () {
      assert.equal(howSimilar({
         city: "Ottawa"
      }, undefined), 0);
      assert.equal(howSimilar({
         city: "Ottawa"
      }, null), 0);
   });
   it("Should calculate similarity of two objects", function () {
      const params = {
         city: "Ottawa",
         streetName: "Toronto",
         streetNumber: "6"
      };
      const fix = {
         city: "Ottawa",
         streetName: "Toronto",
         streetNumber: "6",
         streetSuffix: "ST",
         zip: "K1S 0N2"
      };
      const result = howSimilar(params, fix);
      assert.equal(result, 1);
   });
   it("Should calculate similarity of two objects", function () {
      const params = {
         city: "Ottawa",
         streetName: "Toronto",
         streetNumber: "8"
      };
      const fix = {
         city: "Ottawa",
         streetName: "Toronto",
         streetNumber: "6",
         streetSuffix: "ST",
         zip: "K1S 0N2"
      };
      const result = howSimilar(params, fix);
      assert.equal(result, 2 / 3);
   });
});
describe("normalizePhoneNumber tests", function () {
   it("Should normalize a standard 10-digit US number", function () {
      const result = normalizePhoneNumber("5184567890");
      assert.equal(result, "15184567890");
   });
   it("Should normalize a number with hyphens", function () {
      const result = normalizePhoneNumber("518-456-7890");
      assert.equal(result, "15184567890");
   });
   it("Should normalize a number with parentheses and spaces", function () {
      const result = normalizePhoneNumber("(518) 456-7890");
      assert.equal(result, "15184567890");
   });
   it("Should normalize a number with country code +1", function () {
      const result = normalizePhoneNumber("+1 518 456 7890");
      assert.equal(result, "15184567890");
   });
   it("Should normalize a number with country code 1", function () {
      const result = normalizePhoneNumber("1 518 456 7890");
      assert.equal(result, "15184567890");
   });

   // it("Should handle numbers with extensions", function () {
   //    const result = normalizePhoneNumber("518-456-7890 ext. 123");
   //    assert.equal(result, "15184567890");
   // });

   it("Should handle non-numeric characters", function () {
      const result = normalizePhoneNumber("518.456.7890");
      assert.equal(result, "15184567890");
   });
   it("Should return undefined for an invalid phone number", function () {
      const result = normalizePhoneNumber("not-a-phone");
      assert.strictEqual(result, undefined);
   });
   it("Should return undefined for null", function () {
      const result = normalizePhoneNumber(null);
      assert.strictEqual(result, undefined);
   });
   it("Should return undefined for undefined", function () {
      const result = normalizePhoneNumber(undefined);
      assert.strictEqual(result, undefined);
   });
   it("Should return undefined for empty string", function () {
      const result = normalizePhoneNumber("");
      assert.strictEqual(result, undefined);
   });
   it("Should handle a number with fewer than 10 digits", function () {
      const result = normalizePhoneNumber("123456");
      assert.strictEqual(result, undefined);
   });
});
describe("normalizeEmail tests", function () {
   it("Should normalize a standard email", function () {
      const result = normalizeEmail("test@example.com");
      assert.equal(result, "test@example.com");
   });
   it("Should convert uppercase to lowercase", function () {
      const result = normalizeEmail("TEST@EXAMPLE.COM");
      assert.equal(result, "test@example.com");
   });
   it("Should trim whitespace", function () {
      const result = normalizeEmail("  test@example.com  ");
      assert.equal(result, "test@example.com");
   });
   it("Should handle mixed case", function () {
      const result = normalizeEmail("Test@Example.Com");
      assert.equal(result, "test@example.com");
   });
   it("Should handle whitespace and case together", function () {
      const result = normalizeEmail(" Test@Example.Com ");
      assert.equal(result, "test@example.com");
   });
   it("Should return undefined for null", function () {
      const result = normalizeEmail(null);
      assert.strictEqual(result, undefined);
   });
   it("Should return undefined for undefined", function () {
      const result = normalizeEmail(undefined);
      assert.strictEqual(result, undefined);
   });
   it("Should return undefined for empty string", function () {
      const result = normalizeEmail("");
      assert.strictEqual(result, undefined);
   });
   it("Should return undefined for whitespace only", function () {
      const result = normalizeEmail("   ");
      assert.strictEqual(result, undefined);
   });
   it("Should preserve special characters in valid email", function () {
      const result = normalizeEmail("test.name+tag@example-site.co.uk");
      assert.equal(result, "test.name+tag@example-site.co.uk");
   });
});
describe("withRequiredFields tests", function () {
   it("Should append required fields to an existing csv", function () {
      const result = withRequiredFields("listPrice,soldPrice", ["boardId", "status"]);
      assert.equal(result, "listPrice,soldPrice,boardId,status");
   });
   it("Should return only required fields when csv is empty", function () {
      const result = withRequiredFields("", ["boardId", "status"]);
      assert.equal(result, "boardId,status");
   });
   it("Should return only required fields when csv is undefined", function () {
      const result = withRequiredFields(undefined, ["boardId", "status"]);
      assert.equal(result, "boardId,status");
   });
   it("Should not duplicate fields already present in the csv", function () {
      const result = withRequiredFields("listPrice,boardId", ["boardId", "status"]);
      assert.equal(result, "listPrice,boardId,status");
   });
   it("Should drop empty segments produced by stray commas", function () {
      const result = withRequiredFields("listPrice,,status,", ["boardId"]);
      assert.equal(result, "listPrice,status,boardId");
   });
});
describe("Secure FUB AVM Link tests", () => {
   it("Should correctly calculate signature", () => {
      const result = calcSignature(123, "salt");
      assert.equal(result, "d4d09f3c62ebd2b69f92d560c8a24adb");
   });
   it("Should generate a secure link with signature", () => {
      const result = secureFubAvmLink("https://example.com/agent/client/[CLIENT_ID]", 123, "salt");
      assert.equal(result, "https://example.com/agent/client/123?s=d4d09f3c62ebd2b69f92d560c8a24adb");
   });
   it("Should generate a link without signature when no salt provided", () => {
      const result = secureFubAvmLink("https://example.com/agent/client/[CLIENT_ID]", 123);
      assert.equal(result, "https://example.com/agent/client/123");
   });
   it("Should generate a link without signature with empty salt provided", () => {
      const result = secureFubAvmLink("https://example.com/agent/client/[CLIENT_ID]", 123, "");
      assert.equal(result, "https://example.com/agent/client/123");
   });
});