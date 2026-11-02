import assert from "assert";
import nock from "nock";
import supertest from "supertest";
import TestAgent from "supertest/lib/agent.js";
import app from "../../src/app.js";
import config from "../../src/config.js";
const building = {
   address: {
      streetNumber: "100",
      streetName: "Main",
      city: "Ottawa"
   },
   map: {
      latitude: "45.42",
      longitude: "-75.69",
      point: "POINT (-75.69 45.42)"
   }
};
describe("Buildings", function () {
   let appInstance: TestAgent;
   before(function () {
      appInstance = supertest(app.callback());
   });
   afterEach(function () {
      nock.cleanAll();
   });
   describe("GET /buildings/:addressKey", function () {
      it("returns the building unwrapped with a Cache-Control header", async function () {
         const addressKey = "100-main-st-ottawa";
         nock(config.repliers.base_url).get(`/buildings/${addressKey}`).reply(200, building);
         const res = await appInstance.get(`/api/buildings/${addressKey}`);
         assert.equal(res.status, 200);
         assert.deepEqual(res.body, building);
         assert.match(res.headers["cache-control"], /^private, max-age=\d+$/);
         assert.ok(Number(res.headers["cache-control"].split("=")[1]) <= config.cache.buildingsSingle.ttl_ms / 1000);
      });
      it("serves a repeat request from cache without calling Repliers again", async function () {
         const addressKey = "200-bank-st-ottawa";
         const scope = nock(config.repliers.base_url).get(`/buildings/${addressKey}`).once().reply(200, building);
         await appInstance.get(`/api/buildings/${addressKey}`);
         const res = await appInstance.get(`/api/buildings/${addressKey}`);
         assert.ok(scope.isDone());
         assert.equal(res.status, 200);
         assert.deepEqual(res.body, building);
         assert.match(res.headers["cache-control"], /^private, max-age=\d+$/);
      });
   });
});