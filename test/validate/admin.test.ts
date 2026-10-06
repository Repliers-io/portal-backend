import assert from "assert";
import { adminCreateAgentBatchSchema } from "../../src/validate/admin.js";
const agent = {
   fname: "Valentina",
   lname: "Kolesnikova",
   phone: "(647) 937-9993",
   email: "valentina@om.works",
   brokerage: "eXp Realty",
   designation: "Broker"
};
describe("validate/admin", () => {
   it("keeps string externalId as string", () => {
      const {
         value
      } = adminCreateAgentBatchSchema.validate([{
         ...agent,
         externalId: "12"
      }]);
      assert.strictEqual(value[0].externalId, "12");
   });
   it("casts numeric externalId to string", () => {
      const {
         value
      } = adminCreateAgentBatchSchema.validate([{
         ...agent,
         externalId: 12
      }]);
      assert.strictEqual(value[0].externalId, "12");
   });
});