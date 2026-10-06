import assert from "assert";
import { container } from "tsyringe";
import EventsCollectionService from "../../../src/services/eventsCollection/eventsCollection.js";
import BossService, { type BossEventsCreateRequest } from "../../../src/services/boss.js";
import UserService from "../../../src/services/user.js";
import type { AppConfig } from "../../../src/config.js";
import { DummyXFFProvider } from "../../../src/providers/dummy.xff.js";
describe("EventsCollectionService", function () {
   let service: EventsCollectionService;
   let config: AppConfig;
   let boss: BossService;
   let capturedParams: BossEventsCreateRequest | null;
   let originalEventsCreate: BossService["eventsCreate"];
   before(() => {
      container.register("XForwardedFor", {
         useFactory: () => new DummyXFFProvider()
      });
      boss = container.resolve(BossService);
      config = container.resolve<AppConfig>("config");
      originalEventsCreate = boss.eventsCreate.bind(boss);
      boss.eventsCreate = async (params: BossEventsCreateRequest) => {
         capturedParams = params;
         return {} as Awaited<ReturnType<BossService["eventsCreate"]>>;
      };
      service = new EventsCollectionService(boss, container.resolve(UserService), config);
   });
   afterEach(() => {
      capturedParams = null;
   });
   after(() => {
      boss.eventsCreate = originalEventsCreate;
   });
   describe("assignAgent", function () {
      it("returns assignedUserId when person has assignedUserId", function () {
         const result = service.assignAgent({
            assignedUserId: 123
         });
         assert.deepEqual(result, {
            assignedUserId: 123
         });
      });
      it("returns assignedTo when person has assignedTo but no assignedUserId", function () {
         const result = service.assignAgent({
            assignedTo: "Jane Smith"
         });
         assert.deepEqual(result, {
            assignedTo: "Jane Smith"
         });
      });
      it("prefers assignedUserId over assignedTo when both are present", function () {
         const result = service.assignAgent({
            assignedUserId: 123,
            assignedTo: "Jane Smith"
         });
         assert.deepEqual(result, {
            assignedUserId: 123
         });
      });
      it("returns empty object when person has neither assignedUserId nor assignedTo", function () {
         const result = service.assignAgent({
            firstName: "Jane"
         });
         assert.deepEqual(result, {});
      });
      it("returns empty object when person is undefined", function () {
         const result = service.assignAgent(undefined);
         assert.deepEqual(result, {});
      });
      it("does not use config.defaultPersonFields.assignedTo", function () {
         const original = config.eventsCollection.defaultPersonFields.assignedTo;
         config.eventsCollection.defaultPersonFields.assignedTo = "Default Agent";
         const result = service.assignAgent({});
         assert.deepEqual(result, {});
         config.eventsCollection.defaultPersonFields.assignedTo = original;
      });
   });
   describe("assignTags", function () {
      it("merges config default tags with person tags", function () {
         const original = config.eventsCollection.defaultPersonFields.tags;
         config.eventsCollection.defaultPersonFields.tags = ["dev", "estimates"];
         const result = service.assignTags({
            tags: ["Registration"]
         });
         assert.deepEqual(result, ["dev", "estimates", "Registration"]);
         config.eventsCollection.defaultPersonFields.tags = original;
      });
      it("returns only config tags when person has no tags", function () {
         const original = config.eventsCollection.defaultPersonFields.tags;
         config.eventsCollection.defaultPersonFields.tags = ["dev"];
         const result = service.assignTags({});
         assert.deepEqual(result, ["dev"]);
         config.eventsCollection.defaultPersonFields.tags = original;
      });
      it("returns only person tags when config has no default tags", function () {
         const original = config.eventsCollection.defaultPersonFields.tags;
         config.eventsCollection.defaultPersonFields.tags = undefined as unknown as string[];
         const result = service.assignTags({
            tags: ["Registration"]
         });
         assert.deepEqual(result, ["Registration"]);
         config.eventsCollection.defaultPersonFields.tags = original;
      });
      it("returns empty array when neither config nor person have tags", function () {
         const original = config.eventsCollection.defaultPersonFields.tags;
         config.eventsCollection.defaultPersonFields.tags = undefined as unknown as string[];
         const result = service.assignTags({});
         assert.deepEqual(result, []);
         config.eventsCollection.defaultPersonFields.tags = original;
      });
      it("returns only person tags when person is undefined", function () {
         const original = config.eventsCollection.defaultPersonFields.tags;
         config.eventsCollection.defaultPersonFields.tags = ["dev"];
         const result = service.assignTags(undefined);
         assert.deepEqual(result, ["dev"]);
         config.eventsCollection.defaultPersonFields.tags = original;
      });
      it("places config tags before person tags", function () {
         const original = config.eventsCollection.defaultPersonFields.tags;
         config.eventsCollection.defaultPersonFields.tags = ["env-tag"];
         const result = service.assignTags({
            tags: ["Registration", "Custom"]
         });
         assert.equal(result[0], "env-tag");
         assert.equal(result[1], "Registration");
         assert.equal(result[2], "Custom");
         config.eventsCollection.defaultPersonFields.tags = original;
      });
   });
   describe("eventsCreate", function () {
      it("spreads defaultEventFields from config", async function () {
         const original = config.eventsCollection.defaultEventFields.source;
         config.eventsCollection.defaultEventFields.source = "test-portal.tld";
         service.eventsCreate({
            type: "Registration",
            person: {
               tags: ["Registration"]
            }
         });
         await new Promise(r => setTimeout(r, 10));
         assert.ok(capturedParams);
         assert.equal(capturedParams.source, "test-portal.tld");
         config.eventsCollection.defaultEventFields.source = original;
      });
      it("params override defaultEventFields", async function () {
         const original = config.eventsCollection.defaultEventFields.source;
         config.eventsCollection.defaultEventFields.source = "default-source.tld";
         service.eventsCreate({
            source: "custom-source.tld",
            person: {}
         });
         await new Promise(r => setTimeout(r, 10));
         assert.ok(capturedParams);
         assert.equal(capturedParams.source, "custom-source.tld");
         config.eventsCollection.defaultEventFields.source = original;
      });
      it("merges config default tags with person tags", async function () {
         const original = config.eventsCollection.defaultPersonFields.tags;
         config.eventsCollection.defaultPersonFields.tags = ["dev"];
         service.eventsCreate({
            person: {
               tags: ["Registration"]
            }
         });
         await new Promise(r => setTimeout(r, 10));
         assert.ok(capturedParams);
         assert.deepEqual(capturedParams.person?.tags, ["dev", "Registration"]);
         config.eventsCollection.defaultPersonFields.tags = original;
      });
      it("skips default tags when ignoreDefaultTags is set", async function () {
         const original = config.eventsCollection.defaultPersonFields.tags;
         config.eventsCollection.defaultPersonFields.tags = ["dev"];
         service.eventsCreate({
            ignoreDefaultTags: true,
            person: {
               tags: ["Custom"]
            }
         });
         await new Promise(r => setTimeout(r, 10));
         assert.ok(capturedParams);
         assert.deepEqual(capturedParams.person?.tags, ["Custom"]);
         config.eventsCollection.defaultPersonFields.tags = original;
      });
      it("does not pass ignoreDefaultTags to boss.eventsCreate", async function () {
         service.eventsCreate({
            ignoreDefaultTags: true,
            person: {}
         });
         await new Promise(r => setTimeout(r, 10));
         assert.ok(capturedParams);
         assert.equal(capturedParams.ignoreDefaultTags, undefined);
      });
      it("passes assignedUserId from person through assignAgent", async function () {
         service.eventsCreate({
            person: {
               assignedUserId: 99,
               tags: []
            }
         });
         await new Promise(r => setTimeout(r, 10));
         assert.ok(capturedParams);
         assert.equal(capturedParams.person?.assignedUserId, 99);
      });
      it("passes assignedTo from person through assignAgent", async function () {
         service.eventsCreate({
            person: {
               assignedTo: "Jane Smith",
               tags: []
            }
         });
         await new Promise(r => setTimeout(r, 10));
         assert.ok(capturedParams);
         assert.equal(capturedParams.person?.assignedTo, "Jane Smith");
      });
      it("does not set assignedTo from config defaultPersonFields", async function () {
         const original = config.eventsCollection.defaultPersonFields.assignedTo;
         config.eventsCollection.defaultPersonFields.assignedTo = "Default Agent";
         service.eventsCreate({
            person: {
               tags: []
            }
         });
         await new Promise(r => setTimeout(r, 10));
         assert.ok(capturedParams);
         assert.equal(capturedParams.person?.assignedTo, undefined);
         config.eventsCollection.defaultPersonFields.assignedTo = original;
      });
      it("preserves person fields like firstName and emails", async function () {
         service.eventsCreate({
            person: {
               firstName: "Jane",
               lastName: "Smith",
               emails: [{
                  value: "jane@example.com",
                  type: "main"
               }],
               tags: []
            }
         });
         await new Promise(r => setTimeout(r, 10));
         assert.ok(capturedParams);
         assert.equal(capturedParams.person?.firstName, "Jane");
         assert.equal(capturedParams.person?.lastName, "Smith");
         assert.deepEqual(capturedParams.person?.emails, [{
            value: "jane@example.com",
            type: "main"
         }]);
      });
   });
   describe("noteCreate", function () {
      it("swallows a failing client lookup instead of leaving an unhandled rejection", async function () {
         const failingUsers = {
            info: async () => {
               throw new Error("Repliers API error: 404");
            }
         } as unknown as UserService;
         const noteCalls: unknown[] = [];
         const originalNoteCreate = boss.noteCreate.bind(boss);
         boss.noteCreate = async params => {
            noteCalls.push(params);
            return {} as never;
         };
         const unhandled: unknown[] = [];
         const onUnhandled = (reason: unknown) => unhandled.push(reason);
         process.on("unhandledRejection", onUnhandled);
         try {
            await new EventsCollectionService(boss, failingUsers, config).noteCreate({
               clientId: 42,
               body: "hi"
            } as never);
            await new Promise(r => setTimeout(r, 10));
            assert.deepEqual(unhandled, []);
            assert.deepEqual(noteCalls, []);
         } finally {
            process.off("unhandledRejection", onUnhandled);
            boss.noteCreate = originalNoteCreate;
         }
      });
   });
});