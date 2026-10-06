import { ImportantFields } from "./listings.ts";
import _debug from "debug";
const debug = _debug("repliers:scrubber:base");
const FillString = "!scrubbed!";
const FillDate = "1900-06-21T01:39:00.000Z"; //Summer Solstice of 1900 - MAGIC string
const isoDateRegExp = new RegExp(/(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/);
export default class BaseScrubber {
   dropFields<T>(value: T, fields: Array<keyof T>, safeFields: string[]) {
      fields.forEach(field => {
         if (!safeFields.includes(field as ImportantFields)) {
            const fieldStr = String(field);
            const subSafeFields = safeFields.filter(sf => sf.startsWith(`${fieldStr}.`)).map(sf => sf.slice(fieldStr.length + 1));
            if (subSafeFields.length > 0 && typeof value[field] === "object" && value[field] !== null) {
               const obj = value[field] as Record<string, unknown>;
               for (const key of Object.keys(obj)) {
                  if (!subSafeFields.includes(key)) {
                     debug(`Dropping field: ${fieldStr}.${key}`);
                     delete obj[key];
                  }
               }
            } else {
               debug(`Dropping field: ${fieldStr}`);
               delete value[field];
            }
         }
      });
      return value;
   }
   valueScrubber(value: unknown) {
      switch (true) {
         case typeof value === "string":
            {
               if (isoDateRegExp.test(value)) {
                  return FillDate;
               }
               return FillString;
            }
         // Numbers scrub to the same string sentinel as text — a scrubbed 0 was
         // indistinguishable from a genuine 0 (a studio's numBedrooms, a "No"
         // boolean), so consumers can now detect scrubbing unambiguously.
         case typeof value === "number":
            return FillString;
         default:
            return value;
      }
   }
   objectScrubber<T>(obj: T, safeFields: string[]): T {
      const scrubbedObj = {
         ...obj
      };
      for (const key in scrubbedObj) {
         // For each unsafe fields we check
         if (!safeFields.includes(key)) {
            const subSafeFields = safeFields.filter(sf => sf.startsWith(`${key}.`)).map(sf => sf.slice(key.length + 1));

            // if it's nested object we check for sub-field safe fields
            if (typeof scrubbedObj[key] === "object" && scrubbedObj[key] !== null && !Array.isArray(scrubbedObj[key])) {
               scrubbedObj[key] = this.objectScrubber(scrubbedObj[key], subSafeFields);
            } else if (Array.isArray(scrubbedObj[key])) {
               // if it's an array, scrub each element
               debug(`Scrubbing array for key: ${String(key)}`);
               (scrubbedObj[key] as unknown) = (scrubbedObj[key] as unknown[]).map(item => {
                  if (typeof item === "object" && item !== null) {
                     return this.objectScrubber(item, subSafeFields);
                  }
                  return this.valueScrubber(item);
               });
            } else {
               // if it's not object, than it's regular value so we scrub it in the same way
               debug(`Scrubbing value for key: ${String(key)}`);
               (scrubbedObj[key] as unknown) = this.valueScrubber(scrubbedObj[key]);
            }
         }
      }
      return scrubbedObj;
   }
}