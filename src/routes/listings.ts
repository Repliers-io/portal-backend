import Router from "@koa/router";
import { container } from "tsyringe";
import ListingsService from "../services/listings.js";
import { Middleware } from "koa-jwt";
import { listingCountArraySchema, listingCountSchema, listingSearchSchema, listingSimilarSchema, listingsHistorySchema, listingsLocationsSchema, listingsSingleSchema, listingsFeaturedSchema, nlpSchema } from "../validate/listings.js";
import FavoritesService from "../services/favorites.ts";
import { ApiError } from "../lib/errors.js";
import { sendCached } from "../lib/decorators/cached.js";
import { type AppConfig } from "../config.js";
import _debug from "debug";
import type { EventsCollectionMiddleware } from "../providers/middleware/eventsCollection.js";
import SelectViewPropertyParams from "../services/eventsCollection/selectors/selectViewPropertyParams.js";
import { RplClass } from "../types/repliers.js";
import { UserRole } from "../constants.js";
import { getBody } from "../lib/utils.js";
const debug = _debug("repliers:routes:listings");
const router = new Router({
   prefix: "/listings"
});
const authMiddleware = container.resolve<Middleware>("middleware.jwt.passthrough");
const config = container.resolve<AppConfig>("config");

/**
 * @openapi
 * /api/listings/search:
 *    post:
 *       tags:
 *          - Listings
 *       summary: Return list of properties from repliers API
 *       security:
 *          - bearerAuth: []
 *       parameters:
 *         - in: query
 *           name: agent
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filters listings by agent name or agent ID, for example, John Doe. Supports multiple values
 *         - in: query
 *           name: agentId
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filters listings by agent ID. Supports multiple values
 *         - in: query
 *           name: aggregates
 *           explode: false
 *           schema:
 *              type: array
 *              items:
 *                type: string
 *                enum: [class, status, lastStatus, type, address.area, address.city, address.neighborhood, details.propertyType, details.style, detail.numBedrooms, details.numBathrooms,permissions.displayPublic,details.businessType,details.businessSubType,details.basement1,details.basement2, details.garage,details.den,details.sewer,details.waterSource,details.heating,details.swimmingPool,details.yearBuilt,details.exteriorConstruction,details.sqft,details.balcony,condominium.locker,details.driveway,map, address.zip]
 *           description: Aggregates listing counts in the response by specified fields.
 *         - in: query
 *           name: aggregatesListPriceSaleBucketSize
 *           schema:
 *             type: integer
 *           description: Width of a listPrice sale bucket, in dollars. Only valid when "listPrice" is in aggregates. Repliers defaults to 100000.
 *         - in: query
 *           name: aggregatesListPriceLeaseBucketSize
 *           schema:
 *             type: integer
 *           description: Width of a listPrice lease bucket, in dollars. Only valid when "listPrice" is in aggregates. Repliers defaults to 500.
 *         - in: query
 *           name: aggregatesUnique
 *           explode: false
 *           schema:
 *              type: array
 *              items:
 *                type: string
 *                enum: [class, status, lastStatus, type, address.area, address.city, address.neighborhood, details.propertyType, details.style, detail.numBedrooms, details.numBathrooms,permissions.displayPublic,details.businessType,details.businessSubType,details.basement1,details.basement2, details.garage,details.den,details.sewer,details.waterSource,details.heating,details.swimmingPool,details.yearBuilt,details.exteriorConstruction,details.sqft,details.balcony,condominium.locker,details.driveway,map, address.zip]
 *           description: Returns unique values for specified fields.
 *         - in: query
 *           name: aggregateStatistics
 *           schema:
 *             type: boolean
 *           description: Include aggregate statistics in the response
 *         - in: query
 *           name: amenities
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: "Example usage: ?amenities=Gym&amenities=Swimming Pool"
 *         - in: query
 *           name: area
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter by the geographical area of the listing (also referred to as region)
 *         - in: query
 *           name: balcony
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filters listings by one or more values for balcony.
 *         - in: query
 *           name: bathroomQuality
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filters listings by bathroom quality
 *         - in: query
 *           name: bedroomQuality
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filters listings by bedroom quality
 *         - in: query
 *           name: basement
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filters listings by basement description using the supplied value.
 *         - in: query
 *           name: boardId
 *           schema:
 *             type: array
 *             items:
 *                type: integer
 *                format: int32
 *           description: Filter by boardId. This is only required if your account has access to more than one MLS. You may specify one or more board IDs to filter by, if not specified, returns all boards that that account has access to be default.
 *         - in: query
 *           name: boardAgentId
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filters listings by board agent ID. Supports multiple values
 *         - in: query
 *           name: brokerage
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter results by brokerage name. Supports multiple values
 *         - in: query
 *           name: businessSubType
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *         - in: query
 *           name: businessType
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *         - in: query
 *           name: city
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter listing by one or more cities
 *         - in: query
 *           name: class
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *                enum: [condo, residential, commercial]
 *           description: The class of listing to filter the search results by.
 *         - in: query
 *           name: cluster
 *           schema:
 *             type: boolean
 *           description: Enable clustering of listings
 *         - in: query
 *           name: clusterFields
 *           schema:
 *             type: string
 *           description: A comma-separated list of fields that are provided for clusters containing a single listing.
 *         - in: query
 *           name: clusterLimit
 *           schema:
 *             type: integer
 *             format: int32
 *             minimum: 1
 *             maximum: 200
 *           description: Use this parameter to limit the amount of clusters returned when "map" is specified in aggregates. This parameter can only be used if "map" is specified in aggregates.
 *         - in: query
 *           name: clusterPrecision
 *           schema:
 *             type: integer
 *             format: int32
 *             minimum: 1
 *             maximum: 29
 *           description: Use this parameter to adjust the granularity of map clusters. A lower value aggregates listings into less clusters, a higher value aggregates listings into more clusters. This parameter can only be used if "map" is specified in aggregates.
 *         - in: query
 *           name: clusterStatistics
 *           schema:
 *             type: boolean
 *           description: Include statistics in cluster results
 *         - in: query
 *           name: cooling
 *           schema:
 *             type: string
 *           description: Filter listings by cooling type
 *         - in: query
 *           name: coverImage
 *           schema:
 *             type: string
 *           description: Specify cover image preference
 *         - in: query
 *           name: den
 *           schema:
 *             type: string
 *           description: Filter listings by den description.
 *         - in: query
 *           name: diningRoomQuality
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter listings by dining room quality
 *         - in: query
 *           name: displayAddressOnInternet
 *           schema:
 *             $ref: '#/components/schemas/RplYesNo'
 *           description: If not specified, returns both listings whose address may be displayed on the internet (Y) and whose address should not be displayed on the the internet (N)
 *         - in: query
 *           name: displayInternetEntireListing
 *           schema:
 *             $ref: '#/components/schemas/RplYesNo'
 *           description: Used to filter listings permitted for display on internet portals. "Y" indicates that the listing can be displayed, "N" indicates that it can not and may only be used for back office purposes.
 *         - in: query
 *           name: displayPublic
 *           schema:
 *             $ref: '#/components/schemas/RplYesNo'
 *           description: If not specified, returns both listings that may be displayed publicly (Y) and those that should be password protected (N)
 *         - in: query
 *           name: district
 *           schema:
 *             type: string
 *           description: Filter by the geographical district of the listing
 *         - in: query
 *           name: driveway
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filters listings by one or more values for driveway.
 *         - in: query
 *           name: exteriorConstruction
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filters listings by one or more values for exteriorConstruction - note, matches details.exteriorConstruction1 and details.exteriorConstruction2 fields.
 *         - in: query
 *           name: fields
 *           schema:
 *             type: string
 *           description: "Use if you want to limit the response to containing certain fields only. For example: fields?listPrice,soldPrice would limit the response to contain listPrice and soldPrice only. You can also specify the amount of images to return, for example if a listing has 40 images total and you specify fields=images[5] it will only return the first 5 images."
 *         - in: query
 *           name: frontOfStructureQuality
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter listings by front of structure quality
 *         - in: query
 *           name: garage
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter listings by garage description.
 *         - in: query
 *           name: hasAgents
 *           schema:
 *             type: boolean
 *           description: If true, only returns listings that have a listing agent assigned to them, if false, only returns listings that do not have a listing agent assigned to them. If not specified, returns both.
 *         - in: query
 *           name: hasImages
 *           schema:
 *             type: boolean
 *           description: If not specified, returns both listings that have images (true) and listings that do not have images (false).
 *         - in: query
 *           name: heating
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filters listings by one or more values for heating.
 *         - in: query
 *           name: imagesOrder
 *           schema:
 *             type: string
 *             enum: [score, original]
 *           description: Order of images in an AI search (imageSearchItems or coverImage). "score" (Repliers default) moves the matched image first; "original" keeps the MLS order. imagesScore is aligned with the returned order either way. Repliers rejects it (400) without imageSearchItems or coverImage.
 *         - in: query
 *           name: kitchenQuality
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter listings by kitchen quality
 *         - in: query
 *           name: lastStatus
 *           schema:
 *             $ref: '#/components/schemas/RplLastStatus'
 *           description: "Filters the last status of the listing. Multiple values may be used, ie: lastStatus=sus&lastStatus=sld&laststatus=exp"
 *         - in: query
 *           name: lat
 *           schema:
 *             type: number
 *             format: float
 *           description: Accepts a value for latitude. Must be used with radius parameter to return listings within a certain radius of a given latitude and longitude.
 *         - in: query
 *           name: listDate
 *           schema:
 *             $ref: '#/components/schemas/RplDate'
 *           description: "Filter listings by a specific date that the listings were added to the MLS. Date format: YYYY-MM-DD"
 *         - in: query
 *           name: listings
 *           schema:
 *             type: boolean
 *           description: If false, the listings object will be empty. Useful for speeding up responses when statistics and aggregates are requested and listings are not needed.
 *         - in: query
 *           name: livingRoomQuality
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter listings by living room quality
 *         - in: query
 *           name: locationId
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filters listings by one or more values for locationId.
 *         - in: query
 *           name: locker
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filters listings by one or more values for locker.
 *         - in: query
 *           name: long
 *           schema:
 *             type: number
 *             format: float
 *           description: Accepts a value for longitude. Must be used with radius parameter to return listings within a certain radius of a given latitude and longitude.
 *         - in: query
 *           name: map
 *           schema:
 *             $ref: '#/components/schemas/RplMapFlexible'
 *           description: Polygon coordinates for map filtering (alternative to request body)
 *         - in: query
 *           name: mapOperator
 *           schema:
 *             $ref: '#/components/schemas/RplOperator'
 *           description: Operator for map filtering
 *         - in: query
 *           name: maxBaths
 *           schema:
 *             type: number
 *             format: int32
 *         - in: query
 *           name: maxBathrooms
 *           schema:
 *             type: number
 *             format: int32
 *         - in: query
 *           name: maxBeds
 *           schema:
 *             type: number
 *             format: int32
 *         - in: query
 *           name: maxBedrooms
 *           schema:
 *             type: number
 *             format: int32
 *         - in: query
 *           name: maxBedsPlus
 *           schema:
 *             type: number
 *             format: int32
 *           description: "If supplied, filters listings that have an amount of plus bedrooms that's no greater than the supplied value. A plus bedroom is a bedroom that was not part of the original floorplan such as a den that was converted to a bedroom or a bedroom that was added to a basement (below grade)."
 *         - in: query
 *           name: maxKitchens
 *           schema:
 *             type: number
 *             format: int32
 *         - in: query
 *           name: maxListDate
 *           schema:
 *             $ref: '#/components/schemas/RplDate'
 *           description: Filter listings that were listed on or before the supplied value.
 *         - in: query
 *           name: maxMaintenanceFee
 *           schema:
 *             type: number
 *             format: int32
 *           description: If supplied, filters listings whose maintenance fee is <= the supplied value.
 *         - in: query
 *           name: maxOpenHouseDate
 *           schema:
 *             $ref: '#/components/schemas/RplDate'
 *           description: If specified, filters listings that have an open house on or before the supplied date.
 *         - in: query
 *           name: maxPrice
 *           schema:
 *             type: number
 *             format: int32
 *         - in: query
 *           name: maxQuality
 *           schema:
 *             type: number
 *           description: Maximum quality rating filter
 *         - in: query
 *           name: maxRepliersUpdatedOn
 *           schema:
 *             $ref: '#/components/schemas/RplDate'
 *           description: Filter listings updated on Repliers on or before this date
 *         - in: query
 *           name: maxSoldDate
 *           schema:
 *             $ref: '#/components/schemas/RplDate'
 *           description: Filter listings that were sold/leased on or before the supplied value.
 *         - in: query
 *           name: maxSoldPrice
 *           schema:
 *             type: number
 *             format: int32
 *           description: Filter listings whose sold price is <= the supplied value.
 *         - in: query
 *           name: maxSqft
 *           schema:
 *             type: number
 *             format: int32
 *           description: Filter listings whose square footage is <= the supplied value. Note - excludes listings where the sqft value is not supplied by the MLS.
 *         - in: query
 *           name: maxTaxes
 *           schema:
 *             type: number
 *             format: int32
 *           description: Filter listings whose taxes are <= the supplied value
 *         - in: query
 *           name: maxUnavailableDate
 *           schema:
 *             $ref: '#/components/schemas/RplDate'
 *           description: Filter listings that became unavailable on or before the supplied value. Not all MLSes support this parameter.
 *         - in: query
 *           name: maxUpdatedOn
 *           schema:
 *             $ref: '#/components/schemas/RplDate'
 *           description: Filter listings that were updated on or before the supplied value.
 *         - in: query
 *           name: maxYearBuilt
 *           schema:
 *             type: number
 *             format: int32
 *           description: Filter listings whose year built value is <= the supplied value. excludes listings where the year built value is not supplied by the MLS.
 *         - in: query
 *           name: minBaths
 *           schema:
 *             type: number
 *             format: int32
 *         - in: query
 *           name: minBathrooms
 *           schema:
 *             type: number
 *             format: int32
 *         - in: query
 *           name: minBeds
 *           schema:
 *             type: number
 *             format: int32
 *         - in: query
 *           name: minBedrooms
 *           schema:
 *             type: number
 *             format: int32
 *         - in: query
 *           name: minBedsPlus
 *           schema:
 *             type: number
 *             format: int32
 *           description: If supplied, filters listings that have an amount of plus bedrooms that's no less than the supplied value. A plus bedroom is a bedroom that was not part of the original floorplan such as a den that was converted to a bedroom or a bedroom that was added to a basement (below grade).
 *         - in: query
 *           name: minGarageSpaces
 *           schema:
 *             type: number
 *             format: int32
 *           description: Filters listings that have >= the supplied value of garage spaces.
 *         - in: query
 *           name: minKitchens
 *           schema:
 *             type: number
 *             format: int32
 *         - in: query
 *           name: minListDate
 *           schema:
 *             $ref: '#/components/schemas/RplDate'
 *           description: Filter listings that were listed on or after the supplied value.
 *         - in: query
 *           name: minOpenHouseDate
 *           schema:
 *             $ref: '#/components/schemas/RplDate'
 *           description: If specified, filters listings that have an open house on or after the supplied date
 *         - in: query
 *           name: minParkingSpaces
 *           schema:
 *             type: number
 *             format: int32
 *         - in: query
 *           name: minPrice
 *           schema:
 *             type: number
 *             format: int32
 *         - in: query
 *           name: minQuality
 *           schema:
 *             type: number
 *           description: Minimum quality rating filter
 *         - in: query
 *           name: minRepliersUpdatedOn
 *           schema:
 *             $ref: '#/components/schemas/RplDate'
 *           description: Filter listings updated on Repliers on or after this date
 *         - in: query
 *           name: minSoldDate
 *           schema:
 *             $ref: '#/components/schemas/RplDate'
 *           description: Filter listings that were sold/leased on or after the supplied value
 *         - in: query
 *           name: minSoldPrice
 *           schema:
 *             type: number
 *             format: int32
 *           description: Filter listings whose sold price is >= the supplied value.
 *         - in: query
 *           name: minSqft
 *           schema:
 *             type: number
 *             format: int32
 *           description: Filter listings whose square footage is >= the supplied value. Note - excludes listings where the sqft value is not supplied by the MLS.
 *         - in: query
 *           name: minUnavailableDate
 *           schema:
 *             $ref: '#/components/schemas/RplDate'
 *           description: Filter listings that became unavailable on or after the supplied value. Not all MLSes support this parameter.
 *         - in: query
 *           name: minUpdatedOn
 *           schema:
 *             $ref: '#/components/schemas/RplDate'
 *           description: Filter listings that were updated on or after the supplied value
 *         - in: query
 *           name: minYearBuilt
 *           schema:
 *             type: number
 *             format: int32
 *           description: Filter listings whose year built value is >= the supplied value. excludes listings where the year built value is not supplied by the MLS.
 *         - in: query
 *           name: mlsNumber
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter listings by one or more MLS numbers.
 *         - in: query
 *           name: neighborhood
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter by the geographical neighborhood that the listing is situated in.
 *           example: ["Sonoma Heights", "Vellore Village"]
 *         - in: query
 *           name: officeId
 *           schema:
 *             type: string
 *           description: Filter listings by the office ID of the listing brokerage.
 *         - in: query
 *           name: operator
 *           schema:
 *             $ref: '#/components/schemas/RplOperatorExtended'
 *           description: Logical operator across filter fields (case-insensitive). Use "AND"/"OR" to apply to all fields, or "AND:<fieldName>"/"OR:<fieldName>" to scope to a single field. Accepts either a single value or an array.
 *         - in: query
 *           name: overallQuality
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter listings by overall quality rating
 *         - in: query
 *           name: pageNum
 *           schema:
 *             type: number
 *             format: integer
 *           description: If specified indexes a specific page in the results set. For example, if there are 1000 listings and 100 listings per page, if you'd like to view listings 101-201 you'd specify pageNum=2
 *         - in: query
 *           name: propertyType
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filters listings by one or more property types.
 *         - in: query
 *           name: radius
 *           schema:
 *             type: number
 *             format: integer
 *           description: Accepts a value for radius in KM. Must be used with lat and long parameters to return listings within a certain radius of a given latitude and longitude.
 *         - in: query
 *           name: resultsPerPage
 *           schema:
 *             type: number
 *             format: integer
 *           description: The amount of listings to return in each page of the results set.
 *         - in: query
 *           name: search
 *           schema:
 *             type: string
 *           description: One or more keywords may be specified to filter the results by.
 *         - in: query
 *           name: searchFields
 *           schema:
 *             type: string
 *           description: To be used in conjunction with the "search" parameter. If specified, limits the keyword search to specific fields. For example, if search=yonge and you want to limit the search to streetName you would specify searchFields=address.streetName
 *         - in: query
 *           name: sortBy
 *           schema:
 *             $ref: '#/components/schemas/RplSortBy'
 *           description: The attribute that the listings will be sorted by. Note, distanceAsc and distanceDesc must be used in combination with lat, long and radius parameters.
 *         - in: query
 *           name: sqft
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filters listings by one or more values for sqft.
 *         - in: query
 *           name: statistics
 *           explode: false
 *           schema:
 *             $ref: '#/components/schemas/RplStatistics'
 *           description: |
 *                For example: GET /listings?statistics=avg-listPrice,avg-daysOnMarket&type=sale&city=Toronto would provide the average list price and average days on market for all re-sale properties in the city of Toronto.
 *
 *                You can also group the statistics by year and/or month by adding grp-mth and/or grp-yr values to the request, for example, GET /listings?statistics=grp-mth,avg-listPrice would provide the average list price grouped by month for current active listings.
 *
 *                Supported calculations include average (avg), minimum (min), maximum (max), count (cnt), median (med), standard deviation (sd) and sum (sum) for metrics like listPrice, soldPrice, daysOnMarket, new listings, closed listings and available listings.
 *
 *         - in: query
 *           name: status
 *           schema:
 *             $ref: '#/components/schemas/RplStatus'
 *           description: Set status=A to retrieve active listings. Set status=U to retrieve unavailable listings. Set status=A&status=U to retrieve both active and unavailable listings.
 *         - in: query
 *           name: streetDirection
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter by the street direction of the listing, for example "W"
 *         - in: query
 *           name: streetName
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter by the street name of the listing (excluding the street suffix and direction, for example "Yonge")
 *         - in: query
 *           name: streetNumber
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter by the street number of the listing.
 *         - in: query
 *           name: style
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter by the property style of the listing.
 *         - in: query
 *           name: swimmingPool
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter listings by one of more values for swimmingPool.
 *         - in: query
 *           name: type
 *           schema:
 *             $ref: '#/components/schemas/RplType'
 *           description: Used to filter properties that are for sale or for lease. If not specified, will return listings of all types.
 *         - in: query
 *           name: unitNumber
 *           schema:
 *             type: string
 *           description: Filter by the unit number of the listing.
 *         - in: query
 *           name: repliersUpdatedOn
 *           schema:
 *             $ref: '#/components/schemas/RplDate'
 *           description: Filter listings by when they were last updated on Repliers
 *         - in: query
 *           name: state
 *           schema:
 *             type: string
 *           description: Filter by state/province
 *         - in: query
 *           name: streetSuffix
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter by the street suffix of the listing (e.g., St, Ave, Rd)
 *         - in: query
 *           name: updatedOn
 *           schema:
 *             $ref: '#/components/schemas/RplDate'
 *           description: Filter listings by a specific date that the listings were last updated on the MLS
 *         - in: query
 *           name: waterSource
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter listings by one or more values for waterSource.
 *         - in: query
 *           name: waterfront
 *           schema:
 *             $ref: '#/components/schemas/RplYesNo'
 *           description: Filter listings by waterfront status
 *         - in: query
 *           name: sewer
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filters listings by one or more values for sewer.
 *         - in: query
 *           name: yearBuilt
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter listings by one or more values for yearBuilt.
 *         - in: query
 *           name: zip
 *           schema:
 *             type: string
 *           description: Filters listings by postal or zip code.
 *         - in: query
 *           name: zoning
 *           schema:
 *             type: string
 *           description: Filter listings by zoning description.
 *         - in: query
 *           name: activeMaxListDate
 *           schema:
 *             $ref: '#/components/schemas/RplDate'
 *           description: Filter active listings listed on or before the supplied date.
 *         - in: query
 *           name: activeMinListDate
 *           schema:
 *             $ref: '#/components/schemas/RplDate'
 *           description: Filter active listings listed on or after the supplied date.
 *         - in: query
 *           name: createdOn
 *           schema:
 *             $ref: '#/components/schemas/RplDate'
 *           description: Filter listings by the date they were first created in Repliers.
 *         - in: query
 *           name: maxPriceChangeDateTime
 *           schema:
 *             $ref: '#/components/schemas/RplDate'
 *           description: Filter listings whose last price change occurred on or before the supplied value.
 *         - in: query
 *           name: minPriceChangeDateTime
 *           schema:
 *             $ref: '#/components/schemas/RplDate'
 *           description: Filter listings whose last price change occurred on or after the supplied value.
 *         - in: query
 *           name: addressKey
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter listings by one or more address keys.
 *         - in: query
 *           name: areaOrCity
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter by area or city — matches either field.
 *         - in: query
 *           name: cityOrDistrict
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter by city or district — matches either field.
 *         - in: query
 *           name: maxStreetNumber
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter listings whose street number is <= the supplied value.
 *         - in: query
 *           name: minStreetNumber
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter listings whose street number is >= the supplied value.
 *         - in: query
 *           name: parkingType
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter listings by one or more parking types.
 *         - in: query
 *           name: propertySubType
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter listings by one or more property sub-types.
 *         - in: query
 *           name: propertyTypeOrStyle
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter by property type or style — matches either field.
 *         - in: query
 *           name: openHouseStatus
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter listings by open-house status.
 *         - in: query
 *           name: openHouseType
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *           description: Filter listings by open-house type.
 *         - in: query
 *           name: fuzzySearch
 *           schema:
 *             type: boolean
 *           description: Enable fuzzy matching on keyword search.
 *         - in: query
 *           name: searchOperator
 *           schema:
 *             type: string
 *           description: Logical operator applied to the keyword search ("AND" / "OR").
 *         - in: query
 *           name: amenitiesOperator
 *           schema:
 *             type: string
 *           description: Logical operator applied to the amenities filter ("AND" / "OR").
 *         - in: query
 *           name: maxBedroomsPlus
 *           schema:
 *             type: number
 *             format: int32
 *           description: Filter listings whose plus-bedrooms count is <= the supplied value.
 *         - in: query
 *           name: minBedroomsPlus
 *           schema:
 *             type: number
 *             format: int32
 *           description: Filter listings whose plus-bedrooms count is >= the supplied value.
 *         - in: query
 *           name: maxBedroomsTotal
 *           schema:
 *             type: number
 *             format: int32
 *           description: Filter listings whose total bedroom count (incl. plus) is <= the supplied value.
 *         - in: query
 *           name: minBedroomsTotal
 *           schema:
 *             type: number
 *             format: int32
 *           description: Filter listings whose total bedroom count (incl. plus) is >= the supplied value.
 *         - in: query
 *           name: maxCoveredSpaces
 *           schema:
 *             type: number
 *             format: int32
 *           description: Filter listings whose covered parking spaces are <= the supplied value.
 *         - in: query
 *           name: minCoveredSpaces
 *           schema:
 *             type: number
 *             format: int32
 *           description: Filter listings whose covered parking spaces are >= the supplied value.
 *         - in: query
 *           name: maxParkingSpaces
 *           schema:
 *             type: number
 *             format: int32
 *           description: Filter listings whose parking spaces are <= the supplied value.
 *         - in: query
 *           name: maxLotSizeSqft
 *           schema:
 *             type: number
 *             format: int32
 *           description: Filter listings whose lot size (sqft) is <= the supplied value.
 *         - in: query
 *           name: minLotSizeSqft
 *           schema:
 *             type: number
 *             format: int32
 *           description: Filter listings whose lot size (sqft) is >= the supplied value.
 *         - in: query
 *           name: maxStories
 *           schema:
 *             type: number
 *             format: int32
 *           description: Filter listings whose number of stories is <= the supplied value.
 *         - in: query
 *           name: minStories
 *           schema:
 *             type: number
 *             format: int32
 *           description: Filter listings whose number of stories is >= the supplied value.
 *         - in: query
 *           name: maxDaysOnMarket
 *           schema:
 *             type: number
 *             format: int32
 *           description: Filter listings whose days on market is <= the supplied value.
 *         - in: query
 *           name: minDaysOnMarket
 *           schema:
 *             type: number
 *             format: int32
 *           description: Filter listings whose days on market is >= the supplied value.
 *         - in: query
 *           name: maxEstimate
 *           schema:
 *             type: number
 *             format: int32
 *           description: Filter listings whose estimated value is <= the supplied value.
 *         - in: query
 *           name: minEstimate
 *           schema:
 *             type: number
 *             format: int32
 *           description: Filter listings whose estimated value is >= the supplied value.
 *         - in: query
 *           name: clusterListingsThreshold
 *           schema:
 *             type: number
 *             format: int32
 *           description: Maximum listings per cluster before a cluster is split — only valid when "map" is in aggregates.
 *         - in: query
 *           name: lastPriceChangeType
 *           schema:
 *             type: string
 *             enum: [decrease, increase]
 *           description: Filter listings whose last price change was a decrease or an increase.
 *         - in: query
 *           name: standardStatus
 *           schema:
 *             type: array
 *             items:
 *                type: string
 *                enum: [Active, "Active Under Contract", Canceled, Closed, "Coming Soon", Delete, Expired, Hold, Incomplete, Pending, Withdrawn]
 *           description: Filter listings by RESO StandardStatus. Supports multiple values.
 *       requestBody:
 *          content:
 *             application/json:
 *                example:
 *                   imageSearchItems:
 *                      - type: text
 *                        value: "wine cellar"
 *                        boost: 1
 *                      - type: text
 *                        value: "white kitchen"
 *                        boost: 1
 *                      - type: image
 *                        url: https://plus.unsplash.com/premium_photo-1682889762731-375a6b22d794
 *                        boost: 1
 *                schema:
 *                   type: object
 *                   properties:
 *                      map:
 *                         $ref: '#/components/schemas/RplMap'
 *                      imageSearchItems:
 *                         type: array
 *                         items:
 *                            oneOf:
 *                               - allOf:
 *                                  - type: object
 *                                    required: [type, boost]
 *                                    properties:
 *                                       type:
 *                                          type: string
 *                                          enum: [text]
 *                                       boost:
 *                                          type: number
 *                                  - type: object
 *                                    required: [value]
 *                                    properties:
 *                                       value:
 *                                          type: string
 *                               - allOf:
 *                                  - type: object
 *                                    required: [type, boost]
 *                                    properties:
 *                                       type:
 *                                          type: string
 *                                          enum: [image]
 *                                       boost:
 *                                          type: number
 *                                  - type: object
 *                                    required: [url]
 *                                    properties:
 *                                       url:
 *                                          type: string
 *                            discriminator:
 *                               propertyName: type
 *       responses:
 *          200:
 *             description: List of properties
 *             content:
 *                application/json:
 *                   schema:
 *                      type: object
 *                      properties:
 *                         page:
 *                            type: number
 *                         numPages:
 *                            type: number
 *                         pageSize:
 *                            type: number
 *                         count:
 *                            type: number
 *                         statistics:
 *                            type: object
 *                         listings:
 *                            type: array
 *                            items:
 *                               type: object
 *          400:
 *             $ref: '#/components/responses/BadRequest'
 */
