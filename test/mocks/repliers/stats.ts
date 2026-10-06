import nock from "nock";
import config from "../../../src/config.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import { RplDateFormatter, RplType, RplYesNo } from "../../../src/types/repliers.js";
dayjs.extend(utc);
const rewriteDates = (data: Record<string, unknown>) => {
   const toDate = '2024-08-06';
   const diff = dayjs().utc().diff(dayjs.utc(toDate), "days");
   const result = {};
   for (const [key, value] of Object.entries(data)) {
      const [start, end] = key.split('_');
      const shiftedStart = dayjs.utc(start).add(diff, 'days').format(RplDateFormatter);
      const shiftedEnd = dayjs.utc(end).add(diff, 'days').format(RplDateFormatter);
      result[`${shiftedStart}_${shiftedEnd}`] = value;
   }
   return result;
};

// Every RepliersListings.search() carries these on top of the caller's params. The test
// instance declares an allowed standardStatus set, so the sold filter is the RESO one.
const searchQuery = (params: Record<string, unknown>) => ({
   listings: false,
   type: RplType.Sale,
   standardStatus: "Closed",
   class: "residential",
   displayInternetEntireListing: RplYesNo.Y,
   ...params
});
export const mockNbStats = () => {
   // Cumberland
   nock(config.repliers.base_url).get("/listings").query(searchQuery({
      statistics: "avg-soldPrice,grp-30-days",
      minSoldDate: dayjs().utc().subtract(60, "days").format(RplDateFormatter),
      district: [1110, 1113, 1114, 1115, 1116]
   })).reply(200, {
      page: 1,
      numPages: 1,
      pageSize: 100,
      count: 19,
      statistics: {
         soldPrice: {
            avg: 830817,
            "grp-30-days": rewriteDates({
               "2024-05-08_2024-06-07": {
                  count: 0,
                  avg: 0
               },
               "2024-06-07_2024-07-07": {
                  count: 10,
                  avg: 875152
               },
               "2024-07-07_2024-08-06": {
                  count: 9,
                  avg: 781556
               }
            })
         }
      },
      listings: []
   });
   nock(config.repliers.base_url).get("/listings").query(searchQuery({
      statistics: "avg-soldPrice,grp-90-days",
      minSoldDate: dayjs().utc().subtract(180, "days").format(RplDateFormatter),
      district: [1110, 1113, 1114, 1115, 1116]
   })).reply(200, {
      page: 1,
      numPages: 1,
      pageSize: 100,
      count: 50,
      statistics: {
         soldPrice: {
            avg: 808638,
            "grp-90-days": rewriteDates({
               "2023-11-10_2024-02-08": {
                  count: 0,
                  avg: 0
               },
               "2024-02-08_2024-05-08": {
                  count: 25,
                  avg: 704179
               },
               "2024-05-08_2024-08-06": {
                  count: 25,
                  avg: 913097
               }
            })
         }
      },
      listings: []
   });
   nock(config.repliers.base_url).get("/listings").query(searchQuery({
      statistics: "avg-soldPrice,grp-365-days",
      minSoldDate: dayjs().utc().subtract(2, "year").format(RplDateFormatter),
      district: [1110, 1113, 1114, 1115, 1116]
   })).reply(200, {
      page: 1,
      numPages: 2,
      pageSize: 100,
      count: 149,
      statistics: {
         soldPrice: {
            avg: 846868,
            "grp-365-days": rewriteDates({
               "2021-08-07_2022-08-07": {
                  count: 0,
                  avg: 0
               },
               "2022-08-07_2023-08-07": {
                  count: 68,
                  avg: 874712
               },
               "2023-08-07_2024-08-06": {
                  count: 81,
                  avg: 823493
               }
            })
         }
      },
      listings: []
   });

   // Orleans East
   nock(config.repliers.base_url).get("/listings").query(searchQuery({
      statistics: "avg-soldPrice,grp-30-days",
      minSoldDate: dayjs().utc().subtract(60, "days").format(RplDateFormatter),
      district: [1101, 1102, 1103, 1104, 1105, 1106, 1107, 1117, 1118, 1119]
   })).reply(200, {
      page: 1,
      numPages: 2,
      pageSize: 100,
      count: 176,
      statistics: {
         soldPrice: {
            avg: 708354,
            "grp-30-days": rewriteDates({
               "2024-05-08_2024-06-07": {
                  count: 0,
                  avg: 0
               },
               "2024-06-07_2024-07-07": {
                  count: 99,
                  avg: 713724
               },
               "2024-07-07_2024-08-06": {
                  count: 77,
                  avg: 701449
               }
            })
         }
      },
      listings: []
   });
   nock(config.repliers.base_url).get("/listings").query(searchQuery({
      statistics: "avg-soldPrice,grp-90-days",
      minSoldDate: dayjs().utc().subtract(180, "days").format(RplDateFormatter),
      district: [1101, 1102, 1103, 1104, 1105, 1106, 1107, 1117, 1118, 1119]
   })).reply(200, {
      page: 1,
      numPages: 6,
      pageSize: 100,
      count: 521,
      statistics: {
         soldPrice: {
            avg: 700436,
            "grp-90-days": rewriteDates({
               "2023-11-10_2024-02-08": {
                  count: 0,
                  avg: 0
               },
               "2024-02-08_2024-05-08": {
                  count: 252,
                  avg: 689402
               },
               "2024-05-08_2024-08-06": {
                  count: 269,
                  avg: 710773
               }
            })
         }
      },
      listings: []
   });
   nock(config.repliers.base_url).get("/listings").query(searchQuery({
      statistics: "avg-soldPrice,grp-365-days",
      minSoldDate: dayjs().utc().subtract(2, "year").format(RplDateFormatter),
      district: [1101, 1102, 1103, 1104, 1105, 1106, 1107, 1117, 1118, 1119]
   })).reply(200, {
      page: 1,
      numPages: 16,
      pageSize: 100,
      count: 1542,
      statistics: {
         soldPrice: {
            avg: 678595,
            "grp-365-days": rewriteDates({
               "2021-08-07_2022-08-07": {
                  count: 2,
                  avg: 705000
               },
               "2022-08-07_2023-08-07": {
                  count: 743,
                  avg: 670542
               },
               "2023-08-07_2024-08-06": {
                  count: 797,
                  avg: 686037
               }
            })
         }
      },
      listings: []
   });
};