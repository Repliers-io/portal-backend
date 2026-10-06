import { timingSafeEqual } from "node:crypto";
import { container } from "tsyringe";
import { AppConfig } from "../config.js";
import { Context, Next } from "koa";
import _debug from 'debug';
const debug = _debug("repliers:lib:xffprovider");
function tokensMatch(a: string, b: string): boolean {
   const bufferA = Buffer.from(a);
   const bufferB = Buffer.from(b);
   return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}
declare module 'koa' {
   interface DefaultState {
      'enable.xff': boolean;
   }
}
type XffSkipReason = 'ssg' | 'route-flag-missing' | 'proxy-disabled' | 'no-client-ip' | 'no-request-context';
export function sanitizeIpAddr(ip: string): string {
   return ip.replace(/::ffff:/g, '').trim();
}
export class XFFProvider {
   private xff: string;
   private ssg = false;
   constructor(private ctx: Context) {
      debug('Creating XFFProvider with x-forwarded-for %O', {
         xff: ctx.get('x-forwarded-for'),
         xffToken: ctx.get('X-Forwarded-For-Token')
      });
      this.ssg = this.isSsgRequest(ctx);
      this.xff = this.getClientIp(ctx);
      const xffHeader = ctx.get('x-forwarded-for');
      debug(`x-forwarded-for: ${xffHeader}, passed downstream: ${this.xff}`);
   }

   // Read at call time, not in the constructor: services are often resolved by
   // middleware that runs before the handler sets the flag.
   skipReason(): XffSkipReason | undefined {
      if (this.ssg) return 'ssg';
      if (!this.ctx.state['enable.xff']) return 'route-flag-missing';
      if (!container.resolve<AppConfig>('config').repliers.proxy_xff) return 'proxy-disabled';
      if (!this.xff) return 'no-client-ip';
      return undefined;
   }
   isEnabled() {
      return !this.skipReason();
   }
   getHeader() {
      return this.xff;
   }
   isSsg() {
      return this.ssg;
   }
   private getClientIp(ctx: Context): string {
      const xForwardedFor = ctx.get('x-forwarded-for');
      if (!xForwardedFor || typeof xForwardedFor !== 'string') {
         return '';
      }
      const ips = xForwardedFor.split(',');
      const lastIndex = ips.length - 1;
      const lastIp = typeof ips[lastIndex] === 'string' ? sanitizeIpAddr(ips[lastIndex]) : '';
      switch (true) {
         case this.isSsrRequest(ctx):
            return this.getClientIpBehindSSR(ips);
         case this.ssg:
            return '';
         default:
            return lastIp;
      }
   }
   private isSsrRequest(ctx: Context): boolean {
      const nextToken = ctx.get('X-Forwarded-For-Token');
      const ssrToken = container.resolve<AppConfig>('config').repliers.xff.ssr_token;
      debug(`[isSsrRequest]: nextToken: ${nextToken}, expectedToken: ${ssrToken}`);
      return !!nextToken && tokensMatch(nextToken, ssrToken);
   }
   private isSsgRequest(ctx: Context): boolean {
      const nextToken = ctx.get('X-Forwarded-For-Token');
      const ssgToken = container.resolve<AppConfig>('config').repliers.xff.ssg_token;
      debug(`[isSsgRequest]: nextToken: ${nextToken}, expectedToken: ${ssgToken}`);
      return !!nextToken && tokensMatch(nextToken, ssgToken);
   }
   private getClientIpBehindSSR(ips: string[]): string {
      let offset = container.resolve<AppConfig>('config').repliers.xff.ssr_ipaddr_offset;
      while (0 < offset) {
         const desiredIndex = ips.length - offset;
         if (desiredIndex < 0 || typeof ips[desiredIndex] !== 'string') {
            debug(`[getClientIpBehindSSR]: offset ${offset} -> ${desiredIndex} is out of bounds for ips: ${ips}. Decreasing offset`);
            offset -= 1;
            continue;
         }
         return sanitizeIpAddr(ips[desiredIndex]);
      }
      return '';
   }
   static getMiddleware() {
      return async (ctx: Context, next: Next) => {
         ctx.state.container.register<XFFProvider>("XForwardedFor", {
            useFactory: () => {
               return new XFFProvider(ctx);
            }
         });
         await next();
      };
   }
}