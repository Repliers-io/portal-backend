import { container, injectable } from "tsyringe";
import RepliersService from "./repliers.js";
import cached, { Cached } from "../lib/decorators/cached.js";
import { type AppConfig } from "../config.js";
import type { RplLocationsAutocompleteRequest, RplLocationsAutocompleteResposnse, RplLocationsGetRequest, RplLocationsGetResponse } from "./repliers/locations.js";
const config = container.resolve<AppConfig>("config");
@injectable()
export default class LocationsService {
   constructor(private repliers: RepliersService) {}
   @cached("locations:get", config.cache.locations.ttl_ms)
   async get(params: RplLocationsGetRequest): Promise<RplLocationsGetResponse | Cached<RplLocationsGetResponse>> {
      return this.repliers.locations.get(params);
   }
   async autocomplete(params: RplLocationsAutocompleteRequest): Promise<RplLocationsAutocompleteResposnse> {
      return this.repliers.locations.autocomplete(params);
   }
}