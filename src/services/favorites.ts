import { container, injectable } from "tsyringe";
import RepliersService from "./repliers.js";
import { FeaturedListingsResponse, RplFavoritesAddDto, RplFavoritesGetDto } from "./repliers/favorites.js";
import { ApiError } from "../lib/errors.js";
import cached, { Cached, getCacheStore, cacheKey } from "../lib/decorators/cached.ts";
import { type AppConfig } from "../config.ts";
import { RplSortBy } from "../types/repliers.js";
import { scrubbed } from "./scrubber/listings.js";
import { dropRestricted } from "./listings/listingHelpers.ts";
import { RplListingsAppState } from "../validate/listings.ts";
const config = container.resolve<AppConfig>("config");
const featuredListingsNamespace = "favorites:featuredListings";
type FeaturedListingsQuery = Omit<RplFavoritesGetDto, "clientId">;
interface FeaturedListingsParams extends FeaturedListingsQuery {
   slug: string;
   app_state?: RplListingsAppState;
}
@injectable()
export default class FavoritesService {
   constructor(private repliers: RepliersService) {}
   async add(params: RplFavoritesAddDto) {
      const result = await this.repliers.favorites.add({
         ...params
      });
      await this.invalidateFeaturedListingsCache(params.clientId);
      return result;
   }
   async get(params: RplFavoritesGetDto) {
      const {
         favorites,
         ...rest
      } = await this.repliers.favorites.get(params);
      return {
         ...rest,
         favorites: dropRestricted(favorites, config.settings.restrictedListings)
      };
   }
   async delete(clientId: number, favoriteId: number) {
      // Ownership is checked against the unfiltered list — a restricted listing the user
      // favorited earlier must still be deletable.
      const response = await this.repliers.favorites.get({
         clientId
      });
      const isOwned = response.favorites.find(fav => fav.favoriteId === favoriteId);
      if (isOwned === undefined) {
         throw new ApiError('You are not owner of that favoriteId', 400);
      }
      const result = await this.repliers.favorites.delete(favoriteId);
      await this.invalidateFeaturedListingsCache(clientId);
      return result;
   }

   // @scrubbed reads `app_state` from the first argument and scrubs the top-level
   // `listings` per request. The @cached layer below stays user-agnostic
   // (unscrubbed) — we unwrap its Cached result here so the scrubber runs on the
   // response, not on the cached copy shared across users. Mirrors how the regular
   // /search + /:mlsNumber listings are scrubbed (services/listings.ts).
   @scrubbed("listings")
   async featuredListings(params: FeaturedListingsParams): Promise<FeaturedListingsResponse> {
      const {
         slug,
         app_state: _appState,
         ...query
      } = params;
      // lat/long produce per-user, location-specific results, so they bypass the
      // cache and are fetched fresh. Otherwise the result is cached by slug + sortBy.
      const data = query.lat || query.long ? await this.fetchFeaturedListings(slug, query) : query.sortBy ? await this.cachedFeaturedListings(slug, query.sortBy) : await this.cachedFeaturedListings(slug);
      return "expires" in data ? (data as Cached<FeaturedListingsResponse>).result : data;
   }
   @cached(featuredListingsNamespace, config.cache.featuredListings.ttl_ms)
   private async cachedFeaturedListings(slug: string, sortBy?: RplSortBy): Promise<FeaturedListingsResponse | Cached<FeaturedListingsResponse>> {
      return this.fetchFeaturedListings(slug, sortBy ? {
         sortBy
      } : {});
   }
   private async fetchFeaturedListings(slug: string, params: FeaturedListingsQuery = {}): Promise<FeaturedListingsResponse> {
      const mapping = config.settings.featuredListings.find(f => f.slug === slug);
      if (!mapping) {
         throw new ApiError(`Featured listing "${slug}" not found`, 404);
      }
      const {
         favorites,
         ...rest
      } = await this.get({
         clientId: mapping.clientId,
         ...params
      });
      return {
         ...rest,
         listings: favorites
      };
   }
   private async invalidateFeaturedListingsCache(clientId: number) {
      const mapping = config.settings.featuredListings.find(f => f.clientId === clientId);
      if (!mapping) {
         return;
      }
      const cache = getCacheStore(featuredListingsNamespace);
      // Entries are keyed by slug and slug + sortBy — clear the base list and
      // every sortBy variant for this slug.
      const keys = [cacheKey(mapping.slug), ...Object.values(RplSortBy).map(sortBy => cacheKey(mapping.slug, sortBy))];
      await Promise.all(keys.map(key => cache.delete(key)));
   }
}