router.post("/search", authMiddleware, async ctx => {
   ctx.state['enable.xff'] = true;
   const listingsService = ctx.state.container.resolve(ListingsService);
   debug("/search query: %O", ctx.request.query);
   const payload = {
      ...ctx.request.query,
      body: ctx.request.body,
      app_state: {
         user: ctx.state["user"]
      }
   };
   const {
      error,
      value
   } = listingSearchSchema.validate(payload);
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   ctx.body = await listingsService.search(value);
});
router.get("/search", authMiddleware, async ctx => {
   ctx.state['enable.xff'] = true;
   const listingsService = ctx.state.container.resolve(ListingsService);
   debug("/search query: %O", ctx.request.query);
   const payload = {
      ...ctx.request.query,
      app_state: {
         user: ctx.state["user"]
      }
   };
   const {
      error,
      value
   } = listingSearchSchema.validate(payload);
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   ctx.body = await listingsService.search(value);
});
router.get("/count", authMiddleware, async ctx => {
   ctx.state['enable.xff'] = true;
   const listingsService = ctx.state.container.resolve(ListingsService);
   debug("/count query: %O", ctx.request.query);
   const {
      error,
      value
   } = listingCountSchema.validate(ctx.request.query);
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const data = await listingsService.count(value);
   sendCached(ctx, data);
});
router.post("/count", authMiddleware, async ctx => {
   ctx.state['enable.xff'] = true;
   const listingsService = ctx.state.container.resolve(ListingsService);
   debug("POST /count body: %O", ctx.request.body);
   const payload = [
   // this is because koa-body didn't expect that body can be an array
   ...(ctx.request.body as unknown as any[])];
   const {
      error,
      value
   } = listingCountArraySchema.validate(payload);
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const result = await listingsService.countArray(value);
   ctx.body = result;
});

