import { registry } from "tsyringe";
import logger from "../../src/providers/logger.js";
import loggerMiddleware from '../../src/providers/middleware/logger.js';
import loggerGlobal from "../../src/providers/logger.global.js";
import config from "../../src/providers/config.js";
import swaggerMiddleware from "../../src/providers/middleware/swagger.js";
import helmetMiddleware from "../../src/providers/middleware/helmet.js";
import bodyparserMiddleware from "../../src/providers/middleware/body.js";
import roleMiddlware from "../../src/providers/middleware/role.js";
import corsMiddleware from "../../src/providers/middleware/cors.js";
import jwtMiddlewareConfig from "../../src/providers/middleware/jwt/config.js";
import jwtMiddleware from "../../src/providers/middleware/jwt/jwt.js";
import jwtMiddlewarePassthrough from "../../src/providers/middleware/jwt/passthrough.js";
import jwtMiddlewareConfigKeys from "../../src/providers/middleware/jwt/config.keys.js";
import compressMiddleware from '../../src/providers/middleware/compress.js';
import sslifyMiddleware from "../../src/providers/middleware/sslify.js";
import xssMiddleware from '../../src/providers/middleware/xss.js';
import pinoMiddleware from '../../src/providers/middleware/pino.js';
import oauthGoogle from "../../src/providers/oauth/google.js";
import keyvBlocklist from "../../src/providers/keyv.blocklist.js";
import keyvSignupcodes from "../../src/providers/keyv.otp.js";

// this is an example of dependency overriding
import CodegenMock from "../mocks/services/auth/codegen.js"; // this is mocked implementation
import Codegen from "../../src/services/auth/codegen.js"; // this is token
import dataCommunities from '../mocks/data/communities.js';
import db from '../../src/providers/db.js';
import nats from '../../src/providers/nats.js';
import asyncLocalStore from '../../src/providers/asyncLocalStore.js';
import containerMiddleware from '../../src/providers/middleware/container.js';
import containerXffMiddleware from '../../src/providers/middleware/container/xff.js';
import SelectClientRegistrationParams from "../../src/services/eventsCollection/selectors/selectClientRegistrationParams.js";
import throttlerRepliers from "../../src/providers/throttler/repliers.js";
import throttlerRepliersWarmup from "../../src/providers/throttler/repliersWarmup.js";
import thorottlerRepliersOnDelay from "../mocks/providers/throttler/ondelay.js";
@registry([asyncLocalStore, logger, loggerMiddleware, loggerGlobal, config, keyvBlocklist, swaggerMiddleware, helmetMiddleware, bodyparserMiddleware, corsMiddleware, roleMiddlware, jwtMiddlewareConfig, jwtMiddlewareConfigKeys, jwtMiddlewarePassthrough, jwtMiddleware, compressMiddleware, sslifyMiddleware, xssMiddleware, pinoMiddleware, oauthGoogle, keyvSignupcodes, db, nats, containerMiddleware, containerXffMiddleware, thorottlerRepliersOnDelay, throttlerRepliers, throttlerRepliersWarmup, {
   token: 'data.communities',
   useValue: dataCommunities
}, {
   token: Codegen,
   useClass: CodegenMock
}, {
   token: 'middleware.eventsCollection',
   useFactory: () => () => () => null
}, {
   token: 'middleware.boss.webhook.auth',
   useFactory: () => () => () => null
}, {
   token: SelectClientRegistrationParams,
   useValue: {
      select: () => null
   }
}])
export default class ContainerRegistry {}