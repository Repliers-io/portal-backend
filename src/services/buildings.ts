import { container, injectable } from "tsyringe";
import RepliersService from "./repliers.js";
import cached, { Cached } from "../lib/decorators/cached.js";
import { type AppConfig } from "../config.js";
import type { RplBuildingSingle, RplBuildingsSearchRequest, RplBuildingsSearchResponse } from "./repliers/buildings.js";
const config = container.resolve<AppConfig>("config");
@injectable()
export default class BuildingsService {
   constructor(private repliers: RepliersService) {}
   @cached("buildings:search", config.cache.buildingsSearch.ttl_ms)
   async search(params: RplBuildingsSearchRequest, usePost = false): Promise<RplBuildingsSearchResponse | Cached<RplBuildingsSearchResponse>> {
      return this.repliers.buildings.search(params, usePost);
   }
   @cached("buildings:single", config.cache.buildingsSingle.ttl_ms)
   async single(addressKey: string): Promise<RplBuildingSingle | Cached<RplBuildingSingle>> {
      return this.repliers.buildings.single(addressKey);
   }
}