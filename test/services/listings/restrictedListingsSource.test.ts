import assert from "assert";
import http from "http";
import type { AddressInfo } from "net";
import nock from "nock";
import type { Logger } from "pino";
import config from "../../../src/config.ts";
import { ApiError } from "../../../src/lib/errors.ts";
import { fetchRestrictedListings, refreshRestrictedListings } from "../../../src/services/listings/restrictedListingsSource.ts";
const origin = "https://source.test";
const source = {
   url: `${origin}/restricted`,
   tokenUrl: "",
   email: "",
   password: "",
   timeoutMs: 1000
};
// The production floor of 5s per retry would stretch every failure test to minutes.
const noRetry = {
   retries: 0
};
const quickRetry = {
   retries: 5,
   minTimeout: 1
};
const runningConfig = (url = source.url) => ({
   ...config,
   settings: {
      ...config.settings,
      restrictedListings: ["A"]
   },
   restrictedListingsSource: {
      ...source,
      url
   }
});

// The shape of GET /api/do-not-show-listings.
const answer = (...mlsNumbers: string[]) => ({
   asOf: "2026-10-23T15:44:17Z",
   since: null,
   listings: mlsNumbers.map(mlsNumber => ({
      mlsNumber,
      addedOn: "2026-10-05T19:18:57Z"
   })),
   removed: []
});
const recordingLogger = () => {
   const calls: {
      info: unknown[];
      warn: unknown[];
   } = {
      info: [],
      warn: []
   };
   const logger = {
      info: (...args: unknown[]) => calls.info.push(args),
      warn: (...args: unknown[]) => calls.warn.push(args)
   };
   return {
      calls,
      logger: logger as unknown as Logger
   };
};
describe("Restricted listings source", function () {
   afterEach(() => nock.cleanAll());
   it("fetches the list without auth when no token URL is set", async function () {
      let authorization: string | undefined;
      nock(origin).get("/restricted").reply(function () {
         authorization = this.req.headers["authorization"];
         return [200, answer("X1", "X2", "X1", " X3 ")];
      });
      assert.deepEqual(await fetchRestrictedListings(source), ["X1", "X2", "X3"]);
      assert.equal(authorization, undefined);
   });
   it("exchanges credentials for a bearer token", async function () {
      nock(origin).post("/token", {
         email: "e@x.test",
         password: "p"
      }).reply(200, {
         token: "t"
      });
      nock(origin).get("/restricted").matchHeader("authorization", "Bearer t").reply(200, answer("X1"));
      const list = await fetchRestrictedListings({
         ...source,
         tokenUrl: `${origin}/token`,
         email: "e@x.test",
         password: "p"
      });
      assert.deepEqual(list, ["X1"]);
   });
   it("rejects an empty list", async function () {
      nock(origin).get("/restricted").reply(200, answer());
      await assert.rejects(fetchRestrictedListings(source, noRetry), ApiError);
   });
   it("rejects a malformed body", async function () {
      for (const body of [["X1"], {
         listings: [{
            addedOn: "2026-10-05T19:18:57Z"
         }]
      }, answer("X1", "")]) {
         nock(origin).get("/restricted").reply(200, body);
         await assert.rejects(fetchRestrictedListings(source, noRetry), ApiError, JSON.stringify(body));
      }
   });
   it("rejects MLS numbers outside the board format", async function () {
      // A prefixed or lowercased number matches no listing, so swapping it in would unblock them all.
      for (const body of [answer("X1", "c123"), answer("TRB-C123"), answer('X1", evil(), "'), answer("X1\nX2")]) {
         nock(origin).get("/restricted").reply(200, body);
         await assert.rejects(fetchRestrictedListings(source, noRetry), ApiError, JSON.stringify(body));
      }
   });
   it("rejects a non-2xx answer", async function () {
      nock(origin).get("/restricted").reply(500);
      await assert.rejects(fetchRestrictedListings(source, noRetry), ApiError);
   });
   it("retries the list request and succeeds once the source recovers", async function () {
      nock(origin).get("/restricted").times(2).reply(503);
      nock(origin).get("/restricted").reply(200, answer("X1"));
      assert.deepEqual(await fetchRestrictedListings(source, quickRetry), ["X1"]);
      assert.ok(nock.isDone());
   });
   it("gives up after five retries", async function () {
      const scope = nock(origin).get("/restricted").times(6).reply(503);
      await assert.rejects(fetchRestrictedListings(source, quickRetry), ApiError);
      assert.ok(scope.isDone());
   });
   it("retries the token exchange on a transient failure", async function () {
      nock(origin).post("/token").reply(503);
      nock(origin).post("/token").reply(200, {
         token: "t"
      });
      nock(origin).get("/restricted").matchHeader("authorization", "Bearer t").reply(200, answer("X1"));
      assert.deepEqual(await fetchRestrictedListings({
         ...source,
         tokenUrl: `${origin}/token`
      }, quickRetry), ["X1"]);
      assert.ok(nock.isDone());
   });
   it("does not retry rejected credentials or a rejected token", async function () {
      for (const status of [401, 403]) {
         const token = nock(origin).post("/token").times(2).reply(status);
         const list = nock(origin).get("/restricted").reply(200, answer("X1"));
         await assert.rejects(fetchRestrictedListings({
            ...source,
            tokenUrl: `${origin}/token`
         }, quickRetry), ApiError);
         assert.ok(!token.isDone() && !list.isDone(), String(status));
         nock.cleanAll();
         const rejected = nock(origin).get("/restricted").times(2).reply(status);
         await assert.rejects(fetchRestrictedListings(source, quickRetry), ApiError);
         assert.ok(!rejected.isDone(), String(status));
         nock.cleanAll();
      }
   });

   // axios's own `timeout` only watches for an idle socket once headers arrive, so a trickling body
   // never trips it. nock's socket emulation hides that, hence a real server with nock switched off.
   it("gives up after the timeout even while the body trickles in", async function () {
      const server = http.createServer((_req, res) => {
         res.writeHead(200, {
            "content-type": "application/json"
         });
         res.write('{"listings":[');
         const trickle = setInterval(() => res.write(" "), 20);
         res.on("close", () => clearInterval(trickle));
      });
      await new Promise<void>(resolve => server.listen(0, resolve));
      const {
         port
      } = server.address() as AddressInfo;
      nock.restore();
      try {
         await assert.rejects(fetchRestrictedListings({
            ...source,
            url: `http://127.0.0.1:${port}/restricted`,
            timeoutMs: 50
         }, noRetry), {
            message: "Restricted listings source: timed out"
         });
      } finally {
         nock.activate();
         server.closeAllConnections();
         server.close();
      }
   });
   it("swaps the list in the running config", async function () {
      nock(origin).get("/restricted").reply(200, answer("A", "B"));
      const running = runningConfig();
      const {
         calls,
         logger
      } = recordingLogger();
      await refreshRestrictedListings(running, logger);
      assert.deepEqual(running.settings.restrictedListings, ["A", "B"]);
      assert.equal(calls.info.length, 1);
   });
   it("keeps the list and resolves when the source fails", async function () {
      nock(origin).get("/restricted").reply(500);
      const running = runningConfig();
      const {
         calls,
         logger
      } = recordingLogger();
      await refreshRestrictedListings(running, logger, noRetry);
      assert.deepEqual(running.settings.restrictedListings, ["A"]);
      assert.equal(calls.warn.length, 1);
   });
   it("keeps credentials out of the warning", async function () {
      const credentials = {
         tokenUrl: `${origin}/token`,
         email: "e@x.test",
         password: "S3CRET"
      };
      nock(origin).post("/token").reply(401);
      nock(origin).post("/token").reply(200, {
         token: "T0KEN"
      });
      nock(origin).get("/restricted").reply(500);
      for (let attempt = 0; attempt < 2; attempt++) {
         const running = runningConfig();
         running.restrictedListingsSource = {
            ...running.restrictedListingsSource,
            ...credentials
         };
         const {
            calls,
            logger
         } = recordingLogger();
         await refreshRestrictedListings(running, logger, noRetry);
         const logged = JSON.stringify(calls.warn);
         assert.equal(calls.warn.length, 1);
         assert.ok(!logged.includes("S3CRET") && !logged.includes("T0KEN"), logged.slice(0, 300));
      }
   });
   it("does nothing when no source URL is set", async function () {
      const running = runningConfig("");
      const {
         calls,
         logger
      } = recordingLogger();
      await refreshRestrictedListings(running, logger);
      assert.deepEqual(running.settings.restrictedListings, ["A"]);
      assert.deepEqual(calls, {
         info: [],
         warn: []
      });
   });
});