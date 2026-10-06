import { UserRole } from "../constants.js";
import crypto from "crypto";
import _ from "lodash";
export const howSimilar = (pattern: Record<string, unknown>, target: Record<string, unknown> | null | undefined) => {
   const all = Object.keys(pattern).length;
   let found = 0;
   for (const key in pattern) {
      if (target && key in target && target[key] == pattern[key]) {
         found++;
      }
   }
   return found / all;
};
export const normalizePhoneNumber = (phone: string | null | undefined): string | undefined => {
   // Return undefined for null, undefined, or empty input
   if (!phone) {
      return undefined;
   }

   // Ensure phone is a string
   if (!_.isString(phone)) {
      return undefined;
   }

   // Remove all non-digit characters except leading +
   const digits = phone.replace(/[^\d+]/g, "");

   // Handle different formats
   if (digits.startsWith("+1")) {
      // Handle +1 country code
      return digits.substring(1); // Remove the + but keep the 1
   } else if (digits.startsWith("1") && digits.length === 11) {
      // Already in the correct format (1 followed by 10 digits)
      return digits;
   } else if (digits.length === 10) {
      // 10-digit number without country code, add "1"
      return "1" + digits;
   }

   // Invalid phone number format
   return undefined;
};
export const normalizeEmail = (email: string | null | undefined): string | undefined => {
   // Return undefined for null, undefined, or empty input
   if (!email) {
      return undefined;
   }
   if (!_.isString(email)) {
      return undefined;
   }
   const trimmed = email.trim();
   if (!trimmed) {
      return undefined;
   }
   return trimmed.toLowerCase();
};
export const secureFubAvmLink = (clientUrl: string, clientId: string | number, salt?: string): string | undefined => {
   const url = clientUrl.replace("[CLIENT_ID]", clientId.toString());
   return salt && 0 < salt.length ? url + `?s=${calcSignature(clientId.toString(), salt)}` : url;
};
export function calcSignature(clientId: string | number, salt: string): string {
   const HASH_LENGTH = 16;
   const hashValue = `${clientId.toString()}${salt}`;
   // hex is safer to use in query params, but longer than base64 / ascii
   return crypto.createHash("shake256", {
      outputLength: HASH_LENGTH
   }).update(hashValue).digest("hex");
}
export function maybeClientId(clientId: string | number | null | undefined): number | undefined {
   if (clientId === null || clientId === undefined) {
      return undefined;
   }
   if (typeof clientId === "number") {
      return clientId;
   }
   return Number(clientId); // intentionally return NaN in case of invalid input
}
export function maybeRole(role: number | string | null | undefined): UserRole | undefined {
   if (role === null || role === undefined) {
      return undefined;
   }
   const roleNumber = typeof role === "number" ? role : Number(role);
   return Object.values(UserRole).find(r => r === roleNumber) as UserRole | undefined;
}
export function getBody(body: any | undefined) {
   if (_.isString(body) || _.isUndefined(body)) {
      return {};
   }
   return body;
}

/**
 * Merges a comma-separated field list with a set of required fields, dropping
 * empty segments and de-duplicating while preserving order (existing first).
 * Used to guarantee identity fields on both `fields` and `clusterFields`.
 */
export function withRequiredFields(csv: string | undefined, required: string[]): string {
   const merged = [...(csv ? csv.split(",") : []), ...required].filter(Boolean);
   return [...new Set(merged)].join(",");
}