# Repliers Portal Backend

This repository contains the backend API for the [Repliers Portal application](https://github.com/Repliers-io/portal-frontend). Follow the setup instructions below to get started with local development.

## Full Documentation

Full Repliers Portal Backend Documentation can be found on a dedicated [documentation website](https://portal.repliers.com/documentation/backend).

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (min 24.21)
- Git

You'll also need to obtain API keys for the following services:

- **Repliers API**: Create a free account at [https://login.repliers.com/](https://login.repliers.com/) to get your API key for real estate data access
- **Mapbox API**: Create a free account at [https://www.mapbox.com/](https://www.mapbox.com/) to get your API key for location and mapping features

### Installation

1. **Clone the repository**

   ```bash
   git clone git@github.com:Repliers-io/portal-backend.git
   cd portal-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Generate JWT keys**

   Generate the required JWT private and public keys:

   ```bash
   npm run jwt:generate
   ```

4. **Configure environment variables**

   Create a `.env` file based on the provided `env.example` template:

   ```bash
   cp env.example .env
   ```

   Edit the `.env` file with your specific configuration values. Make sure to add your API keys:

   - **REPLIERS_API_KEY**: Your Repliers API key obtained from [https://login.repliers.com/](https://login.repliers.com/)
   - **MAPBOX_ACCESS_TOKEN**: Your Mapbox API key obtained from [https://www.mapbox.com/](https://www.mapbox.com/)

5. **Start the development server**

   ```bash
   npm run dev
   ```

   Your server should now be running on the default port (8080).

## Database Setup

### Database Prerequisites

Before you begin, ensure you have the following installed:

- Docker

### Enable Database Functionality

To enable features that require database access, set `app.disable_persistence = false` in `src/settings/defaults.ts` or any other settings file you use.

### Configure Database Settings

Add the following database configuration to your `.env` file:

```ini
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=postgrespw
DB_NAME=repliers_portal
DB_PORT=5432
```

### Start PostgreSQL Instance

You can run the `./scripts/run_pg.sh` script to start a Docker Postgres instance using the environment variables from your `.env` file. This will create a Postgres database with the same settings that were added in the previous step.

Alternatively, you can run the following command directly in your terminal (make sure to adjust the parameters as needed):

```bash
docker run --name=repliers_portal --env=POSTGRES_PASSWORD=postgrespw -e POSTGRES_DB=repliers -p 5432:5432 -d postgres:16-alpine
```

### Run Local Redis Server

Start a Redis instance:

```bash
docker run -d -p 6379:6379 --name repliers_redis redis:8-alpine
```

Or use Docker Compose to start all services:

```bash
docker-compose up -d
```

use docker-compose to run specific project with **custom name and DB_PORT**:

```bash
docker-compose --env-file .env.project_name up -d
```

### Run Database Migrations

Execute the initial database migration to create the database structure:

```bash
npm run db:migrate
```

### Start the Application

Start the project with database functionality enabled:

```bash
npm run dev
```

### Application Configuration

The file `src/settings/defaults.ts` contains the default application settings that allow you to run the application with sample data available through your free Repliers API key.

When you obtain a paid Repliers API key with access to one or multiple Real Estate Boards (based on your subscription), you will need to update the settings in `src/settings/defaults.ts`. The complete list of available settings can be found in `src/config.ts`.

Application settings in `src/settings/defaults.ts` cannot be overridden by environment variables. This ensures consistent configuration across different environments (development, staging, production).

Settings that may vary between environments or should not be committed to the repository (such as API keys, database connection settings, and security keys) are designed to be configured using environment variables.

The complete list of environment variables is provided below.

## Environment Variables

| Variable name                                 | Default value                  | Comment                                                                        |
|           ------------------------            |          :-----------:         |---------------------------------                                               |
| APP_CORS_DOMAIN                               | <http://localhost:3000>        | List of allowed domains for CORS |
| APP_DEFAULTS_BOARDIDS                         | 110                            | Comma-separated default boardIds                                              |
| APP_DISABLE_PERSISTENCE                       | false                          | Disable persistence (for user roles)                                           |
| APP_ALLOWED_LISTINGS_STANDARD_STATUSES        |                                | List of RESO Standard Statuses which should be available for frontend                |
| APP_HIDE_UNAVAILABLE_LISTINGS_HTTP_CODE       | 410                            | HTTP status code frontend receives when unavailable listing is requested       |
| APP_HIDE_UNAVAILABLE_LISTINGS_STATUSES        |                                | List of CSV statuses which should not be available for frontend                |
| APP_HIDE_UNAVAILABLE_LISTINGS_STANDARD_STATUSES        |                                | List of RESO Standard Statuses which should not be available for frontend                |
| APP_LOCATIONS_BOARDID                         | 110                            | Default boardId to fetch /locations                                                               |
| APP_LOGGING_GCP_LOGGER_ENABLED                | false                          | Enable Google Cloud logging                                                    |
| APP_STATSTOP_LIMIT                            | 3                              | Top N limit for stats/neighborhoods ranking                                    |
| APP_USESWAGGER                                | false                          | Enable /swagger UI for the application                                         |
| AUTH_AGENTS_SIGNATURE_SALT                    | repliers123                    | Signature for agents authentication                                            |
| AUTH_EMAILTOKEN_AUTO_OTP                      | false                           | Controls if OTP will be automatically sent when expired email token is provided |
| AUTH_EMAILTOKEN_ENABLED                       | false                          | Enable login with email token                                                  |
| AUTH_EMAILTOKEN_EXPIRE                        | 30d                             | Expiration time of email token since email sent date                           |
| AUTH_OTP_MESSAGE                              | Please click on the link below to login | Message sent with OTP link/code                                      |
| AUTH_OTP_MESSAGE_TYPE                         | link_and_code                  | See otpMessageTypes for possible values                                        |
| AUTH_OTP_MESSAGE_SUBJECT                      | undefined                      | Subject of the OTP email message                                               |
| AUTH_OTP_RESEND_TTL_MS                        | 60000                          | Timeout for OTP resend in milliseconds                                         |
| AUTH_OTP_TTL_MS                               | 600000                         | Timeout for OTP password in milliseconds                                       |
| BOSS_BASEURL                                  | <https://api.followupboss.com/v1>| Follow Up Boss API base URL                                                    |
| BOSS_CLIENT_URL                               |<https://example.tld/agent/client/[CLIENT_ID]>.    | Client details path template                                        |
| BOSS_CUSTOM_AVM_FIELD                         |                                | Field name to be used to save AVM link in Boss people profile                 |
| BOSS_CUSTOM_FIELDS_STRATEGY                   |                                | Allows implementing custom logic for setting person fields per environment     |
| BOSS_DEFAULT_ASSIGNED_TO                      | Default Agent                 | Default agent for Follow Up Boss leads                                         |
| BOSS_DEFAULT_SOURCE                           | example.tld                     | Default source for Follow Up Boss leads                                        |
| BOSS_DEFAULT_TAGS                             | APP_ENVIRONMENT                | Tags to be added to all leads                                                  |
| BOSS_ENABLED                                  | true                           | Control Follow Up Boss integration                                             |
| BOSS_ESTIMATE_URL                             |<https://example.tld/estimate/[ESTIMATE_ID]>| Estimate details path template                                       |
| BOSS_PASSWORD                                 |                                | Follow Up Boss password (not needed, left for compatibility)                   |
| BOSS_PROPERTY_URL                             |<https://example.tld/listing/[MLS_NUMBER]?boardId=[BOARD_ID]>| Property details page (PDP) path template                         |
| BOSS_REPORT_CLIENT_VIEW_ESTIMATE              |                                | If true, reports GET /estimate by UserRole.User                                |
| BOSS_SAVED_SEARCH_URL                         |                                | Saved search path template                                                     |
| BOSS_SYSTEM                                   |                                | Boss System ID (required to register at <https://apps.followupboss.com/system-registration>) |
| BOSS_SYSTEM_KEY                               |                                | Boss System Key (required to register at <https://apps.followupboss.com/system-registration>) |
| BOSS_TIMEOUT_MS                               | 30000                          | Follow Up Boss API timeout in milliseconds                                     |
| BOSS_USERNAME                                 |                                | Follow Up Boss username (required)                                             |
| BOSS_WEBHOOK_BASEURL                          | <https://localhost:3000/webhook> | Base URL for Follow Up Boss webhooks                                               |
| BOSS_WEBHOOK_CLIENT_TAGS_CSV                  |                                | Comma-separated client tags                                                    |
| BOSS_WEBHOOK_ENABLED                          | false                          | Control Follow Up Boss webhooks                                                |
| BOSS_WEBHOOK_USE_NGROK                        | false                          | Use ngrok for local webhook testing (requires ngrok token)                     |
| CACHE_BUILDINGS_SEARCH_TTL                   | 86400000                       | TTL for buildings search cache in milliseconds (default 24 hours)               |
| CACHE_BUILDINGS_SINGLE_TTL                   | 3600000                        | TTL for single building cache in milliseconds (default 1 hour)               |
| CACHE_FEATURED_LISTINGS_TTL                   | 3600000                        | TTL for featured listings cache in milliseconds (default 1 hour)               |
| CACHE_LISTINGS_COUNT_TTL                      | 86400000                       | TTL for listings count in milliseconds                                         |
| CACHE_LOCATIONS_TTL                           | 86400000                       | TTL for locations `get` cache in milliseconds (default 24 hours)               |
| CACHE_NEIGHBORHOODSRANKING_TTL                | 86400000                       | TTL for neighborhoods ranking in milliseconds                                  |
| CACHE_STATSWIDGET_TTL                         | 86400000                       | TTL for stats widget cache in milliseconds                                     |
| DATABASE_URL                                  |                                | Full database URL (overrides individual DB_* settings if provided)                      |
| DB_HOST                                       | localhost                      | Database host                                                                  |
| DB_NAME                                       | repliers                       | Database name                                                                  |
| DB_PASSWORD                                   | postgrespw                     | Database password                                                              |
| DB_USE_SSL                                    | false                          | Controls PostgreSQL SSL (false on localhost, must be true on Heroku)          |
| DB_USER                                       | postgres                       | Database user                                                                  |
| DEBUG                                         |                                | Used for node-debug                                                            |
| DEBUG_AUTH_OTP_EXPOSE_CODE                    | false                          | Security will be compromised as OTP code will be exposed in signup/login response. ONLY for DEBUG purposes |
| DUPLICATES_REFERENCE_BOARD_RESOURCE_ID        | 9997                           | Reference board id for duplicates scrubbing                                    |
| GMAIL_APP_PASSWORD                            |                                | Gmail credentials when `SMTP_ENABLED=true`                                                                    |
| GMAIL_USER                                    |                                | Gmail email address to use as sender when `SMTP_ENABLED=true`                                               |
| GOOGLE_APPLICATION_CREDENTIALS                | /app/gcp_key.json              | Path to GCP credentials file (should not be changed)                           |
| GOOGLE_CREDENTIALS                            |                                | Content of GCP service account JSON                                            |
| GOOGLE_MAPS_API_KEY                          |                                | Google Maps API key                                                             |
| GOOGLE_MAPS_BASE_URL                         |                                | Google Maps base URL                                                           |
| GOOGLE_MAPS_TIMEOUT_MS                       | 30000                          | Google Maps timeout in milliseconds                                             |
| JWT_EXPIRE                                    | 30d                            | JWT expiration time claim (exp)                                                |
| JWT_ISSUER                                    | <http://repliers-proxy>        | JWT issuer claim (iss)                                                         |
| JWT_PRIVATE_KEY                               |                                | Relative path to private JWT key                                               |
| JWT_PUBLIC_KEY                                |                                | Relative path to public JWT key                                                |
| LOGLEVEL                                      | info                           | Application log level                                                          |
| LOGTAIL_TOKEN                                 |                                | Logtail token for logging service                                              |
| MAPBOX_ACCESS_TOKEN                           |                                | Mapbox API token                                                               |
| MAPBOX_BASEURL                                | <https://api.mapbox.com/search/searchbox/v1> | Mapbox API URL                                                     |
| MAPBOX_TIMEOUT                                | 30000                          | Mapbox API timeout in milliseconds                                             |
| NATS_CREDS                                    | ''                             | NATS credentials file content (leave empty string for local NATS)              |
| NATS_ENABLED                                  | false                          | If false, NATS functionality will be replaced with dummy implementation        |
| NATS_NAME                                     | dev-portal                     | NATS client name (with appended script name - backend, worker) used as connection ID when connecting to NATS server |
| NATS_SERVER                                   | localhost:4222                 | NATS server URL                                                                |
| NATS_WORKER_CONSUMER_NAME                     | boss-people-worker             | NATS stream worker consumer name                                               |
| NATS_WORKER_CONSUMER_STREAM                   | boss-people                    | NATS stream worker consumer stream name                                        |
| NGROK_AUTHTOKEN                               | ''                             | Ngrok auth token for local webhook testing                                     |
| NODE_ENV                                      | production                     | Environment mode (use `development` for `npm run dev`)                           |
| OAUTH_FACEBOOK_CLIENT_ID                      |                                | OAuth client_id for Facebook                                                   |
| OAUTH_FACEBOOK_CLIENT_SECRET                  |                                | OAuth client_secret for Facebook                                               |
| OAUTH_FACEBOOK_REDIRECT_URI                   |                                | OAuth redirect_uri for Facebook                                                |
| OAUTH_GOOGLE_CLIENT_ID                        |                                | OAuth client_id for Google                                                     |
| OAUTH_GOOGLE_CLIENT_SECRET                    |                                | OAuth client_secret for Google                                                 |
| OAUTH_GOOGLE_REDIRECT_URI                     |                                | OAuth redirect_uri for Google                                                  |
| PORT                                          | 8080                           | Local port to start HTTP server                                                |
| PROXIMITY_SEARCH_LAT                          | 45.420779                      | Default latitude for proximity search                                          |
| PROXIMITY_SEARCH_LONG                         | -75.69791                      | Default longitude for proximity search                                         |
| PROXIMITY_SEARCH_RADIUS_METERS                | 150000                         | Default radius for proximity search in meters                                  |
| REDIS_KEYV_ENABLE                             | false                          | Enable Keyv caching with Redis                                                 |
| REDIS_URL                                     | redis://localhost:6379         | Redis server URL                                                               |
| REDISCLOUD_URL                                |                                | RedisCloud server URL (overrides `REDIS_URL` if provided)                        |
| REPLIERS_AGENT_EMAIL                          |                                | Agent email to use with custom SMTP                                            |
| REPLIERS_AGENT_ID                             | 0 (invalid)                    | agentId to use in Repliers calls                                               |
| REPLIERS_API_INTERVAL_MS                      | 1000                           | Throttle Repliers API requests per interval (milliseconds)                     |
| REPLIERS_API_KEY                              | API-KEY                        | Required to access Repliers API. Sample data key can be obtained for free after registering at <https://login.repliers.com> |
| REPLIERS_API_KEY_EXTRA                        |                                | Extra Repliers API key, used if main key has insufficient permissions          |
| REPLIERS_API_LIMIT                            | 1                              | Throttle Repliers API requests to limit                                           |
| REPLIERS_AUTOSUGGEST_DISPLAY_PUBLIC_VALUE     | Y                              | Value used for `displayPublic` param for Autosuggest listing search. Possible values: `true &#124; false &#124; undefined`             |
| REPLIERS_AUTOSUGGEST_LISTING_LAST_STATUS      | New,Ext,Pc                     | Comma-separated list of listing `lastStatus` values used by Autosuggest listing search. Possible values - any combination of `New,Ext,Pc,Sld,Sc,Sce,Lsd,Lc,Ter,Exp,Dft` - availability of different `lastStatus` values depends on MLS/RE board                           |
| REPLIERS_AUTOSUGGEST_LISTING_STATUS           | A                              | Comma-separated list of listing `status` values used by Autosuggest listing search. Possible values: A &#124; U &#124; A,U            |
| REPLIERS_AUTOSUGGEST_LISTING_TYPE             | Sale                           | Comma-separated list of listing `type` values used by Autosuggest listing search. Possible values: Sale &#124; Lease &#124; Sale,Lease    |
| REPLIERS_AUTOSUGGEST_MAX_RESULTS              | 10                             | Limit for maximum amount per page                                              |
| REPLIERS_AUTOSUGGEST_MAX_RESULTS_DEFAULT      | 3                              | Default results per page                                                       |
| REPLIERS_AUTOSUGGEST_PROVIDER                 | mapbox                         | Provider to use for address autosuggest (mapbox or google)                     |
| REPLIERS_AUTOSUGGEST_SEARCH_FIELDS            | address.streetName,mlsNumber,address.zip,address.streetNumber | Values used for `searchFields` param for Autosuggest listing search. Please refer to this [support article](https://help.repliers.com/en/article/how-to-search-listings-using-keywords-1osixqn/#3-the-searchfields-parameter) for more details             |
| REPLIERS_BASE_URL                             | <https://api.repliers.io>  |  Base URL of the Repliers API                                           |
| REPLIERS_CACHE_WARMUP_API_INTERVAL_MS         | REPLIERS_API_INTERVAL_MS       | Interval window in ms for `REPLIERS_CACHE_WARMUP_API_LIMIT`                    |
| REPLIERS_CACHE_WARMUP_API_KEY                 |                                | Separate Repliers key for SSG-build traffic; falls back to `REPLIERS_API_KEY` when unset (disabled) |
| REPLIERS_CACHE_WARMUP_API_LIMIT               | REPLIERS_API_LIMIT             | Rate limit for the warmup key's own throttle                                   |
| REPLIERS_ESTIMATES_SEND_EMAIL_MONTHLY         | false                          | If true, estimates will be sent to the user via email monthly                  |
| REPLIERS_ESTIMATES_SEND_EMAIL_NOW             | false                          | If true, estimates will be sent to the user via email immediately              |
| REPLIERS_PROXY_XFF                            | false                          | Proxy IP addr from X-Forwarded-For header to Repliers                                       |
| REPLIERS_PROXY_XFF_SSR_TOKEN                  |                                | Shared secret identifying requests from Next.js SSR; matched against the `X-Forwarded-For-Token` request header |
| REPLIERS_PROXY_XFF_SSG_TOKEN                  |                                | Shared secret identifying requests from Next.js SSG (build-time); these requests skip client IP forwarding |
| REPLIERS_PROXY_XFF_SSR_IPADDR_OFFSET          | 2                              | Position offset from the end of `X-Forwarded-For` IP chain to extract the real client IP behind SSR. Depends on the number of proxies before the Next.js server: e.g. 2 if only a load balancer sits in front, 3 if there is also a CDN like CloudFlare |
| REPLIERS_TIMEOUT                              | 30000                          | Timeout for API response in milliseconds                                       |
| SETTINGS_EVENTS_COLLECTOR_DEFAULT_BOARD_ID    | 110                            | Default boardId to fetch by MLS number when board id is not provided          |
| SETTINGS_EVENTS_COLLECTOR_URL_HOST            | undefined                      | URL host for events collector links. Used for BOSS_PROPERTY_URL, BOSS_CLIENT_URL and other urls      |
| SETTINGS_EVENTS_COLLECTOR_EVENT_TAGS_SUBSCRIBE_NEWSLETTER | ''                 | Comma-separated list of tags to add to events when user subscribes to newsletter |
| SETTINGS_EVENTS_COLLECTOR_EVENT_TAGS_SCHEDULE_ESTIMATE | ''               | Comma-separated list of tags to add to events when user request scheduling estimate at his home |
| SETTINGS_EXTENDED_PROPERTY_DETAILS            | false                          | If true, GET /estimates/property_details will return approximated property details - average tax and neighborhood if no historical listings found |
| SETTINGS_FEATURED_LISTINGS                    | []                             | JSON array of `{"slug":"...","clientId":...}` pairs mapping URL slugs to Repliers client IDs for the `GET /listings/featured/:slug` endpoint |
| SETTINGS_LOCATIONS_ALLOWED_AREAS              | ''                             | `DEPRECATED` Comma-separated names of areas allowed to be returned from /autosuggest/locations endpoints |
| SETTINGS_LOCATIONS_ALLOW_ALL_AREAS            | false                          | `DEPRECATED` Set to true to allow all areas from /autosuggest/locations endpoint.                        |
| SETTINGS_LOCATIONS_DROP_COORDINATES           | false                          | `DEPRECATED` Set to true to drop coordinates from locations                                 |
| SETTINGS_NLP_VERSION                          | 1                              | Version of the NLP model to use                                                |
| SETTINGS_SCRUBBING_ADDRESS_SAFE_FIELDS        | area, city, streetDirection, streetName, streetDirectionPrefix, district, streetSuffix, neighborhood, state, majorIntersection, communityCode, country, zip             | Comma-separated list of safe `address` fields that must NOT be scrubbed during listing scrubbing for non-authenticated users. All other `address` fields will be scrubbed. Check your Real Estate Board regulations regarding these fields. |
| SETTINGS_SCRUBBING_BOARDIDS                   | 110                            | Comma-separated list of boardIds whose listings will have sensitive data removed for non-authenticated users |
| SETTINGS_SCRUBBING_DROP_FIELDS                | history,agents,raw             | Comma-separated list of sensitive fields/objects that must be dropped during listing scrubbing for non-authenticated users. Check your Real Estate Board regulations regarding these fields.     |
| SETTINGS_SCRUBBING_FORCE_DISPLAY_PUBLIC_YES   | false                          | Set to true to force permissions.displayPublic == 'Y' for all listings flowing through `portal-backend`. Check your Real Estate Board regulations before setting this to `true`         |
| SETTINGS_SCRUBBING_IMPORTANT_FIELDS           | boardId             | Comma-separated list of fields that must be transferred from parent listing into history/comparables listings to allow proper scrubbing. Do **NOT** change unless you know what you are doing.      |
| SETTINGS_SCRUBBING_PROCESS_DUPLICATES_ENABLED | true                           | Control scrubbing duplicates                                                   |
| SETTINGS_SCRUBBING_SAFE_FIELDS                | address, class, map, propertyType, type, mlsNumber, permissions, status, boardId, listDate, imageInsights, duplicates, resource             | Comma-separated list of safe fields that must NOT be scrubbed during listing scrubbing for non-authenticated users. Check your Real Estate Board regulations regarding these fields. You can also mark nested fields as safe e.g. `condominium.fees`     |
| SMTP_ENABLED                                  | false                          | Enable static Gmail account instead of Repliers messaging                            |
| SOCIAL_PINTEREST_CLIENT_ID                    |                                | Pinterest client_id                                                            |
| SOCIAL_PINTEREST_CLIENT_SECRET                |                                | Pinterest client_secret                                                        |
| SOCIAL_PINTEREST_REDIRECT_URI                 |                                | Pinterest redirect_uri                                                         |


## Known Issues and Workarounds

- **tsx compatibility**: We cannot use tsx (which is simpler and faster than ts-node) as it doesn't support the `emitDecoratorsMetadata` option from tsconfig.json

- **ts-node version compatibility**: Stable ts-node 10.9.2 doesn't fully support TypeScript 5+ because it can't handle multiple extends in tsconfig.json. We use ts-node@11-beta instead

- **TypeScript 5.3+ configuration**: There's a bug in ts-node@11-beta with TypeScript 5.3+ that requires specifying the full path for extendable config in tsconfig.json. Instead of extending from `@tsconfig/*`, we extend from `./node_modules/@tsconfig/...`

- **Google credentials**: A small script in `.profile` generates the Google credentials JSON file from an environment variable

- **Cached decorator types**: `@cached()` decorated functions actually return only `Cached<T>` but are marked as returning `Promise<T | Cached<T>>` because TypeScript doesn't know about decorated return types

## Long-term Considerations

- **Dependency injection**: tsyringe appears to be abandoned by Microsoft. We need to find a suitable replacement for the IoC Container
