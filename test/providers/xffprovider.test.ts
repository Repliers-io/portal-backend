import assert from "node:assert";
import config from "../../src/config.js";
import type { Context } from "koa";
import { sanitizeIpAddr, XFFProvider } from "../../src/lib/xffprovider.js";
function mockContext(headers: Record<string, string>, state: Record<string, unknown> = {}): Context {
   const lowercased: Record<string, string> = {};
   for (const [name, value] of Object.entries(headers)) {
      lowercased[name.toLowerCase()] = value;
   }
   return {
      get: (name: string) => lowercased[name.toLowerCase()] ?? "",
      state
   } as unknown as Context;
}
describe("XFF Provider tests", () => {
   const ssgToken = config.repliers.xff.ssg_token;
   describe("utils tests", () => {
      describe("sanitizeIpAddr", () => {
         it("Correct IP Address", () => {
            assert.deepEqual(sanitizeIpAddr("192.168.1.1"), "192.168.1.1");
         });
         it("Spaced IP Address", () => {
            assert.deepEqual(sanitizeIpAddr("   192.168.1.1   "), "192.168.1.1");
         });
         it("ipv6 prefixed IP Address", () => {
            assert.deepEqual(sanitizeIpAddr(" ::ffff:192.168.1.1   "), "192.168.1.1");
         });
      });
   });
   describe("isSsg", () => {
      before(() => {
         // guards against XFF_SSG_TOKEN being dropped from test.env, which would make every
         // case below compare against "" and pass/fail for the wrong reason
         assert.ok(ssgToken, "expected XFF_SSG_TOKEN to be set in test.env");
      });
      it("true when X-Forwarded-For-Token matches the SSG token", () => {
         const provider = new XFFProvider(mockContext({
            "X-Forwarded-For-Token": ssgToken
         }));
         assert.equal(provider.isSsg(), true);
      });
      it("false when the token header is absent", () => {
         const provider = new XFFProvider(mockContext({}));
         assert.equal(provider.isSsg(), false);
      });
      it("false when the token does not match the SSG token", () => {
         const provider = new XFFProvider(mockContext({
            "X-Forwarded-For-Token": "not-the-ssg-token"
         }));
         assert.equal(provider.isSsg(), false);
      });
   });
   describe("isEnabled", () => {
      const proxyXff = config.repliers.proxy_xff;
      before(() => {
         config.repliers.proxy_xff = true;
      });
      after(() => {
         config.repliers.proxy_xff = proxyXff;
      });
      it("honours enable.xff set after the provider is constructed", () => {
         const state: Record<string, unknown> = {};
         const provider = new XFFProvider(mockContext({
            "x-forwarded-for": "203.0.113.9"
         }, state));
         assert.equal(provider.isEnabled(), false);
         state["enable.xff"] = true;
         assert.equal(provider.isEnabled(), true);
         assert.equal(provider.getHeader(), "203.0.113.9");
      });
      it("false for SSG traffic even with enable.xff set", () => {
         const provider = new XFFProvider(mockContext({
            "x-forwarded-for": "203.0.113.9",
            "X-Forwarded-For-Token": ssgToken
         }, {
            "enable.xff": true
         }));
         assert.equal(provider.isEnabled(), false);
      });
   });

   // The offset counts from the end of the chain, and every proxy hop appends one
   // entry — so the same offset has to survive deployments with and without a CDN
   // in front of the frontend. That is what the walk-down in getClientIpBehindSSR
   // is for; do not "fix" it to fail closed.
   describe("SSR chain shapes", () => {
      const {
         proxy_xff: proxyXff,
         xff
      } = config.repliers;
      const {
         ssr_token: ssrToken,
         ssr_ipaddr_offset: offset
      } = xff;
      before(() => {
         config.repliers.proxy_xff = true;
         xff.ssr_token = "ssr-test-token";
         xff.ssr_ipaddr_offset = 3;
      });
      after(() => {
         config.repliers.proxy_xff = proxyXff;
         xff.ssr_token = ssrToken;
         xff.ssr_ipaddr_offset = offset;
      });
      const clientIp = (chain: string) => new XFFProvider(mockContext({
         "x-forwarded-for": chain,
         "X-Forwarded-For-Token": "ssr-test-token"
      }, {
         "enable.xff": true
      })).getHeader();
      it("picks the client from a CDN chain: client, cdn-edge, frontend-egress", () => {
         assert.equal(clientIp("203.0.113.9, 198.51.100.7, 192.0.2.5"), "203.0.113.9");
      });
      it("picks the client from a no-CDN chain by walking the offset down", () => {
         assert.equal(clientIp("203.0.113.9, 192.0.2.5"), "203.0.113.9");
      });
   });
   describe("skipReason", () => {
      const proxyXff = config.repliers.proxy_xff;
      before(() => {
         config.repliers.proxy_xff = true;
      });
      after(() => {
         config.repliers.proxy_xff = proxyXff;
      });
      const reason = (headers: Record<string, string>, state: Record<string, unknown> = {}) => new XFFProvider(mockContext(headers, state)).skipReason();
      it("ssg wins over everything else", () => {
         assert.equal(reason({
            "x-forwarded-for": "203.0.113.9",
            "X-Forwarded-For-Token": ssgToken
         }, {
            "enable.xff": true
         }), "ssg");
      });
      it("route-flag-missing when the handler never set enable.xff", () => {
         assert.equal(reason({
            "x-forwarded-for": "203.0.113.9"
         }), "route-flag-missing");
      });
      it("no-client-ip when the request arrives without x-forwarded-for", () => {
         assert.equal(reason({}, {
            "enable.xff": true
         }), "no-client-ip");
      });
      it("proxy-disabled when repliers.proxy_xff is off", () => {
         config.repliers.proxy_xff = false;
         assert.equal(reason({
            "x-forwarded-for": "203.0.113.9"
         }, {
            "enable.xff": true
         }), "proxy-disabled");
         config.repliers.proxy_xff = true;
      });
      it("undefined when the header will be sent", () => {
         assert.equal(reason({
            "x-forwarded-for": "203.0.113.9"
         }, {
            "enable.xff": true
         }), undefined);
      });
   });
});