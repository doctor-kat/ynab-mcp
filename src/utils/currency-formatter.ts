import type { CurrencyFormat } from "../api/common/CurrencyFormat.js";

/**
 * Cache of Intl.NumberFormat instances to avoid recreating them
 * Key: iso_code
 */
const formatterCache = new Map<string, Intl.NumberFormat>();

/**
 * Default USD currency format for fallback
 */
const DEFAULT_CURRENCY_FORMAT: CurrencyFormat = {
  iso_code: "USD",
  example_format: "$123.45",
  decimal_digits: 2,
  decimal_separator: ".",
  symbol_first: true,
  group_separator: ",",
  currency_symbol: "$",
  display_symbol: true,
};

/**
 * Convert milliunits to a formatted currency string
 *
 * YNAB uses milliunits for all monetary amounts:
 * - 1000 milliunits = 1 currency unit (for 2-decimal currencies)
 * - For USD: 50000 milliunits = $50.00
 * - For JPY: 1000 milliunits = ¥1 (0 decimal places)
 *
 * @param milliunits - The amount in milliunits (integer)
 * @param currencyFormat - The currency format from YNAB API (can be null)
 * @returns Formatted currency string (e.g., "-$50.00", "€1,234.57")
 *
 * @example
 * ```typescript
 * formatMilliunits(-50000, usdFormat); // "-$50.00"
 * formatMilliunits(1234567, eurFormat); // "€1,234.57"
 * formatMilliunits(1000000, jpyFormat); // "¥1,000"
 * ```
 */
export function formatMilliunits(
  milliunits: number,
  currencyFormat: CurrencyFormat | null | undefined,
): string {
  // Use default format if null/undefined (guaranteed non-null after this)
  const format = (currencyFormat ?? DEFAULT_CURRENCY_FORMAT) as Exclude<CurrencyFormat, null>;

  // Convert milliunits to base currency amount
  // YNAB uses milliunits: 1000 milliunits = 1 currency unit
  // For USD: 50000 milliunits = 50.00 dollars
  // For JPY: 1000 milliunits = 1 yen (no decimals, but still /1000)
  const amount = milliunits / 1000;

  // Get or create cached formatter
  let formatter = formatterCache.get(format.iso_code);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: format.iso_code,
      minimumFractionDigits: format.decimal_digits,
      maximumFractionDigits: format.decimal_digits,
    });
    formatterCache.set(format.iso_code, formatter);
  }

  // formatter is guaranteed non-null after the if block
  return formatter.format(amount);
}

/**
 * Clear the formatter cache
 * Useful for testing or if currency formats change
 */
export function clearFormatterCache(): void {
  formatterCache.clear();
}
