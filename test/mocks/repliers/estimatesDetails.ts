import nock from "nock";
import config from "../../../src/config.js";
import { ParsedUrlQuery } from "node:querystring";
export const mockEmptyPropertyDetails = () => {
   nock(config.repliers.base_url).get("/listings").query(queryObject => {
      return queryObject.streetNumber !== undefined;
   }).reply(200, {
      page: 1,
      numPages: 1,
      pageSize: 100,
      count: 0,
      listings: []
   });
};
export const mockDynamicPropertyDetails = (matcher: (parsedObj: ParsedUrlQuery) => boolean, listings: unknown[]) => {
   nock(config.repliers.base_url).get("/listings").query(matcher).reply(200, {
      page: 1,
      numPages: 1,
      pageSize: 100,
      count: listings.length,
      listings
   });
};
export const mockTaxStats = (statistics: Record<string, {
   avg: number;
   count: number;
}>) => {
   nock(config.repliers.base_url).get("/listings").query(queryObject => {
      return queryObject.statistics === "avg-tax,grp-yr";
   }).reply(200, {
      page: 1,
      numPages: 1,
      pageSize: 100,
      count: 1,
      listings: [],
      statistics: {
         tax: {
            yr: statistics
         }
      }
   });
};
export const mockEmptyAddressLookup = () => {
   nock(config.repliers.base_url).get("/listings").query(queryObject => {
      return queryObject.minStreetNumber !== undefined;
   }).reply(200, {
      page: 1,
      numPages: 1,
      pageSize: 100,
      count: 0,
      listings: []
   });
};
export const mockSameParityAddressLookup = () => {
   nock(config.repliers.base_url).get("/listings").query(queryObject => {
      return queryObject.minStreetNumber !== undefined;
   }).reply(200, {
      page: 1,
      numPages: 1,
      pageSize: 100,
      count: 10,
      listings: [{
         address: {
            streetNumber: 160,
            neighborhood: "160"
         }
      }, {
         address: {
            streetNumber: 171,
            neighborhood: "171"
         }
      }, {
         address: {
            streetNumber: 154,
            neighborhood: "154"
         }
      }, {
         address: {
            streetNumber: 152,
            neighborhood: "152"
         }
      }]
   });
};
export const mockFailedAddressLookup = () => {
   nock(config.repliers.base_url).get("/listings").query(queryObject => {
      return queryObject.minStreetNumber !== undefined;
   }).reply(500, {
      message: "Internal Server Error"
   });
};
export const mockAverageTax = (status: number = 200, response: any = {
   statistics: {
      tax: {
         med: 1000
      }
   }
}) => {
   nock(config.repliers.base_url).get("/listings").query(queryObject => {
      return queryObject.statistics === 'med-tax';
   }).reply(status, response);
};
export const mockClientEstimatesGet = (clientId: number, estimates: unknown[] = []) => {
   nock(config.repliers.base_url).get("/estimates").query(queryObject => {
      return queryObject.clientId === String(clientId);
   }).reply(200, {
      estimates
   });
};