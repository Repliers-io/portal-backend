import assert from "assert";
import supertest from "supertest";
import TestAgent from "supertest/lib/agent.js";
import { container } from "tsyringe";
import app from "../../src/app.js";
import _ from "lodash";
import Keyv from "keyv";
import { mockEnsureMailingAllowed, mockFailedEnsureMailingAllowed, mockUserCreate, mockUserCreateConflict, mockUserFind, mockUserGetById, mockUserNotFound, mockUserPatch } from "../mocks/repliers/users.js";
import { mockMessageCreate } from "../mocks/repliers/messages.js";
import { mockBossEvents } from "../mocks/boss/boss.js";
import _debug from "debug";
const debug = _debug('repliers:tests:routes:auth');
const userFixture = {
   email: "test@user.com",
   fname: "Test",
   lname: "Name",
   phone: "1555123456"
};
const unknownUserFixture = {
   email: "test_unknown@user.com",
   fname: "Test",
   lname: "Unknown",
   phone: "1555123457"
};
const clientIdFixture = 123;
const cleanUpOtpStorage = async () => {
   const db = container.resolve<Keyv>("keyv.otp");
   db.delete("123456"); // otp code
   db.delete(`otp_sent_${clientIdFixture}`);
};
describe("Auth", function () {
   let appInstance: TestAgent;
   before(done => {
      appInstance = supertest(app.callback());
      done();
   });
   beforeEach(async () => {
      mockBossEvents();
      await cleanUpOtpStorage();
   });
   describe("Signup", function () {
      it("Should fail to signup (409) user that already exists", async function () {
         const userStub = _.omit(userFixture, "phone");
         mockUserCreateConflict({
            email: userFixture.email,
            clientId: clientIdFixture,
            preferences: {
               email: true,
               unsubscribe: false
            }
         });
         const signupResponse = await appInstance.post("/api/auth/signup").set({
            referer: "https://example.com"
         }).send(userStub);
         assert.equal(signupResponse.status, 409);
      });
      it("Should be able to signup user if it doesn't exist with email only", async function () {
         const userStub = _.omit(userFixture, "phone");
         mockUserCreate({
            email: userFixture.email,
            clientId: clientIdFixture,
            preferences: {
               email: true,
               unsubscribe: false
            }
         });
         mockMessageCreate();
         const signupResponse = await appInstance.post("/api/auth/signup").set({
            referer: "https://example.com"
         }).send(userStub);
         assert.equal(signupResponse.status, 200);
         const db = container.resolve<Keyv>("keyv.otp");
         const {
            clientId
         } = await db.get("123456");
         assert.equal(clientId, clientIdFixture);
         mockUserGetById({
            email: userFixture.email,
            clientId: clientIdFixture
         });
         const otpResponse = await appInstance.post("/api/auth/otp").send({
            code: "123456"
         });
         assert.equal(otpResponse.status, 200);
      });
      it("Should ensure user can receive email", async function () {
         const userStub = _.omit(userFixture, "phone");
         mockUserCreate({
            email: userFixture.email,
            clientId: clientIdFixture,
            preferences: {
               email: false
            }
         });
         mockEnsureMailingAllowed(clientIdFixture);
         mockMessageCreate();
         const signupResponse = await appInstance.post("/api/auth/signup").set({
            referer: "https://example.com"
         }).send(userStub);
         assert.equal(signupResponse.status, 200);
      });
      it("Should throw 500 if failed to ensure user can receive emails", async function () {
         const userStub = _.omit(userFixture, "phone");
         mockUserCreate({
            email: userFixture.email,
            clientId: clientIdFixture,
            preferences: {
               email: false
            }
         });
         mockFailedEnsureMailingAllowed(clientIdFixture);
         mockMessageCreate();
         const signupResponse = await appInstance.post("/api/auth/signup").set({
            referer: "https://example.com"
         }).send(userStub);
         assert.equal(signupResponse.status, 500);
         assert.equal(signupResponse.body.userMessage, "Error ensuring user can receive email");
      });
      it("Should deny signup user with wrong otp code", async function () {
         this.slow(1000);
         const userStub = _.omit(userFixture, "phone");
         mockUserCreate({
            email: userFixture.email,
            clientId: clientIdFixture,
            preferences: {
               email: true,
               unsubscribe: false
            }
         });
         mockMessageCreate();
         const signupResponse = await appInstance.post("/api/auth/signup").set({
            referer: "https://example.com"
         }).send(userStub);
         assert.equal(signupResponse.status, 200);
         mockUserGetById({
            email: userFixture.email,
            clientId: clientIdFixture
         });
         const otpResponse = await appInstance.post("/api/auth/otp").send({
            code: "111111"
         });
         assert.equal(otpResponse.status, 403);
      });
   });
   describe("Signin", function () {
      it("Should login OK existing user", async function () {
         mockUserFind({
            email: userFixture.email,
            clientId: clientIdFixture
         });
         mockMessageCreate();
         mockEnsureMailingAllowed(clientIdFixture);
         const firstAttempt = await appInstance.post("/api/auth/login").send({
            email: userFixture.email
         });
         assert.equal(firstAttempt.status, 200);
      });
      it("Should Deny login for unknown user", async function () {
         mockUserNotFound({
            email: unknownUserFixture.email
         });
         mockMessageCreate();
         mockEnsureMailingAllowed(clientIdFixture);
         const firstAttempt = await appInstance.post("/api/auth/login").send({
            email: unknownUserFixture.email
         });
         assert.equal(firstAttempt.status, 404);
      });
      it("Should deny login for a minute after each attempt", async function () {
         mockUserFind({
            email: userFixture.email,
            clientId: clientIdFixture
         });
         mockMessageCreate();
         mockEnsureMailingAllowed(clientIdFixture);
         const firstAttempt = await appInstance.post("/api/auth/login").send({
            email: userFixture.email
         });
         assert.equal(firstAttempt.status, 200);
         mockUserFind({
            email: userFixture.email,
            clientId: clientIdFixture
         });
         mockEnsureMailingAllowed(clientIdFixture);
         const secondAttempt = await appInstance.post("/api/auth/login").send({
            email: userFixture.email
         });
         assert.equal(secondAttempt.status, 403);
         const retryAfter = Number(secondAttempt.headers["retry-after"]);
         assert.ok(retryAfter > 0 && retryAfter <= 60, `expected Retry-After in (0, 60], got ${secondAttempt.headers["retry-after"]}`);

         // todo: testing successful login after a minute of waiting is not trivial as mocha's this.timeout() doesn't trigger OTP storage cleanup by TTL
      });
   });
});