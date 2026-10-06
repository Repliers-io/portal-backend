import assert from "assert";
import supertest from "supertest";
import app from "../../src/app.js";
import type { AppConfig } from "../../src/config.js";
import { container } from "tsyringe";
import { mockFavoritesGet, mockFavoritesAdd, mockFavoritesDelete } from "../mocks/repliers/favorites.js";
import FavoritesService from "../../src/services/favorites.js";
import { DummyXFFProvider } from "../../src/providers/dummy.xff.js";
import type { Cached } from "../../src/lib/decorators/cached.js";
import { RplSortBy } from "../../src/types/repliers.js";
const config = container.resolve<AppConfig>("config");
const unwrapCached = <T,>(result: T | Cached<T>): T => {
   if (typeof result === "object" && result !== null && "expires" in result && "result" in result) {
      return (result as Cached<T>).result;
   }
   return result as T;
};
describe("Featured Listings", function () {
   const setupApp = () => supertest(app.callback());
   const testSlug = "test-featured";
   const testClientId = 999;
   const emptySlug = "test-empty";
   const emptyClientId = 998;
   before(() => {
      config.settings.featuredListings = [{
         slug: testSlug,
         clientId: testClientId
      }, {
         slug: emptySlug,
         clientId: emptyClientId
      }];
   });
   after(() => {
      config.settings.featuredListings = [];
   });
   it("should return listings for a valid slug", async function () {
      const mockResponse = {
         page: 1,
         numPages: 1,
         pageSize: 10,
         count: 2,
         favorites: [{
            favoriteId: 1,
            mlsNumber: "ABC123"
         }, {
            favoriteId: 2,
            mlsNumber: "DEF456"
         }]
      };
      mockFavoritesGet(testClientId, mockResponse);
      const res = await setupApp().get(`/api/listings/featured/${testSlug}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.count, 2);
      assert.equal(res.body.listings.length, 2);
      assert.equal(res.body.favorites, undefined);
   });
   it("should return 404 for unknown slug", async function () {
      const res = await setupApp().get("/api/listings/featured/nonexistent-slug");
      assert.equal(res.status, 404);
   });
   it("should return 400 for invalid slug format", async function () {
      const res = await setupApp().get("/api/listings/featured/INVALID_SLUG!");
      assert.equal(res.status, 400);
   });
   it("should not allow clientId to be passed as query parameter", async function () {
      const res = await setupApp().get(`/api/listings/featured/nonexistent-slug?clientId=${testClientId}`);
      assert.equal(res.status, 404);
   });
   it("should return empty listings for a valid slug with no favorites", async function () {
      const mockResponse = {
         page: 1,
         numPages: 0,
         pageSize: 10,
         count: 0,
         favorites: []
      };
      mockFavoritesGet(emptyClientId, mockResponse);
      const res = await setupApp().get(`/api/listings/featured/${emptySlug}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.count, 0);
      assert.equal(res.body.listings.length, 0);
   });
   describe("Sorting and location params", function () {
      const sortSlug = "test-sort";
      const sortClientId = 990;
      before(() => {
         config.settings.featuredListings.push({
            slug: sortSlug,
            clientId: sortClientId
         });
      });
      it("should forward sortBy, lat and long to the Repliers API", async function () {
         const mockResponse = {
            page: 1,
            numPages: 1,
            pageSize: 10,
            count: 1,
            favorites: [{
               favoriteId: 1,
               mlsNumber: "SORT1"
            }]
         };
         mockFavoritesGet(sortClientId, mockResponse, {
            sortBy: RplSortBy.distanceAsc,
            lat: "43.65",
            long: "-79.38"
         });
         const res = await setupApp().get(`/api/listings/featured/${sortSlug}`).query({
            sortBy: RplSortBy.distanceAsc,
            lat: "43.65",
            long: "-79.38"
         });
         assert.equal(res.status, 200);
         assert.equal(res.body.count, 1);
         assert.equal(res.body.listings.length, 1);
      });
      it("should reject an invalid sortBy value", async function () {
         const res = await setupApp().get(`/api/listings/featured/${sortSlug}`).query({
            sortBy: "notARealSort"
         });
         assert.equal(res.status, 400);
      });
      it("should cache by slug + sortBy", async function () {
         const one = {
            page: 1,
            numPages: 1,
            pageSize: 10,
            count: 1,
            favorites: [{
               favoriteId: 1,
               mlsNumber: "BEDS_ASC"
            }]
         };
         const two = {
            page: 1,
            numPages: 1,
            pageSize: 10,
            count: 2,
            favorites: [{
               favoriteId: 1,
               mlsNumber: "BEDS_DESC1"
            }, {
               favoriteId: 2,
               mlsNumber: "BEDS_DESC2"
            }]
         };

         // First request for sortBy=bedsAsc hits the API.
         mockFavoritesGet(sortClientId, one, {
            sortBy: RplSortBy.bedsAsc
         });
         const firstRes = await setupApp().get(`/api/listings/featured/${sortSlug}`).query({
            sortBy: RplSortBy.bedsAsc
         });
         assert.equal(firstRes.body.count, 1);

         // A second identical request is served from cache (no new mock needed).
         const cachedRes = await setupApp().get(`/api/listings/featured/${sortSlug}`).query({
            sortBy: RplSortBy.bedsAsc
         });
         assert.equal(cachedRes.status, 200);
         assert.equal(cachedRes.body.count, 1);

         // A different sortBy is a distinct cache key, so it hits the API.
         mockFavoritesGet(sortClientId, two, {
            sortBy: RplSortBy.bedsDesc
         });
         const otherSortRes = await setupApp().get(`/api/listings/featured/${sortSlug}`).query({
            sortBy: RplSortBy.bedsDesc
         });
         assert.equal(otherSortRes.body.count, 2);
      });
      it("should not cache when lat/long are present", async function () {
         const first = {
            page: 1,
            numPages: 1,
            pageSize: 10,
            count: 1,
            favorites: [{
               favoriteId: 1,
               mlsNumber: "FRESH1"
            }]
         };
         const second = {
            page: 1,
            numPages: 1,
            pageSize: 10,
            count: 2,
            favorites: [{
               favoriteId: 1,
               mlsNumber: "FRESH1"
            }, {
               favoriteId: 2,
               mlsNumber: "FRESH2"
            }]
         };
         mockFavoritesGet(sortClientId, first, {
            lat: "10.0",
            long: "20.0"
         });
         const firstRes = await setupApp().get(`/api/listings/featured/${sortSlug}`).query({
            lat: "10.0",
            long: "20.0"
         });
         assert.equal(firstRes.body.count, 1);

         // A second identical request must hit the API again (fresh response),
         // proving lat/long requests are not served from cache.
         mockFavoritesGet(sortClientId, second, {
            lat: "10.0",
            long: "20.0"
         });
         const secondRes = await setupApp().get(`/api/listings/featured/${sortSlug}`).query({
            lat: "10.0",
            long: "20.0"
         });
         assert.equal(secondRes.body.count, 2);
      });
      it("should ignore clientId passed as a query parameter", async function () {
         const ignoreSlug = "test-ignore";
         const ignoreClientId = 989;
         config.settings.featuredListings.push({
            slug: ignoreSlug,
            clientId: ignoreClientId
         });

         // The mock only matches when the outgoing clientId is the slug's mapped
         // clientId — so a 200 proves the query clientId was not forwarded.
         const mockResponse = {
            page: 1,
            numPages: 1,
            pageSize: 10,
            count: 1,
            favorites: [{
               favoriteId: 7,
               mlsNumber: "OWN1"
            }]
         };
         mockFavoritesGet(ignoreClientId, mockResponse);
         const res = await setupApp().get(`/api/listings/featured/${ignoreSlug}?clientId=99999`);
         assert.equal(res.status, 200);
         assert.equal(res.body.count, 1);
      });
   });
   describe("Cache invalidation", function () {
      const cacheSlug = "cache-test";
      const cacheClientId = 997;
      before(() => {
         container.register("XForwardedFor", {
            useFactory: () => new DummyXFFProvider()
         });
         config.settings.featuredListings.push({
            slug: cacheSlug,
            clientId: cacheClientId
         });
      });
      it("should invalidate cache for the slug when a favorite is added for its clientId", async function () {
         const favoritesService = container.resolve(FavoritesService);

         // Prime the cache
         const initialResponse = {
            page: 1,
            numPages: 1,
            pageSize: 10,
            count: 1,
            favorites: [{
               favoriteId: 10,
               mlsNumber: "CACHE1"
            }]
         };
         mockFavoritesGet(cacheClientId, initialResponse);
         const firstResult = await favoritesService.featuredListings({
            slug: cacheSlug
         });
         const firstData = unwrapCached(firstResult);
         assert.equal(firstData.count, 1);

         // Add a favorite for the same clientId — should invalidate cache
         mockFavoritesAdd();
         await favoritesService.add({
            clientId: cacheClientId,
            mlsNumber: "NEW1"
         });

         // Fetch again — should hit the API, not the cache
         const updatedResponse = {
            page: 1,
            numPages: 1,
            pageSize: 10,
            count: 2,
            favorites: [{
               favoriteId: 10,
               mlsNumber: "CACHE1"
            }, {
               favoriteId: 11,
               mlsNumber: "NEW1"
            }]
         };
         mockFavoritesGet(cacheClientId, updatedResponse);
         const secondResult = await favoritesService.featuredListings({
            slug: cacheSlug
         });
         const secondData = unwrapCached(secondResult);
         assert.equal(secondData.count, 2);
      });
      it("should invalidate sortBy-keyed cache entries when a favorite changes", async function () {
         const favoritesService = container.resolve(FavoritesService);
         const sortInvSlug = "cache-sort-test";
         const sortInvClientId = 994;
         config.settings.featuredListings.push({
            slug: sortInvSlug,
            clientId: sortInvClientId
         });

         // Prime a sortBy-keyed cache entry
         const initial = {
            page: 1,
            numPages: 1,
            pageSize: 10,
            count: 1,
            favorites: [{
               favoriteId: 40,
               mlsNumber: "SORTC1"
            }]
         };
         mockFavoritesGet(sortInvClientId, initial, {
            sortBy: RplSortBy.bathsAsc
         });
         const firstResult = await favoritesService.featuredListings({
            slug: sortInvSlug,
            sortBy: RplSortBy.bathsAsc
         });
         assert.equal(unwrapCached(firstResult).count, 1);

         // Adding a favorite invalidates the base list and every sortBy variant
         mockFavoritesAdd();
         await favoritesService.add({
            clientId: sortInvClientId,
            mlsNumber: "SORTC2"
         });

         // The same sortBy request now hits the API again, not the cache
         const updated = {
            page: 1,
            numPages: 1,
            pageSize: 10,
            count: 2,
            favorites: [{
               favoriteId: 40,
               mlsNumber: "SORTC1"
            }, {
               favoriteId: 41,
               mlsNumber: "SORTC2"
            }]
         };
         mockFavoritesGet(sortInvClientId, updated, {
            sortBy: RplSortBy.bathsAsc
         });
         const secondResult = await favoritesService.featuredListings({
            slug: sortInvSlug,
            sortBy: RplSortBy.bathsAsc
         });
         assert.equal(unwrapCached(secondResult).count, 2);
      });
      it("should invalidate cache for the slug when a favorite is deleted for its clientId", async function () {
         const favoritesService = container.resolve(FavoritesService);
         const deleteSlug = "cache-delete-test";
         const deleteClientId = 996;
         config.settings.featuredListings.push({
            slug: deleteSlug,
            clientId: deleteClientId
         });

         // Prime the cache
         const initialResponse = {
            page: 1,
            numPages: 1,
            pageSize: 10,
            count: 2,
            favorites: [{
               favoriteId: 20,
               mlsNumber: "DEL1"
            }, {
               favoriteId: 21,
               mlsNumber: "DEL2"
            }]
         };
         mockFavoritesGet(deleteClientId, initialResponse);
         const firstResult = await favoritesService.featuredListings({
            slug: deleteSlug
         });
         const firstData = unwrapCached(firstResult);
         assert.equal(firstData.count, 2);

         // Delete a favorite — need to mock get (for ownership check) and delete
         mockFavoritesGet(deleteClientId, initialResponse);
         mockFavoritesDelete(20);
         await favoritesService.delete(deleteClientId, 20);

         // Fetch again — should hit the API, not the cache
         const updatedResponse = {
            page: 1,
            numPages: 1,
            pageSize: 10,
            count: 1,
            favorites: [{
               favoriteId: 21,
               mlsNumber: "DEL2"
            }]
         };
         mockFavoritesGet(deleteClientId, updatedResponse);
         const secondResult = await favoritesService.featuredListings({
            slug: deleteSlug
         });
         const secondData = unwrapCached(secondResult);
         assert.equal(secondData.count, 1);
      });
      it("should not invalidate cache when add/delete is for a non-featured clientId", async function () {
         const favoritesService = container.resolve(FavoritesService);
         const stableSlug = "cache-stable-test";
         const stableClientId = 995;
         const nonFeaturedClientId = 111;
         config.settings.featuredListings.push({
            slug: stableSlug,
            clientId: stableClientId
         });

         // Prime the cache
         const initialResponse = {
            page: 1,
            numPages: 1,
            pageSize: 10,
            count: 1,
            favorites: [{
               favoriteId: 30,
               mlsNumber: "STABLE1"
            }]
         };
         mockFavoritesGet(stableClientId, initialResponse);
         await favoritesService.featuredListings({
            slug: stableSlug
         });

         // Add a favorite for a different (non-featured) clientId
         mockFavoritesAdd();
         await favoritesService.add({
            clientId: nonFeaturedClientId,
            mlsNumber: "OTHER1"
         });

         // Fetch featured again — should still return cached result (no new nock mock needed)
         const cachedResult = await favoritesService.featuredListings({
            slug: stableSlug
         });
         const cachedData = unwrapCached(cachedResult);
         assert.equal(cachedData.count, 1);
      });
   });
});