/**
*  @openapi
*     /api/listings/{mlsNumber}/similar:
*        get:
*           tags:
*              - Listings
*           summary:
*           security:
*              - bearerAuth: []
*           parameters:
*              - in: path
*                name:  mlsNumber
*                schema:
*                    type: string
*              - in: query
*                name: boardId
*                schema:
*                   type: array
*                   items:
*                      type: integer
*                      format: int32
*              - in: query
*                name: listPriceRange
*                schema:
*                   type: integer
*                   format: int32
*              - in: query
*                name: radius
*                schema:
*                   type: integer
*                   format: int32
*              - in: query
*                name: sortBy
*                schema:
*                   $ref: '#/components/schemas/RplSimilarSortBy'
*           responses:
*              200:
*                 description: List of simillar properties
*                 content:
*                    application/json:
*                       schema:
*                          type: object
*              400:
*                 $ref: '#/components/responses/BadRequest'
*              401:
*                 $ref: '#/components/responses/Unauthorized'
*/
router.get("/:mlsNumber/similar", authMiddleware, async ctx => {
   ctx.state['enable.xff'] = true;
   const listingsService = ctx.state.container.resolve(ListingsService);
   const payload = {
      ...ctx.request.query,
      mlsNumber: ctx.params["mlsNumber"],
      app_state: {
         user: ctx.state["user"]
      }
   };
   const {
      error,
      value
   } = listingSimilarSchema.validate(payload);
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   ctx.body = await listingsService.similar(value);
});

