import { DeepPartial } from "../../lib/settings.js";
import { AppConfig } from "../../config.js";

// Fixture preset used exclusively by test/lib/settings.test.ts to exercise
// Settings.merge() array-override semantics. Not a real deployment target.
export default {
   // Relative URL paths so the merge-tests' beforeEach (which sets urlHost)
   // produces a clean prefix instead of colliding with the base config's
   // already-resolved absolute URLs.
   eventsCollection: {
      propertyUrl: "/listing/[MLS_NUMBER]?boardId=[BOARD_ID]",
      clientUrl: "/agent/client/[CLIENT_ID]",
      estimateUrl: "/estimate/[ESTIMATE_ID]"
   },
   settings: {
      scrubbing: {
         // Intentionally omits "images" so the "no leak from trailing base items"
         // assertion can prove the preset array fully replaces the base default.
         safeFields: ["address", "class", "map", "propertyType", "type", "mlsNumber", "permissions", "status", "boardId", "listDate", "imageInsights", "duplicates", "resource"],
         // Strictly longer than the base default (history,agents,raw) so the
         // "longer preset array" assertion can prove full override, not concat.
         dropFields: ["history", "agents", "raw", "images"]
         // safeAddressFields intentionally NOT declared — covered by the
         // "arrays not declared in preset retain base defaults" assertion.
      }
   }
} as DeepPartial<AppConfig>;