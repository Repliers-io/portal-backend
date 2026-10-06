import { inject, injectable, container } from "tsyringe";
import type { AutosuggestAddressDto, AutosuggestDto, BaseAutosuggestDto } from "../validate/autosuggest.js";
import MapboxService, { MapboxSuggestion } from "./mapbox.js";
import GoogleService from './google.js';
import { RplClass, RplSortBy, RplYesNo } from "../types/repliers.js";
import RepliersLocations from "./repliers/locations.js";
import { addMlsSearchVariant, mlsNumberCandidate } from "./listings/mlsNumberPrefix.ts";
import type { AppConfig } from "../config.js";
import distance from "jaro-winkler";
import addresser from "addresser";
import _ from "lodash";
import _debug from "debug";
import ListingsService from "./listings.ts";
const debug = _debug("repliers:services:autosuggest");
const config = container.resolve<AppConfig>("config");
const defaultSuffixMapKey = "Street";
const defaultSuffixMapValue = "ST";
@injectable()
export default class AutosuggestService {
   constructor(private mapboxService: MapboxService, private googleService: GoogleService, private listingsService: ListingsService, private repliersLocations: RepliersLocations, @inject("config")
   private config: AppConfig) {}
   public async search(params: AutosuggestDto) {
      const jarohash: string[] = [];
      const mapboxRequest = this.mapboxService.suggest(searchSession(params), {
         q: params.q,
         country: this.config.mapbox.autosuggest.country,
         language: this.config.mapbox.autosuggest.language,
         limit: this.config.mapbox.autosuggest.limit,
         types: this.config.mapbox.autosuggest.types,
         proximity: `${params.long},${params.lat}`
      }).then(({
         suggestions
      }) => suggestions // can be merged with map via reduce but will be less readable
      .filter(v => locationsFilter(v, this.config.mapbox.autosuggest.max_distance)).filter(v => {
         // filtering duplicates with jaro-winkler distance
         let result = true;
         const normalizedName = normalizedLocationName(v);
         for (const prev of jarohash) {
            result = result && distance(normalizedName, prev) < this.config.mapbox.autosuggest.jaro_winkler_distance;
         }
         jarohash.push(normalizedName);
         return result;
      }).slice(0, params.resultsPerPage).map(({
         name,
         mapbox_id,
         feature_type,
         context: {
            region,
            postcode,
            place,
            neighborhood
         }
      }) => ({
         name,
         mapbox_id,
         feature_type,
         region: {
            region_code: region?.region_code
         },
         postcode: {
            name: postcode?.name
         },
         place: {
            name: place?.name
         },
         neighborhood: {
            name: neighborhood?.name
         }
      })));
      const listingFields = ['mlsNumber', 'status', 'class', 'listPrice', 'listDate', 'lastStatus', 'soldPrice', 'soldDate', 'address', 'map', 'images[0]', 'details.numBathrooms', 'details.numBathroomsPlus', 'details.numBedrooms', 'details.numBedroomsPlus', 'details.propertyType', 'details.sqft', 'details.style', 'lot.depth', 'lot.width', 'lot.size', 'lot.acres', 'lot.measurement', 'updatedOn', 'daysOnMarket', 'boardId', 'permissions', 'raw', 'type'].join(",");
      const {
         listingStandardStatus,
         listingStatus,
         listingLastStatus
      } = this.config.repliers.autosuggest;
      const listingsRequestParams = {
         search: params.q,
         searchFields: this.config.repliers.autosuggest.searchFields,
         boardId: this.config.settings.defaults.boardId,
         lat: params.lat,
         long: params.long,
         radius: this.config.repliers.autosuggest.radius,
         listings: true,
         // Repliers rejects `standardStatus` combined with `status`/`lastStatus`, and the
         // instance's allowed set is applied to every query — so a RESO instance has to
         // filter by `standardStatus` alone rather than by the legacy pair.
         ...(listingStandardStatus?.length ? {
            standardStatus: listingStandardStatus
         } : {
            status: listingStatus,
            lastStatus: listingLastStatus
         }),
         ...(this.config.repliers.autosuggest.displayPublicValue !== undefined ? {
            displayPublic: this.config.repliers.autosuggest.displayPublicValue
         } : {}),
         class: [RplClass.condo, RplClass.residential],
         type: params.type ?? this.config.repliers.autosuggest.listingType,
         resultsPerPage: params.resultsPerPage,
         fields: listingFields,
         sortBy: RplSortBy.distanceAsc,
         displayInternetEntireListing: RplYesNo.Y,
         app_state: params.app_state
      };
      debug("[search] listingsRequest:", listingsRequestParams);

      // Repliers cannot OR a board-prefixed number keyword with the numeric
      // `address.streetNumber` field in one request (an unmatched numeric leg
      // zeroes the whole union), so boards with `mlsNumberPrefix` get a
      // dedicated mlsNumber-only search, widened here with the prefixed variant.
      // Widening is autosuggest-only — the general listings search never widens.
      // Failure of this leg degrades, not breaks.

      const mlsNumberRequest = this.config.settings.mlsNumberPrefix && mlsNumberCandidate(params.q) ? (() => {
         const mlsNumberParams = {
            ...listingsRequestParams,
            searchFields: "mlsNumber"
         };
         addMlsSearchVariant(mlsNumberParams, this.config.settings.mlsNumberPrefix);
         return this.listingsService.search(mlsNumberParams).catch(err => {
            debug("[mapboxAutosuggest] mlsNumber leg failed: %O", err);
            return null;
         });
      })() : null;
      const listingsRequest = this.listingsService.search(listingsRequestParams);
      const locationsRequest = this.repliersLocations.autocomplete({
         search: params.q,
         boundary: params.boundary ? "true" : "false",
         hasBoundary: params.hasBoundary == null ? null : params.hasBoundary ? "true" : "false",
         resultsPerPage: params.resultsPerPage,
         lat: parseFloat(params.lat),
         long: parseFloat(params.long),
         radius: params.radius,
         // Forward the client's requested location source ('LiveBy', 'MLS'
         // `UserDefined` geo) to the locations block. Omitted when absent, so the
         // endpoint keeps searching across all sources.
         ...(params.source ? {
            source: params.source
         } : {})
      });
      const [mapbox, listings, locations, mlsNumberListings] = await Promise.all([mapboxRequest, listingsRequest, locationsRequest, mlsNumberRequest]);
      return {
         mapbox,
         listings: mergeMlsNumberListings(listings, mlsNumberListings, params.resultsPerPage),
         locations
      };
   }
   public async address(params: AutosuggestAddressDto) {
      if (this.config.repliers.autosuggest.provider === "googlemaps") {
         return this.googleAddress(params);
      }
      return this.mapboxAddress(params);
   }
   private async mapboxAddress(params: AutosuggestAddressDto) {
      debug("[mapboxAddress]: params: %o", params);
      const mapboxRequest = await this.mapboxService.suggest(searchSession(params), {
         q: params.q,
         country: this.config.mapbox.autosuggest.country,
         language: this.config.mapbox.autosuggest.language,
         types: "address",
         proximity: `${params.long},${params.lat}`
      });
      return mapboxRequest.suggestions.filter(v => locationsFilter(v, this.config.mapbox.autosuggest.max_distance)).map(({
         address,
         full_address: fullAddress,
         mapbox_id,
         context: {
            region,
            postcode,
            country,
            address: ctxAddress,
            place
         }
      }) => {
         const {
            streetName,
            streetSuffix,
            streetDirection
         } = parseAddressSafe(fullAddress);
         debug("[mapped address] processing suggestion: %o", {
            address,
            ..._.omit(ctxAddress, "id"),
            fullAddress,
            streetName,
            streetSuffix
         });
         return {
            country: country?.country_code,
            region: region?.region_code,
            zip: postcode?.name,
            city: place?.name,
            streetNumber: ctxAddress?.address_number,
            streetName: streetSuffix ? streetName : ctxAddress?.street_name,
            streetSuffix: this.mapStreetSuffix(streetSuffix, streetName ?? ctxAddress?.street_name),
            streetSuffixFull: streetSuffix,
            streetDirection,
            fullAddress,
            address,
            mapbox_id
         };
      });
   }
   private async googleAddress(params: AutosuggestAddressDto) {
      debug("[googleAddress]: params: %o", params);

      // https://developers.google.com/maps/documentation/places/web-service/place-autocomplete
      const {
         predictions,
         status
      } = await this.googleService.autocomplete({
         input: params.q,
         language: this.config.googlemaps.language,
         location: `${params.lat},${params.long}`,
         components: `country:${this.config.googlemaps.country}`,
         types: "address",
         radius: params.radius,
         sessiontoken: searchSession(params),
         strictbounds: true,
         locationrestriction: `circle:${params.radius}@${params.lat},${params.long}`,
         includePureServiceAreaBusinesses: false,
         includedRegionCodes: this.config.googlemaps.country
      });
      if (status !== 'OK' && status !== 'ZERO_RESULTS') {
         debug("[googleAddress]: Error fetching address suggestions: %s", status);
         throw new Error(`Google API returned status: ${status}`);
      } else if (status === 'ZERO_RESULTS') {
         debug("[googleAddress]: No results found for the given query.");
         return [];
      }
      debug("[googleAddress]: Predictions received: %o", predictions);
      return predictions.map(prediction => {
         try {
            const {
               terms,
               description
            } = prediction;
            const parsedAddress = addresser.parseAddress(description);
            const country = terms.at(-1) ? terms.at(-1)?.value : 'Canada'; // Assuming last term is the country
            let address = parsedAddress.addressLine1;
            return {
               country,
               address,
               region: parsedAddress.stateAbbreviation,
               city: parsedAddress.placeName,
               streetName: parsedAddress.streetName,
               streetNumber: parsedAddress.streetNumber,
               streetDirection: parsedAddress.streetDirection,
               streetSuffix: this.mapStreetSuffix(parsedAddress.streetSuffix, parsedAddress.addressLine1),
               google_place_id: prediction.place_id,
               fullAddress: description,
               streetSuffixFull: parsedAddress.streetSuffix
            };
         } catch (error) {
            debug("[googleAddress]: Error parsing address for prediction %o: %s", prediction, error);
            return null;
         }
      }).filter(Boolean);
   }
   private suffixMap = new Map([["Acres", "ACRES"], ["Alley", "ALLEY"], ["Avenue", "AVE"], ["Bay", "BAY"], ["Beach", "BEACH"], ["Bend", "BEND"], ["Boulevard", "BLVD"], ["By-pass", "BYPASS"], ["Byway", "BYWAY"], ["Campus", "CAMPUS"], ["Cape", "CAPE"], ["Centre", "CTR"], ["Chase", "CHASE"], ["Circle", "CIR"], ["Circuit", "CIRCT"], ["Close", "CLOSE"], ["Common", "COMMON"], ["Concession", "CONC"], ["Corners", "CRNRS"], ["Court", "CRT"], ["Cove", "COVE"], ["Crescent", "CRES"], ["Crossing", "CROSS"], ["Cul-de-sac", "CDS"], ["Dale", "DALE"], ["Dell", "DELL"], ["Diversion", "DIVERS"], ["Downs", "DOWNS"], ["Drive", "DR"], ["End", "END"], ["Esplanade", "ESPL"], ["Estates", "ESTATE"], ["Expressway", "EXPY"], ["Extension", "EXTEN"], ["Farm", "FARM"], ["Field", "FIELD"], ["Forest", "FOREST"], ["Freeway", "FWY"], ["Front", "FRONT"], ["Gardens", "GDNS"], ["Gate", "GATE"], ["Glade", "GLADE"], ["Glen", "GLEN"], ["Green", "GREEN"], ["Grounds", "GRNDS"], ["Grove", "GROVE"], ["Harbour", "HARBR"], ["Heath", "HEATH"], ["Heights", "HTS"], ["Highlands", "HGHLDS"], ["Highway", "HWY"], ["Hill", "HILL"], ["Hollow", "HOLLOW"], ["Inlet", "INLET"], ["Island", "ISLAND"], ["Key", "KEY"], ["Knoll", "KNOLL"], ["Landing", "LANDNG"], ["Lane", "LANE"], ["Limits", "LMTS"], ["Line", "LINE"], ["Link", "LINK"], ["Lookout", "LKOUT"], ["Loop", "LOOP"], ["Mall", "MALL"], ["Manor", "MANOR"], ["Maze", "MAZE"], ["Meadow", "MEADOW"], ["Mews", "MEWS"], ["Moor", "MOOR"], ["Mount", "MOUNT"], ["Mountain", "MTN"], ["Orchard", "ORCH"], ["Parade", "PARADE"], ["Park", "PK"], ["Parkway", "PKY"], ["Passage", "PASS"], ["Path", "PATH"], ["Pathway", "PTWAY"], ["Pines", "PINES"], ["Place", "PL"], ["Plateau", "PLAT"], ["Plaza", "PLAZA"], ["Point", "PT"], ["Port", "PORT"], ["Private", "PVT"], ["Promenade", "PROM"], ["Quay", "QUAY"], ["Ramp", "RAMP"], ["Range", "RG"], ["Ridge", "RIDGE"], ["Rise", "RISE"], ["Road", "RD"], ["Route", "RTE"], ["Row", "ROW"], ["Run", "RUN"], ["Square", "SQ"], ["Street", "ST"], ["Subdivision", "SUBDIV"], ["Terrace", "TERR"], ["Thicket", "THICK"], ["Towers", "TOWERS"], ["Townline", "TLINE"], ["Trail", "TRAIL"], ["Turnabout", "TRNABT"], ["Vale", "VALE"], ["Via", "VIA"], ["View", "VIEW"], ["Village", "VILLGE"], ["Villas", "VILLAS"], ["Vista", "VISTA"], ["Walk", "WALK"], ["Way", "WAY"], ["Wharf", "WHARF"], ["Wood", "WOOD"], ["Wynd", "WYND"], ["Abbey", "ABBEY"]]);
   private mapStreetSuffix(suffix: string | undefined, streetName: string = "") {
      // if its possible to convert return converted
      if (suffix && this.suffixMap.has(suffix)) {
         return this.suffixMap.get(suffix);
      }

      // if it exist but not in map, just return uppercase version.
      // If no suffix found by addresser, use last word of street name and try to get mapping of it
      // default to 'ST'
      //return suffix ? suffix.toUpperCase() : streetName.split(' ').pop();
      if (suffix) {
         return suffix.toUpperCase();
      } else {
         const streetNameParts = streetName.split(" ");
         if (streetNameParts.length <= 1) {
            return defaultSuffixMapValue;
         }
         const maybeSufix = streetNameParts.pop();
         return this.suffixMap.get(maybeSufix || defaultSuffixMapKey) || defaultSuffixMapValue;
      }
   }
}
type ListingsBlock = Awaited<ReturnType<ListingsService["search"]>>;

