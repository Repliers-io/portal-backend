import { instanceCachingFactory } from "tsyringe";
export class DummyXFFProvider {
   constructor() {}
   isEnabled() {
      return false;
   }
   skipReason() {
      return 'no-request-context' as const;
   }
   getHeader() {
      return '';
   }
   isSsg() {
      return false;
   }
}
export default {
   token: "XForwardedFor",
   useFactory: instanceCachingFactory(() => {
      return new DummyXFFProvider();
   })
};