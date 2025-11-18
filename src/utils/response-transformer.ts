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
 * next to any field that contains milliunit amounts.
 *
 * @param data - The response data (object, array, or primitive)
 * @param currencyFormat - The currency format to use for formatting
 * @param includeMilliunits - If false, removes original milliunit fields (default: false for 40% token reduction)
 * @returns The data structure with formatted amounts (and optionally milliunits)
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
 * // Default: formatted only (token-efficient)
 * const output = addFormattedAmounts(input, usdFormat);
 * // {
 * //   amount_formatted: "-$50.00",
 * //   subtransactions: [
 * //     {
 * //       amount_formatted: "-$25.00",
 * //       category_id: "cat-1"
 * //     }
 * //   ]
 * // }
 *
 * // With milliunits: both formats (needed for splits)
 * const withMilliunits = addFormattedAmounts(input, usdFormat, true);
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
  includeMilliunits: boolean = false,
): any {
  // Handle null/undefined
  if (data === null || data === undefined) {
    return data;
  }

  // Handle arrays - recursively process each element
  if (Array.isArray(data)) {
    return data.map((item) =>
      addFormattedAmounts(item, currencyFormat, includeMilliunits),
    );
  }

  // Handle objects
  if (typeof data === "object") {
    const result: any = {};

    for (const [key, value] of Object.entries(data)) {
      const isAmountField =
        AMOUNT_FIELD_NAMES.has(key) &&
        typeof value === "number" &&
        value !== null;

      // If this is an amount field and we're excluding milliunits, skip the original field
      if (isAmountField && !includeMilliunits) {
        // Add formatted version only
        result[`${key}_formatted`] = formatMilliunits(value, currencyFormat);
      } else {
        // Copy original value
        result[key] = value;

        // If this is an amount field and we're including milliunits, add formatted version
        if (isAmountField && includeMilliunits) {
          result[`${key}_formatted`] = formatMilliunits(value, currencyFormat);
        }

        // Recursively process nested objects/arrays
        if (value !== null && typeof value === "object") {
          result[key] = addFormattedAmounts(
            value,
            currencyFormat,
            includeMilliunits,
          );
        }
      }
    }

    return result;
  }

  // Return primitives as-is
  return data;
}
