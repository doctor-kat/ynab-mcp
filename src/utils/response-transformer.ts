import type { CurrencyFormat } from "../api/common/CurrencyFormat.js";
import { formatMilliunits } from "./currency-formatter.js";

/**
 * Field names that contain monetary amounts in milliunits
 * These will get corresponding _formatted fields added
 */
const AMOUNT_FIELD_NAMES = new Set([
  "amount",
  "balance",
  "cleared_balance",
  "uncleared_balance",
  "budgeted",
  "activity",
  "goal_target",
  "goal_overall_funded",
  "goal_under_funded",
  "goal_overall_left",
  "income",
  "activity",
  "available",
  "carry_over",
]);

/**
 * Add formatted currency fields to a response object
 *
 * Recursively walks through the response data and adds *_formatted fields
 * next to any field that contains milliunit amounts. Original milliunits
 * are preserved.
 *
 * @param data - The response data (object, array, or primitive)
 * @param currencyFormat - The currency format to use for formatting
 * @returns The same data structure with _formatted fields added
 *
 * @example
 * ```typescript
 * const input = {
 *   amount: -50000,
 *   subtransactions: [
 *     { amount: -25000, category_id: "cat-1" }
 *   ]
 * };
 *
 * const output = addFormattedAmounts(input, usdFormat);
 * // {
 * //   amount: -50000,
 * //   amount_formatted: "-$50.00",
 * //   subtransactions: [
 * //     {
 * //       amount: -25000,
 * //       amount_formatted: "-$25.00",
 * //       category_id: "cat-1"
 * //     }
 * //   ]
 * // }
 * ```
 */
export function addFormattedAmounts(
  data: any,
  currencyFormat: CurrencyFormat | null | undefined,
): any {
  // Handle null/undefined
  if (data === null || data === undefined) {
    return data;
  }

  // Handle arrays - recursively process each element
  if (Array.isArray(data)) {
    return data.map((item) => addFormattedAmounts(item, currencyFormat));
  }

  // Handle objects
  if (typeof data === "object") {
    const result: any = {};

    for (const [key, value] of Object.entries(data)) {
      // Copy original value
      result[key] = value;

      // If this is an amount field and the value is a number, add formatted version
      if (
        AMOUNT_FIELD_NAMES.has(key) &&
        typeof value === "number" &&
        value !== null
      ) {
        result[`${key}_formatted`] = formatMilliunits(value, currencyFormat);
      }

      // Recursively process nested objects/arrays
      if (value !== null && typeof value === "object") {
        result[key] = addFormattedAmounts(value, currencyFormat);
      }
    }

    return result;
  }

  // Return primitives as-is
  return data;
}
