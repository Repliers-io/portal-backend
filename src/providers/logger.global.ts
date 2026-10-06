import { devNull } from "os";
import { TransportMultiOptions, TransportSingleOptions, pino } from "pino";
import { instanceCachingFactory } from "tsyringe";
import type { AppConfig } from "../config.js";
export default {
   token: "logger.global",
   useFactory: instanceCachingFactory(container => {
      const config = container.resolve<AppConfig>("config");
      let transport: TransportSingleOptions | TransportMultiOptions;
      switch (config.env) {
         case "production":
            if (config.app.logging.gcp_logger_enabled) {
               transport = {
                  targets: [{
                     target: "cloud-pine",
                     options: {
                        cloudLoggingOptions: {
                           defaultLabels: {
                              environment: config.app.env
                           }
                        }
                     }
                  }]
               };
            } else {
               transport = {
                  targets: [{
                     target: "pino/file",
                     options: {
                        destination: 1
                     } // this writes to STDOUT
                  }]
               };
            }
            break;
         case "testing":
            // devNull is cross-platform (\\.\nul on Windows) — a literal
            // "/dev/null" resolves to C:\dev\null on Windows and the pino/file
            // worker crashes with ENOENT, taking the whole test run down.
            transport = {
               target: "pino/file",
               options: {
                  destination: devNull
               }
            };
            break;
         default:
            {
               transport = {
                  target: "pino-pretty"
               };
            }
      }
      return pino({
         transport,
         level: config.app.logging.loglevel,
         redact: {
            paths: ["req.headers.authorization", "token"],
            censor: "***"
         }
      });
   })
};