import assert from "assert";
import supertest from "supertest";
import TestAgent from "supertest/lib/agent.js";
import app from "../../src/app.js";
import { mockFavoritesGet } from "../mocks/repliers/favorites.js";
import { generateAuthToken } from "../mocks/auth.js";
import { RplSortBy } from "../../src/types/repliers.js";
import type { AppConfig } from "../../src/config.js";
import { container } from "tsyringe";
const config = container.resolve<AppConfig>("config");
describe("Favorites", function () {
   let appInstance: TestAgent;
   before(function () {
      appInstance = supertest(app.callback());
   });
   describe("GET /api/favorites", function () {
      const clientId = 4242;
      const token = generateAuthToken({
         email: "test@user",
         sub: String(clientId)
      });
      const favoritesResponse = {
         page: 1,
         numPages: 1,
         pageSize: 10,
         count: 1,
         favorites: [{
            favoriteId: 1,
            mlsNumber: "ABC123"
         }]
      };
      it("should return the authenticated client's favorites", async function () {
         mockFavoritesGet(clientId, favoritesResponse);
         const res = await appInstance.get("/api/favorites").set("Authorization", `Bearer ${token}`);
         assert.equal(res.status, 200);
         assert.equal(res.body.count, 1);
         assert.equal(res.body.favorites.length, 1);
      });
      it("should forward sortBy, lat and long to the Repliers API", async function () {
         mockFavoritesGet(clientId, favoritesResponse, {
            sortBy: RplSortBy.distanceAsc,
            lat: "43.65",
            long: "-79.38"
         });
         const res = await appInstance.get("/api/favorites").query({
            sortBy: RplSortBy.distanceAsc,
            lat: "43.65",
            long: "-79.38"
         }).set("Authorization", `Bearer ${token}`);
         assert.equal(res.status, 200);
         assert.equal(res.body.count, 1);
      });
      it("should forward the allowed standard statuses to the Repliers API", async function () {
         const allowed = config.settings.allowedListingsStandardStatuses;
         const sent = mockFavoritesGet(clientId, favoritesResponse);
         const res = await appInstance.get("/api/favorites").set("Authorization", `Bearer ${token}`);
         assert.equal(res.status, 200);
         assert.deepEqual(sent.query["standardStatus"], allowed);
      });
      it("should reject an invalid sortBy value", async function () {
         const res = await appInstance.get("/api/favorites").query({
            sortBy: "notARealSort"
         }).set("Authorization", `Bearer ${token}`);
         assert.equal(res.status, 400);
      });
      it("should reject the request without a token", async function () {
         const res = await appInstance.get("/api/favorites");
         assert.equal(res.status, 401);
      });
   });
});