/**
*  @openapi
*     /api/listings/locations:
*        get:
*           tags:
*              - Listings
*           summary:
*           security:
*              - bearerAuth: []
*           parameters:
*              - in: query
*                name: boardId
*                schema:
*                   type: integer
*                   format: number
*              - in: query
*                name: area
*                schema:
*                   type: string
*              - in: query
*                name: city
*                schema:
*                   type: string
*              - in: query
*                name: neighborhood
*                schema:
*                   type: string
*              - in: query
*                name: activeCountLimit
*                schema:
*                   type: number
*                   format: int32
*           responses:
*              200:
*                 description:
*                 content:
*                    application/json:
*                       schema:
*                          type: object
*              400:
*                 $ref: '#/components/responses/BadRequest'
*              401:
*                 $ref: '#/components/responses/Unauthorized'
*/
/**
 * @deprecated This route is deprecated in favor of the GET /locations.
 */
router.get("/locations", authMiddleware, async ctx => {
   ctx.state['enable.xff'] = true;
   const dropCoordinates = ctx.request.query["dropCoordinates"] === undefined ? config.settings.locations.drop_coordinates : ctx.request.query["dropCoordinates"];
   const payload = {
      ...ctx.request.query,
      class: [RplClass.residential, RplClass.condo],
      dropCoordinates
   };
   const {
      error,
      value
   } = listingsLocationsSchema.validate(payload);
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const listingsService = ctx.state.container.resolve(ListingsService);
   const data = await listingsService.locations(value);
   sendCached(ctx, data);
});

