import "reflect-metadata";
import "./providers/index.js";
import http from "node:http";
import type { Logger } from "pino";
import { container } from "tsyringe";
import app from "./app.js";
import config from "./config.js";
import BossWebhooksService from "./services/boss/webhook.js";
const logger = container.resolve<Logger>("logger.global");

// Observe only: Node still prints the stack to stderr (Heroku) and exits 1.
// Also fires for unhandled rejections (origin "unhandledRejection").
process.on("uncaughtExceptionMonitor", (err, origin) => logger.fatal({
   err,
   origin
}, "Fatal"));

// setup nats connection on start, testing resolving on actual use
// import { JetStreamClient } from "@nats-io/jetstream";
// await container.resolve<Promise<JetStreamClient>>("nats");

import _debug from 'debug';
const debug = _debug("repliers:server");
debug(`process.env.PORT:`, process.env["PORT"]);
debug(`Starting server with config:`, config);
http.createServer(app.callback()).listen(config.app.port, () => {
   logger.info(`Server is running on port ${config.app.port}`);
});
const webhook = container.resolve(BossWebhooksService);
await webhook.installHooks();
process.on("SIGINT", () => {
   logger.info("Shutting down");
   webhook.uninstallHooks().finally(() => {
      process.exit(0);
   });
});
process.on("SIGTERM", () => {
   logger.info("Shutting down");
   webhook.uninstallHooks().finally(() => {
      process.exit(0);
   });
});