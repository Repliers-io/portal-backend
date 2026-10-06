import "reflect-metadata";
import nock from "nock";
import { container } from "tsyringe";
import type { Knex } from "knex";
import "../test/providers/index.js";

// Any request without a matching nock interceptor throws instead of reaching the
// real API — a mistyped method or path fails loudly rather than going out to the wire.
nock.disableNetConnect();
nock.enableNetConnect(/127\.0\.0\.1|localhost/);
export const mochaHooks = {
   beforeEach(done: () => void) {
      // do something before every test
      done();
   },
   afterAll(done: () => void) {
      container.resolve<Knex>("db").destroy().then(done);
   }
};