import { inject, injectable } from "tsyringe";
import * as client from "openid-client";
import SocialProviderBase from "./base.js";
import { ApiError } from "../../../lib/errors.js";
import type { AppConfig } from "../../../config.js";
@injectable()
export default class PinterestSocialProvider implements SocialProviderBase {
   private clientConfig: client.Configuration;
   constructor(@inject("config")
   private config: AppConfig) {
      this.clientConfig = new client.Configuration({
         issuer: "https://pinterest.com",
         authorization_endpoint: "https://www.pinterest.com/oauth/",
         token_endpoint: "https://api.pinterest.com/v5/oauth/token",
         id_token_encrypted_response_alg: ""
      }, this.config.auth.social.pinterest.client_id, this.config.auth.social.pinterest.client_secret);
   }
   getUrl() {
      return client.buildAuthorizationUrl(this.clientConfig, {
         scope: this.config.auth.social.pinterest.scopes,
         redirect_uri: this.config.auth.social.pinterest.redirect_uri
      }).toString();
   }
   callback(params: {
      code: string;
   }) {
      const url = new URL(this.config.auth.social.pinterest.redirect_uri);
      url.search = new URLSearchParams({
         iss: "https://pinterest.com",
         code: params.code
      }).toString(); // convert to mutable

      return client.authorizationCodeGrant(this.clientConfig, url);
   }
   refresh(params: {
      refresh_token: string;
   }) {
      if (!params.refresh_token) {
         throw new ApiError("No refresh token", 400);
      }
      return client.refreshTokenGrant(this.clientConfig, params.refresh_token);
   }
}