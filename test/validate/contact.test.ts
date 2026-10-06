import assert from "assert";
import { scheduleSchema } from "../../src/validate/contact.js";
const tour = {
   name: "Ann",
   email: "ann@example.com",
   phone: "14165550199",
   method: "InPerson",
   date: "2026-09-20",
   time: "12:00",
   mlsNumber: "W1234567"
};
describe("validate/contact schedule", () => {
   it("accepts a tour request carrying a message", () => {
      const {
         error
      } = scheduleSchema.validate({
         ...tour,
         message: "I want to talk about financing"
      });
      assert.strictEqual(error, undefined);
   });
   it("still accepts one without", () => {
      const {
         error
      } = scheduleSchema.validate(tour);
      assert.strictEqual(error, undefined);
   });
});