/**
*  @openapi
*     /api/listings/nlp:
*        post:
*           tags:
*              - Listings
*           summary: Natural language property search
*           security:
*              - bearerAuth: []
*           requestBody:
*              required: true
*              content:
*                 application/json:
*                    schema:
*                       type: object
*                       required:
*                          - prompt
*                       properties:
*                          prompt:
*                             type: string
*                          nlpId:
*                             type: string
*                             format: uuid
*                          nlpVersion:
*                             type: string
*                             maxLength: 10
*                          statistics:
*                             type: string
*                          aggregates:
*                             type: string
*                             maxLength: 1024
*           responses:
*              200:
*                 description: NLP search results
*                 content:
*                    application/json:
*                       schema:
*                          type: object
*              400:
*                 $ref: '#/components/responses/BadRequest'
*              401:
*                 $ref: '#/components/responses/Unauthorized'
*/
router.post('/nlp', authMiddleware, async ctx => {
   ctx.state['enable.xff'] = true;
   const payload = {
      ...getBody(ctx.request.body),
      app_state: {
         user: ctx.state["user"]
      }
   };
   const {
      error,
      value
   } = nlpSchema.validate(payload);
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const listingsService = ctx.state.container.resolve(ListingsService);
   ctx.body = await listingsService.nlp(value);
});
/**
*  @openapi
*     /api/listings/featured/{slug}:
*        get:
*           tags:
*              - Listings
*           summary: Get featured listings by slug
*           security:
*              - bearerAuth: []
*           parameters:
*              - in: path
*                name: slug
*                required: true
*                schema:
*                   type: string
*                   pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$'
*              - in: query
*                name: sortBy
*                schema:
*                   $ref: '#/components/schemas/RplSortBy'
*                description: The attribute that the featured listings will be sorted by. Note, distanceAsc and distanceDesc must be used in combination with lat and long parameters.
*              - in: query
*                name: lat
*                schema:
*                   type: string
*                description: Latitude used together with long to sort featured listings by distance.
*              - in: query
*                name: long
*                schema:
*                   type: string
*                description: Longitude used together with lat to sort featured listings by distance.
*           responses:
*              200:
*                 description: Featured listings
*                 content:
*                    application/json:
*                       schema:
*                          type: object
*              400:
*                 $ref: '#/components/responses/BadRequest'
*              401:
*                 $ref: '#/components/responses/Unauthorized'
*/
router.get('/featured/:slug', authMiddleware, async ctx => {
   ctx.state['enable.xff'] = true;
   const {
      error,
      value
   } = listingsFeaturedSchema.validate({
      ...ctx.request.query,
      slug: ctx.params["slug"]
   }, {
      stripUnknown: true
   });
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const favoritesService = ctx.state.container.resolve(FavoritesService);
   const data = await favoritesService.featuredListings({
      ...value,
      app_state: {
         user: ctx.state["user"]
      }
   });
   sendCached(ctx, data);
});

