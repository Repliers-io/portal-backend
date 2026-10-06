import nock from "nock";
import config from "../../../src/config.js";
import type { RplFavoritesGetResponse, RplFavoritesAddResponse, RplFavoritesDeleteResponse } from "../../../src/services/repliers/favorites.js";

/** Returns the query actually sent to Repliers, populated once the request fires. */
export const mockFavoritesGet = (clientId: number, stub: Partial<RplFavoritesGetResponse>, expectedQuery: Record<string, string> = {}) => {
   const sent: {
      query: Record<string, unknown>;
   } = {
      query: {}
   };
   nock(config.repliers.base_url).get("/favorites").query(query => {
      sent.query = query;
      return Number(query.clientId) === clientId && Object.entries(expectedQuery).every(([key, val]) => query[key] === val);
   }).reply(200, stub);
   return sent;
};
export const mockFavoritesAdd = (stub: Partial<RplFavoritesAddResponse> = {}) => {
   return nock(config.repliers.base_url).post("/favorites").reply(200, stub);
};
export const mockFavoritesDelete = (favoriteId: number, stub: Partial<RplFavoritesDeleteResponse> = {}) => {
   return nock(config.repliers.base_url).delete(`/favorites/${favoriteId}`).reply(200, stub);
};