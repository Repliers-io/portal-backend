import { DeepPartial } from "../lib/settings.js";
import { AppConfig } from "../config.js";

// Benton County, AR, USA - starting point in the middle of the US
const proximitySearchConfig = {
   lat: "36.489108",
   long: "-94.540129",
   radius_m: 150_000_000
};
const boardId = 110; // Sample Data board

// just follow the AppConfig structure
export default {
   nats: {
      enabled: false
   },
   auth: {
      otp: {
         ttl_ms: 1_800_000,
         /** 30 minutes */
         resend_ttl_ms: 60_000,
         /** 1 minutes */
         message: "Please use this code to finish your login: ",
         message_type: "code"
         // debug_expose_code: false, /** for development purposes only */
      },
      emailtoken: {
         expire: "30d",
         enabled: true,
         auto_otp: true
      },
      social: {
         pinterest: {
            client_id: "123",
            // DUMMY
            client_secret: "fff",
            // DUMMY
            redirect_uri: "http://localhost:3000/api/user/social/cb/pinterest"
         }
      }
   },
   app: {
      disable_persistence: true,
      useSwagger: false,
      logging: {
         loglevel: "info"
      },
      stats_top_n: 100
   },
   cache: {
      statswidget: {
         ttl_ms: 21_600_000 /** 6 hours */
      },
      autosuggest_locations: {
         ttl_ms: 86_400_000 /** 24 hours */
      }
   },
   repliers: {
      proxy_xff: false,
      autosuggest: {
         max_results: 10,
         max_results_default: 5,
         lat: proximitySearchConfig.lat,
         long: proximitySearchConfig.long,
         radius: proximitySearchConfig.radius_m
      },
      estimatesNotificationSettings: {
         sendEmailNow: true,
         sendEmailMonthly: true
      }
   },
   mapbox: {
      base_url: "https://api.mapbox.com/search/searchbox/v1",
      timeout_ms: 30_000,
      autosuggest: {
         country: "us",
         language: "en",
         limit: 10,
         max_distance: proximitySearchConfig.radius_m,
         region_code: undefined,
         // no filtering by default
         jaro_winkler_distance: 0.95 // you can override even those settings which are not possible to define via ENV
      }
   },
   boss: {
      enabled: false
   },
   eventsCollection: {
      defaultEventFields: {
         // source: "localhost",
      },
      defaultPersonFields: {
         // assignedTo: "Joe Doe",
         // tags: ["estimates", "localhost"],
      },
      propertyUrl: "/listing/[MLS_NUMBER]?boardId=[BOARD_ID]",
      clientUrl: "/agent/client/[CLIENT_ID]",
      estimateUrl: "/estimate?ulid=[ULID]",
      savedSearchUrl: "",
      defaultBoardId: `${boardId}`
   },
   settings: {
      max_estimate_id: 0,
      scrubbing: {
         ref_board_id: 9997,
         board_ids: [boardId],
         duplicates_enabled: false,
         force_display_public_yes: false
      },
      defaults: {
         boardId: [boardId],
         locations_boardId: boardId
      },
      locations: {
         drop_coordinates: true,
         allow_all_areas: false,
         allowed_areas: [],
         boardId: boardId,
         active_count_limit: 5
      },
      hide_unavailable_listings_statuses: [],
      hide_unavailable_listings_http_code: 410,
      validationVersion: "",
      // fixme: no default in config
      extended_property_details: true,
      featuredListings: []
   }
} as DeepPartial<AppConfig>; // only for convenience when manually editing