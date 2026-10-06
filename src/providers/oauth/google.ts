import { AppConfig } from "../../config.js";
import { instanceCachingFactory } from "tsyringe";
import * as client from "openid-client";
export default {
   token: "oauth.google",
   useFactory: instanceCachingFactory(async container => {
      const config = container.resolve<AppConfig>("config");
      return await client.discovery(new URL("https://accounts.google.com"), config.auth.oauth.google.client_id, config.auth.oauth.google.client_secret);
   })
};