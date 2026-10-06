import config from "../../src/config.js";
import assert from "assert";
import supertest from "supertest";
import jwt from "jsonwebtoken";
import TestAgent from "supertest/lib/agent.js";
import { mockBossEvents } from "../mocks/boss/boss.js";
import app from "../../src/app.js";
import { mockGoogleDiscovery, mockGoogleOAuthTokenExchange } from "../mocks/services/oauth/google.js";
import { mockUserFindSimple } from "../mocks/repliers/users.js";
describe("oauth-client integration tests", function () {
   const configRedirectUri = config.auth.oauth.google.redirect_uri.at(0);
   let appInstance: TestAgent;
   before(done => {
      mockGoogleDiscovery();
      appInstance = supertest(app.callback());
      done();
   });
   beforeEach(async () => {
      mockBossEvents();
   });
   it("Should return valid url for google provider", async function () {
      const res = await appInstance.get("/api/auth/google/url").query({
         redirect_uri: configRedirectUri
      }).expect(200);
      const {
         url
      } = res.body;
      const urlObj = new URL(url);
      assert.equal(urlObj.origin, "https://accounts.google.com");
      assert.equal(urlObj.pathname, "/o/oauth2/v2/auth");
      assert.equal(urlObj.searchParams.get("client_id"), config.auth.oauth.google.client_id);
      assert.equal(urlObj.searchParams.get("redirect_uri"), configRedirectUri);
      assert.equal(urlObj.searchParams.get("response_type"), "code");
      assert.equal(urlObj.searchParams.get("scope"), config.auth.oauth.google.scopes);
      // The URL should contain the expected parameters
   });
   it('Should perform callback call to fetch tokens', async function () {
      const testUserEmail = "test@example.com";
      mockGoogleOAuthTokenExchange({
         email: testUserEmail,
         code: "test_code",
         access_token: "test_access_token",
         refresh_token: "test_refresh_token",
         expires_in: 3600,
         redirect_uri: configRedirectUri
      });
      mockUserFindSimple({
         email: testUserEmail,
         clientId: 123
      });
      const res = await appInstance.post("/api/auth/google/cb").send({
         code: "test_code"
      }).expect(200);
      assert.equal(res.body.profile.email, testUserEmail);
      const tokenDecode = jwt.decode(res.body.token);
      assert.notEqual(tokenDecode, null);
      if (tokenDecode === null || typeof tokenDecode === "string") {
         assert.fail("Token decode should not be null or string");
      }
      assert.equal(tokenDecode.email, testUserEmail);
   });
});