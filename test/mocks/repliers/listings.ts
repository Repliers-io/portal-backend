import nock from "nock";
import config from "../../../src/config.js";
import type { RplListingsSingleResponse, RplNlpResponse } from "../../../src/services/repliers/listings.js";
import { RplNlpDto } from "../../../src/validate/listings.js";

/** Captures the query/body actually sent to Repliers so tests can assert on them. */
export const mockSearch = () => {
   const sent: {
      query: Record<string, unknown>;
      body: {
         queries?: Record<string, unknown>[];
      };
   } = {
      query: {},
      body: {}
   };
   nock(config.repliers.base_url).post("/listings").query(query => {
      sent.query = query;
      return true;
   }).reply(200, (_uri, body) => {
      sent.body = body as typeof sent.body;
      return {
         page: 1,
         numPages: 1,
         pageSize: 10,
         count: 0,
         listings: []
      };
   });
   return sent;
};
export const mockSingle = (mlsNumber: string, stub: Partial<RplListingsSingleResponse>) => {
   return nock(config.repliers.base_url).get(`/listings/${mlsNumber}`).query(true).reply(200, stub);
};
export const mockNLP = (prompt: Partial<RplNlpDto>, stub: Partial<RplNlpResponse>) => {
   nock(config.repliers.base_url).post(`/listings/nlp`).query(true).reply(200, stub);
};
export const mockHistory = (stub: {
   history: Array<Record<string, unknown>>;
}) => {
   return nock(config.repliers.base_url).get(`/listings/history`).query(true).reply(200, stub);
};