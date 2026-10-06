import { RplLastStatus, RplStatus, RplType, RplYesNo } from "../types/repliers.ts";
import { OtpMessageType, otpMessageTypes } from "../config.ts";
export const parseOtpMessageType = (type: string | undefined): OtpMessageType => {
   if (type === undefined || !otpMessageTypes.includes(type as OtpMessageType)) {
      return "link_and_code";
   }
   return type as OtpMessageType;
};
export const parseRplYesNo = (value: string | undefined): RplYesNo | undefined => {
   switch (value) {
      case "Y":
         return RplYesNo.Y;
      case "N":
         return RplYesNo.N;
      default:
         return undefined;
   }
};

/**
 * Generic function to parse and validate CSV enum values from environment variables
 * @param value - The CSV string to parse
 * @param enumObject - The enum object to validate against
 * @param defaultValue - The default value to return if parsing fails
 * @param enumName - Optional name for error messages
 * @returns Array of validated enum values
 */
function parseEnumArray<T extends string>(value: string | undefined, enumObject: Record<string, T>, defaultValue: T[], enumName?: string): T[] {
   if (!value) {
      return defaultValue;
   }
   const enumValues = Object.values(enumObject).map(v => v.toLowerCase() as T);
   const values = value.split(",").map(v => v.trim().toLowerCase());
   const validValues: T[] = [];
   const errors: string[] = [];
   for (const v of values) {
      if (enumValues.includes(v as T)) {
         validValues.push(v as T);
      } else {
         errors.push(`Invalid ${enumName || 'enum'} value: ${v}`);
      }
   }
   if (errors.length > 0) {
      console.warn(errors.join(", "));
      return defaultValue;
   }
   return validValues;
}
export const parseRplLastStatus = (value: string | undefined, defaultValue: RplLastStatus[]): RplLastStatus[] => {
   return parseEnumArray(value, RplLastStatus, defaultValue, "RplLastStatus");
};
export const parseRplStatus = (value: string | undefined, defaultValue: RplStatus[]): RplStatus[] => {
   return parseEnumArray(value, RplStatus, defaultValue, "RplStatus");
};
export const parseRplType = (value: string | undefined, defaultValue: RplType[]): RplType[] => {
   return parseEnumArray(value, RplType, defaultValue, "RplType");
};