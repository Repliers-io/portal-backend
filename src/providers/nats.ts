import { instanceCachingFactory } from "tsyringe";
import { connect, credsAuthenticator } from "@nats-io/transport-node";
import type { AppConfig } from "../config.js";
import { jetstream, jetstreamManager } from "@nats-io/jetstream";
import streams from "../streams/index.js";
import DummyNats from "../lib/dummy.nats.js";
import { getProcessName } from "../lib/introspection.js";
import pRetry from "p-retry";
import { Logger } from "pino";
export default {
   token: "nats",
   useFactory: instanceCachingFactory(async container => {
      const config = container.resolve<AppConfig>("config");
      if (!config.nats.enabled) {
         return new DummyNats();
      }
      const postfix = getProcessName();
      const natsOptions = {
         ...config.nats.options,
         name: `${config.nats.options.name}:${postfix}`
      };
      if (config.nats.creds !== "") {
         const authenticator = credsAuthenticator(new TextEncoder().encode(config.nats.creds));
         natsOptions.authenticator = authenticator;
      }
      const nc = await connect(natsOptions);
      const jsm = await jetstreamManager(nc);
      for (const settings of streams) {
         const streamExists = await jsm.streams.info(settings.stream.name).then(() => true).catch(() => false);
         if (streamExists) {
            await jsm.streams.update(settings.stream.name, settings.stream);
         } else {
            await jsm.streams.add(settings.stream);
         }
         const consumerExists = await jsm.consumers.info(settings.stream.name, settings.consumer.durable_name).then(() => true).catch(() => false);
         if (!consumerExists) {
            await jsm.consumers.add(settings.stream.name, settings.consumer);
         }
      }
      const logger = container.resolve<Logger>("logger.global");
      return pRetry(() => jetstream(nc), {
         onFailedAttempt: error => {
            logger.error(`Establishing NATS connection, attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`);
         }
      });
   })
};