/**
*  @openapi
*     /api/listings/history:
*        get:
*           tags:
*              - Listings
*           summary: Cross-board history of the property behind an MLS number
*           security:
*              - bearerAuth: []
*           parameters:
*              - in: query
*                name: mlsNumber
*                required: true
*                schema:
*                   $ref: '#/components/schemas/mlsNumber'
*           responses:
*              200:
*                 description: Property history, newest first
*                 content:
*                    application/json:
*                       schema:
*                          type: object
*                          properties:
*                             history:
*                                type: array
*                                items:
*                                   type: object
*              400:
*                 $ref: '#/components/responses/BadRequest'
*/
// Registered above `/:mlsNumber` — @koa/router matches in registration order, so the
// parametric route would otherwise swallow this path.
router.get("/history", authMiddleware, async ctx => {
   ctx.state['enable.xff'] = true;
   const listingsService = ctx.state.container.resolve(ListingsService);
   const payload = {
      ...ctx.request.query,
      app_state: {
         user: ctx.state["user"]
      }
   };
   const {
      error,
      value
   } = listingsHistorySchema.validate(payload);
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   ctx.body = await listingsService.history(value);
});

/**
*  @openapi
*     /api/listings/{mlsNumber}:
*        get:
*           tags:
*              - Listings
*           summary:
*           security:
*              - bearerAuth: []
*           parameters:
*              - in: path
*                name:  mlsNumber
*                schema:
*                    type: integer
*                    format: int32
*                required: true
*              - in: query
*                name: boardId
*                schema:
*                   type: integer
*                   format: number
*              - in: query
*                name: fields
*                schema:
*                   type: string
*                   enum: [raw]
*              - in: query
*                name: dynamicComparables
*                schema:
*                   type: boolean
*              - in: query
*                name: locations
*                description: If true, fetches locations whose boundary contains this listing's coordinates.
*                schema:
*                   type: boolean
*              - in: query
*                name: locationsSource
*                description: Filters locations returned by `locations=true` by source.
*                schema:
*                   type: array
*                   items:
*                      type: string
*                      enum: [MLS, UserDefined, LiveBy]
*              - in: query
*                name: locationsType
*                description: Filters locations returned by `locations=true` by type.
*                schema:
*                   type: array
*                   items:
*                      type: string
*                      enum: [area, city, city-alternate, neighborhood, neighborhood-alternate, postalCode, schoolDistrict, district, school]
*           responses:
*              200:
*                 description:
*                 content:
*                    application/json:
*                       schema:
*                          type: object
*              400:
*                 $ref: '#/components/responses/BadRequest'
*              401:
*                 $ref: '#/components/responses/Unauthorized'
*/
router.get('/:mlsNumber', authMiddleware, async (ctx, next) => {
   ctx.state['enable.xff'] = true;
   const listingsService = ctx.state.container.resolve(ListingsService);
   const payload = {
      mlsNumber: ctx.params['mlsNumber'],
      ...ctx.request.query,
      app_state: {
         user: ctx.state["user"]
      }
   };
   const {
      error,
      value
   } = listingsSingleSchema.validate(payload);
   if (error) {
      ctx.throw(new ApiError(error.message, 400));
      return;
   }
   const data = await listingsService.single(value);
   debug("[/:mlsNumber]: %O", data);
   ctx.body = data;
   next();
}, (ctx, next) => {
   const user = ctx.state["user"];
   if (user && user.role === UserRole.Agent) {
      // skipping view events for agents
      return next();
   }
   const selectViewPropertyParams = ctx.state.container.resolve(SelectViewPropertyParams);
   const eventsCollectionMiddleware = ctx.state.container.resolve<EventsCollectionMiddleware>("middleware.eventsCollection");
   const showPropertyEventsCollector = eventsCollectionMiddleware({
      selector: selectViewPropertyParams.select
   });
   return showPropertyEventsCollector(ctx, next);
});
export default router;