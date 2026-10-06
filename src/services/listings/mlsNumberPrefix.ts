// Some boards store mlsNumbers with a board prefix (NWMLS = "NWM…"). When
// settings.mlsNumberPrefix is set we strip it from Repliers responses and re-add it to
// requests, so API consumers only deal in clean numbers. Every direction is idempotent.

export const addMlsPrefix = (value: string, prefix: string): string => prefix && value && !value.startsWith(prefix) ? `${prefix}${value}` : value;
export const stripMlsPrefix = (value: string, prefix: string): string => prefix && value && value.startsWith(prefix) ? value.slice(prefix.length) : value;

// Applies `fn` to every mlsNumber (string or string[]) in `node`, mutating in place.
const transformMlsNumbers = (node: unknown, fn: (value: string) => string): void => {
   if (Array.isArray(node)) {
      for (const item of node) transformMlsNumbers(item, fn);
      return;
   }
   if (!node || typeof node !== "object") return;
   const record = node as Record<string, unknown>;
   for (const key of Object.keys(record)) {
      if (key === "raw") continue; // raw MLS payload must stay verbatim
      const value = record[key];
      if (key !== "mlsNumber") {
         transformMlsNumbers(value, fn);
      } else if (typeof value === "string") {
         record[key] = fn(value);
      } else if (Array.isArray(value)) {
         record[key] = value.map(item => typeof item === "string" ? fn(item) : item);
      }
   }
};
export const stripMlsNumbers = <T,>(data: T, prefix: string): T => {
   if (prefix) transformMlsNumbers(data, value => stripMlsPrefix(value, prefix));
   return data;
};

// Path params (single/similar) sit in the URL, not in `data` — prefix those with
// addMlsPrefix at the call site.
export const addMlsNumbers = <T,>(data: T, prefix: string): T => {
   if (prefix) transformMlsNumbers(data, value => addMlsPrefix(value, prefix));
   return data;
};
export const mlsNumberCandidate = (value: string): boolean => /^\d+$/.test(value);

// Add the prefixed variant as a second keyword under OR, which widens a single-keyword
// search.
export const addMlsSearchVariant = (query: {
   search?: string;
   searchFields?: string;
   searchOperator?: string;
}, prefix: string): void => {
   const {
      search,
      searchFields
   } = query;
   if (!prefix || !search || !mlsNumberCandidate(search) || !searchFields) return;
   const fields = searchFields.split(",").map(field => field.trim());
   if (!fields.includes("mlsNumber") || fields.includes("address.streetNumber")) return;
   query.search = `${search} ${prefix}${search}`;
   query.searchOperator = "OR";
};