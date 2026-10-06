import assert from "assert";
import { contactEntries } from "../../../../src/services/eventsCollection/selectors/baseEventCollectionSelector.js";
describe("selectors/contactEntries", () => {
   it("keeps both when both are given", () => {
      assert.deepStrictEqual(contactEntries("ann@example.com", "14165550199"), {
         emails: [{
            value: "ann@example.com",
            type: "main"
         }],
         phones: [{
            value: "14165550199",
            type: "main"
         }]
      });
   });
   it("omits the phone key when there is no phone", () => {
      assert.deepStrictEqual(contactEntries("ann@example.com", undefined), {
         emails: [{
            value: "ann@example.com",
            type: "main"
         }]
      });
   });
   it("omits the email key when there is no email", () => {
      assert.deepStrictEqual(contactEntries(undefined, "14165550199"), {
         phones: [{
            value: "14165550199",
            type: "main"
         }]
      });
   });
   it("returns nothing when both are missing", () => {
      assert.deepStrictEqual(contactEntries(undefined, ""), {});
   });
});