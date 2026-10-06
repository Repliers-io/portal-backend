import assert from "assert";
import type { Context } from "koa";
import cached, { getCacheStore, cacheKey, Cached, sendCached } from "../../../src/lib/decorators/cached.js";
function fakeCtx() {
   const headers: Record<string, string> = {};
   const ctx = {
      headers,
      body: undefined as unknown,
      set(key: string, value: string) {
         headers[key] = value;
      }
   };
   return ctx as typeof ctx & Context;
}
describe("cached decorator", function () {
   describe("cacheKey", function () {
      it("should serialize a single string argument", function () {
         assert.equal(cacheKey("hello"), '["hello"]');
      });
      it("should serialize multiple arguments", function () {
         assert.equal(cacheKey("a", 1, true), '["a",1,true]');
      });
      it("should serialize no arguments", function () {
         assert.equal(cacheKey(), "[]");
      });
   });
   describe("getCacheStore", function () {
      it("should return the same instance for the same namespace", function () {
         const store1 = getCacheStore("test:singleton");
         const store2 = getCacheStore("test:singleton");
         assert.strictEqual(store1, store2);
      });
      it("should return different instances for different namespaces", function () {
         const store1 = getCacheStore("test:ns-a");
         const store2 = getCacheStore("test:ns-b");
         assert.notStrictEqual(store1, store2);
      });
   });
   describe("getCacheStore + @cached share the same Keyv instance", function () {
      const namespace = "test:shared-instance";
      const ttl = 60_000;
      class TestService {
         callCount = 0;
         @cached(namespace, ttl)
         async getValue(key: string): Promise<string | Cached<string>> {
            this.callCount++;
            return `value-for-${key}`;
         }
      }
      it("should allow invalidation via getCacheStore", async function () {
         const service = new TestService();

         // First call — cache miss
         const result1 = await service.getValue("abc");
         assert.equal(service.callCount, 1);
         assert.equal((result1 as Cached<string>).result, "value-for-abc");

         // Second call — cache hit, callCount stays at 1
         const result2 = await service.getValue("abc");
         assert.equal(service.callCount, 1);
         assert.equal((result2 as Cached<string>).result, "value-for-abc");

         // Invalidate via getCacheStore
         const store = getCacheStore(namespace);
         await store.delete(cacheKey("abc"));

         // Third call — cache miss again after invalidation
         const result3 = await service.getValue("abc");
         assert.equal(service.callCount, 2);
         assert.equal((result3 as Cached<string>).result, "value-for-abc");
      });
      it("should not affect other keys when invalidating one key", async function () {
         const service = new TestService();
         await service.getValue("key1");
         await service.getValue("key2");
         assert.equal(service.callCount, 2);

         // Invalidate only key1
         const store = getCacheStore(namespace);
         await store.delete(cacheKey("key1"));

         // key2 should still be cached
         await service.getValue("key2");
         assert.equal(service.callCount, 2);

         // key1 should miss
         await service.getValue("key1");
         assert.equal(service.callCount, 3);
      });
   });
   describe("@cached decorator behavior", function () {
      class CounterService {
         callCount = 0;
         @cached("test:decorator-behavior", 60_000)
         async compute(x: number): Promise<number | Cached<number>> {
            this.callCount++;
            return x * 2;
         }
      }
      it("should cache based on arguments", async function () {
         const service = new CounterService();
         const r1 = await service.compute(5);
         assert.equal((r1 as Cached<number>).result, 10);
         assert.equal(service.callCount, 1);

         // Same arg — cached
         await service.compute(5);
         assert.equal(service.callCount, 1);

         // Different arg — cache miss
         const r2 = await service.compute(7);
         assert.equal((r2 as Cached<number>).result, 14);
         assert.equal(service.callCount, 2);
      });
      it("should return expires field in seconds", async function () {
         const service = new CounterService();
         const result = (await service.compute(99)) as Cached<number>;
         assert.ok(result.expires > 0);
         assert.ok(result.expires <= 60);
      });
   });
   describe("sendCached", function () {
      it("should unwrap a cached value and set a valid Cache-Control header", function () {
         const ctx = fakeCtx();
         const payload = {
            name: "tower"
         };
         sendCached(ctx, {
            expires: 120,
            result: payload
         });
         assert.equal(ctx.headers["Cache-Control"], "private, max-age=120");
         assert.ok(!ctx.headers["Cache-Control"].includes(" = "));
         assert.strictEqual(ctx.body, payload);
      });
      it("should send a plain value as-is without a Cache-Control header", function () {
         const ctx = fakeCtx();
         const payload = [{
            id: 1
         }, {
            id: 2
         }];
         sendCached(ctx, payload);
         assert.strictEqual(ctx.body, payload);
         assert.equal(ctx.headers["Cache-Control"], undefined);
      });
      it("should treat an object without an expires key as a plain value", function () {
         const ctx = fakeCtx();
         const payload = {
            result: "data"
         };
         sendCached(ctx, payload);
         assert.strictEqual(ctx.body, payload);
         assert.equal(ctx.headers["Cache-Control"], undefined);
      });
      it("should handle null and primitive values without throwing", function () {
         const nullCtx = fakeCtx();
         sendCached(nullCtx, null);
         assert.strictEqual(nullCtx.body, null);
         assert.equal(nullCtx.headers["Cache-Control"], undefined);
         const numberCtx = fakeCtx();
         sendCached(numberCtx, 42);
         assert.strictEqual(numberCtx.body, 42);
         assert.equal(numberCtx.headers["Cache-Control"], undefined);
      });
   });
});