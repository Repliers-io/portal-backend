import { injectable } from "tsyringe";
import RepliersListings from "./repliers/listings.js";
import RepliersMessages from "./repliers/messages.js";
import RepliersClients from "./repliers/clients.js";
import RepliersFavorites from "./repliers/favorites.js";
import RepliersSearches from "./repliers/searches.js";
import RepliersEstimate from "./repliers/estimate.js";
import RepliersAgents from "./repliers/agents.js";
import RepliersLocations from "./repliers/locations.js";
import RepliersBuildings from "./repliers/buildings.js";
@injectable()
export default class RepliersService {
   constructor(public listings: RepliersListings, public messages: RepliersMessages, public clients: RepliersClients, public favorites: RepliersFavorites, public searches: RepliersSearches, public estimate: RepliersEstimate, public agents: RepliersAgents, public locations: RepliersLocations, public buildings: RepliersBuildings) {}
}