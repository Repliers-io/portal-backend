import assert from "assert";
import { container } from "tsyringe";
import type { AppConfig } from "../../src/config.ts";
import AuthService from "../../src/services/auth.ts";
import { DummyXFFProvider } from "../../src/providers/dummy.xff.ts";
describe("AuthService", function () {
   describe("formatOtpMessageContent", function () {
      const code = "123456";
      let config: AppConfig;
      let authService: AuthService;
      let otp: AppConfig["auth"]["otp"];
      before(function () {
         config = container.resolve<AppConfig>("config");
         container.register("XForwardedFor", {
            useFactory: () => new DummyXFFProvider()
         });
         authService = container.resolve(AuthService);
         otp = {
            ...config.auth.otp
         };
      });
      beforeEach(function () {
         config.auth.otp = {
            ...otp,
            message: "Please click on the link below to login",
            uri: "http://localhost:3000/auth/otp/processing",
            messageSubject: undefined
         };
      });
      after(function () {
         config.auth.otp = otp;
      });
      const format = (code: string) => (authService as unknown as {
         formatOtpMessageContent: (code: string) => Record<string, unknown>;
      }).formatOtpMessageContent(code);
      it("returns message and link for message_type 'link'", function () {
         config.auth.otp.message_type = "link";
         assert.deepEqual(format(code), {
            message: "Please click on the link below to login",
            links: ["http://localhost:3000/auth/otp/processing?code=123456"]
         });
      });
      it("returns only the code message for message_type 'code'", function () {
         config.auth.otp.message_type = "code";
         assert.deepEqual(format(code), {
            message: "Please click on the link below to login 123456"
         });
      });
      it("returns message and link for message_type 'link_and_code'", function () {
         config.auth.otp.message_type = "link_and_code";
         assert.deepEqual(format(code), {
            message: "Please click on the link below to login 123456",
            links: ["http://localhost:3000/auth/otp/processing?code=123456"]
         });
      });
      it("includes subject when messageSubject is configured", function () {
         config.auth.otp.message_type = "code";
         config.auth.otp.messageSubject = "Your login code";
         assert.deepEqual(format(code), {
            subject: "Your login code",
            message: "Please click on the link below to login 123456"
         });
      });
      it("omits subject when messageSubject is not configured", function () {
         config.auth.otp.message_type = "code";
         assert.ok(!("subject" in format(code)));
      });
   });
});