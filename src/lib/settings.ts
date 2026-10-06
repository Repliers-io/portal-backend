import type { AppConfig } from "../config.js";
import presets from "../settings/index.js";
import _ from 'lodash';
export type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;
function constructUrl(host: string, path: string): string {
   const normalizedHost = host.replace(/\/+$/, '');
   const normalizedPath = path.replace(/^\/+/, '');
   return `${normalizedHost}/${normalizedPath}`;
}
function isRelativeUrl(url: string): boolean {
   return url.startsWith('/') || !url.includes('://');
}
function constructEventsCollectionUrls(config: AppConfig): AppConfig {
   const {
      urlHost,
      propertyUrl,
      clientUrl,
      estimateUrl,
      savedSearchUrl
   } = config.eventsCollection;
   if (urlHost) {
      const absoluteUrls = [{
         name: 'propertyUrl',
         value: propertyUrl
      }, {
         name: 'clientUrl',
         value: clientUrl
      }, {
         name: 'estimateUrl',
         value: estimateUrl
      }].filter(u => !isRelativeUrl(u.value));
      if (absoluteUrls.length > 0) {
         const details = absoluteUrls.map(u => `  ${u.name}: "${u.value}"`).join('\n');
         console.error(`[SETTINGS] eventsCollection URLs already contain a full URL but SETTINGS_EVENTS_COLLECTOR_URL_HOST is also set ("${urlHost}").\n` + `This will produce malformed URLs. The URL paths should be relative (e.g., "/agent/client/[CLIENT_ID]").\n` + `Conflicting URLs:\n${details}`);
         throw new Error(`[SETTINGS] eventsCollection URL conflict: full URLs found while urlHost is set to "${urlHost}"`);
      }
      config.eventsCollection.propertyUrl = constructUrl(urlHost, propertyUrl);
      config.eventsCollection.clientUrl = constructUrl(urlHost, clientUrl);
      config.eventsCollection.estimateUrl = constructUrl(urlHost, estimateUrl);
      if (savedSearchUrl) {
         config.eventsCollection.savedSearchUrl = constructUrl(urlHost, savedSearchUrl);
      }
   } else {
      const relativeUrls = [{
         name: 'propertyUrl',
         value: propertyUrl
      }, {
         name: 'clientUrl',
         value: clientUrl
      }, {
         name: 'estimateUrl',
         value: estimateUrl
      }].filter(u => isRelativeUrl(u.value));
      if (relativeUrls.length > 0) {
         const details = relativeUrls.map(u => `  ${u.name}: "${u.value}"`).join('\n');
         console.error(`[SETTINGS] eventsCollection URLs are relative paths but SETTINGS_EVENTS_COLLECTOR_URL_HOST is not set.\n` + `These URLs will not resolve correctly without a host. Set SETTINGS_EVENTS_COLLECTOR_URL_HOST.\n` + `Relative URLs:\n${details}`);
         throw new Error(`[SETTINGS] eventsCollection URLs are relative but SETTINGS_EVENTS_COLLECTOR_URL_HOST is not set`);
      }
   }
   const resolvedUrls = [config.eventsCollection.clientUrl, config.eventsCollection.propertyUrl, config.eventsCollection.estimateUrl];
   const localhostUrls = resolvedUrls.filter(u => u.includes('localhost'));
   if (localhostUrls.length > 0) {
      console.warn(`[SETTINGS] eventsCollection URLs contain localhost — links will point to localhost:\n${localhostUrls.map(u => `  "${u}"`).join('\n')}`);
   }
   console.log(`[SETTINGS] eventsCollection URLs resolved:\n` + `  clientUrl: "${config.eventsCollection.clientUrl}"\n` + `  propertyUrl: "${config.eventsCollection.propertyUrl}"\n` + `  estimateUrl: "${config.eventsCollection.estimateUrl}"`);
   return config;
}

//TODO: ADD Logging
export default class Settings {
   private settings: DeepPartial<AppConfig> = {};
   constructor(private preset?: string) {
      if (!this.preset) {
         console.warn(`[SETTINGS] No preset specified. Using environment variables only.
                  You can use the APP_SETTINGS_PRESET environment variable to specify a settings preset.`);
         return;
      }
      console.log(`[SETTINGS] Trying preset: ${this.preset}`);
      if (this.preset in presets) {
         const presetValue = presets[this.preset];
         console.log(`[SETTINGS] Preset loaded: ${this.preset}`);
         if (presetValue !== undefined) {
            // Now TypeScript knows presetValue is Partial<AppConfig>
            this.settings = presetValue;
         }
      } else {
         console.warn(`[SETTINGS] Preset not found: ${this.preset}`);
      }
   }
   merge(config: AppConfig): AppConfig {
      const mergedConfig = _.mergeWith(config, this.settings, (_objValue, srcValue) => {
         if (Array.isArray(srcValue)) return srcValue;
         return undefined;
      });
      return this.postProcess(mergedConfig);
   }
   private postProcess(config: AppConfig): AppConfig {
      return constructEventsCollectionUrls(config);
   }
}