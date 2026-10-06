import { createPublicKey } from "crypto";
import nock from "nock";
import jwt from "jsonwebtoken";
import config from "../../../../src/config.js";
import fs from "node:fs";
const MOCK_KEY_ID = "test-key-id";

// openid-client fetches this at provider construction; without it the suite reaches
// the real accounts.google.com.
export const mockGoogleDiscovery = () => {
   nock("https://accounts.google.com").persist().get("/.well-known/openid-configuration").reply(200, {
      issuer: "https://accounts.google.com",
      authorization_endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      token_endpoint: "https://oauth2.googleapis.com/token",
      userinfo_endpoint: "https://openidconnect.googleapis.com/v1/userinfo",
      jwks_uri: "https://www.googleapis.com/oauth2/v3/certs",
      response_types_supported: ["code"],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: ["RS256"]
   });
};
export const mockGoogleOAuthTokenExchange = (params: Record<string, unknown>) => {
   // Mocking google cert endpoint, which is used to fetch the public key for verifying the id_token signature
   const key = createPublicKey(fs.readFileSync(config.auth.jwt.publicKey, "utf-8")).export({
      format: "jwk"
   });
   nock("https://www.googleapis.com").get("/oauth2/v3/certs").reply(200, {
      keys: [{
         ...key,
         kid: MOCK_KEY_ID
      }]
   });

   // Mocking tocken exchange endpoint, which is used to exchange the authorization code for tokens
   nock("https://oauth2.googleapis.com").post("/token").reply(200, {
      id_token: jwt.sign({
         email: params.email,
         sub: "test"
      }, fs.readFileSync(config.auth.jwt.privateKey), {
         algorithm: "RS256",
         issuer: "https://accounts.google.com",
         audience: config.auth.oauth.google.client_id,
         expiresIn: config.auth.jwt.expire,
         keyid: MOCK_KEY_ID
      }),
      access_token: params.access_token,
      refresh_token: params.refresh_token,
      expires_in: params.expires_in,
      token_type: "Bearer"
   });
};