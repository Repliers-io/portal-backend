import "reflect-metadata";
import "./providers/index.js";
import { container } from "tsyringe";
import { JetStreamClient } from "@nats-io/jetstream";
import { AppConfig } from "./config.js";
import type { Logger } from "pino";
import streams from "./streams/index.js";
import pRetry from "p-retry";
const logger = container.resolve<Logger>("logger.global");
process.on("uncaughtExceptionMonitor", (err, origin) => logger.fatal({
   err,
   origin
}, "Fatal"));
const jsc = await pRetry(() => container.resolve<Promise<JetStreamClient>>("nats"), {
   onFailedAttempt: error => {
      logger.error(`Establishing NATS connection, attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`);
   }
});
const config = container.resolve<AppConfig>("config");
const consumer = await jsc.consumers.get(config.nats.worker.consumer_stream, config.nats.worker.consumer_name);
const WorkerClass = streams.find(s => s.stream.name === config.nats.worker.consumer_stream)?.worker;
if (!WorkerClass) {
   throw new Error(`Worker class not found for stream ${config.nats.worker.consumer_stream}`);
}
const worker = container.resolve(WorkerClass);
// the consumer is wrapped in loop because this way, if there's some failure
// it will re-setup consume, and carry on.
// this is the basic pattern for processing messages forever
if (config.nats.enabled) {
   // Don't start worker if nats is disabled
   while (true) {
      logger.info(`Worker ${config.nats.worker.consumer_name} consuming messages from stream ${config.nats.worker.consumer_stream}`);
      const messages = await consumer.consume();
      try {
         for await (const m of messages) {
            const correlationId = m.headers?.get("correlationId");
            logger.setBindings({
               correlationId
            });
            await worker.process(m);
         }
      } catch (err) {
         if (err instanceof Error) {
            logger.error(err.message);
         }
      }
   }
}
logger.warn('NATS is disabled, not starting worker');