/**
 * Appends MLS-number matches after the primary address-fields results, which
 * cannot see board-prefixed stored numbers. Primary-first keeps short digit
 * queries (street numbers, zips) behaving exactly as before, while a full
 * MLS number — which matches no address — surfaces from the MLS leg. `count`
 * becomes an upper bound — exact deduplication across the full upstream
 * result sets is unknowable from a single page.
 */
export function mergeMlsNumberListings(primary: ListingsBlock, mlsLeg: ListingsBlock | null, resultsPerPage: number): ListingsBlock {
   if (!mlsLeg?.listings?.length) return primary;
   const listings = _.uniqBy([...(primary.listings ?? []), ...mlsLeg.listings], "mlsNumber").slice(0, resultsPerPage);
   return {
      ...primary,
      listings,
      count: (primary.count ?? 0) + (mlsLeg.count ?? 0)
   };
}
function locationsFilter(v: MapboxSuggestion, distance: number): boolean {
   return (config.mapbox.autosuggest.region_code ? v.context.region?.region_code === config.mapbox.autosuggest.region_code : true) && v.distance <= distance;
}
function normalizedLocationName(v: MapboxSuggestion): string {
   const {
      name,
      context: {
         region,
         place
      }
   } = v;
   return name.toLowerCase() + (place?.name ? ` ${place.name.toLowerCase()}` : "") + (region ? ` ${region.region_code}` : "");
}

// addresser throws on strings it cannot parse; a bad suggestion must not fail the whole list.
function parseAddressSafe(fullAddress: string): Partial<ReturnType<typeof addresser.parseAddress>> {
   try {
      return addresser.parseAddress(fullAddress);
   } catch {
      return {};
   }
}
function searchSession(params: BaseAutosuggestDto): string {
   return params?.searchSession || params?.mapboxSearchSession;
}