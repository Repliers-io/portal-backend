import fs from "node:fs";
import { instanceCachingFactory } from "tsyringe";
import path from "node:path";
import { type AppConfig } from "../../../config.js";
const __dirname = import.meta.dirname;
export default {
   token: "middleware.jwt.config.keys",
   useFactory: instanceCachingFactory(container => {
      const config = container.resolve<AppConfig>("config");
      const keys = {
         private: Buffer.from(""),
         public: Buffer.from("")
      };
      if (config.auth.jwt.privateKey.startsWith("-----BEGIN PRIVATE KEY-----")) {
         keys.private = Buffer.from(config.auth.jwt.privateKey);
      } else {
         const keyPath = path.resolve(__dirname, "..", "..", "..", "..", config.auth.jwt.privateKey);
         keys.private = fs.readFileSync(keyPath);
      }
      if (config.auth.jwt.publicKey.startsWith("-----BEGIN PUBLIC KEY-----")) {
         keys.public = Buffer.from(config.auth.jwt.publicKey);
      } else {
         const keyPath = path.resolve(__dirname, "..", "..", "..", "..", config.auth.jwt.publicKey);
         keys.public = fs.readFileSync(keyPath);
      }
      return keys;
   })
};