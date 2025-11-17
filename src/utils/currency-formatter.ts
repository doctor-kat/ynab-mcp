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
 * Parse a currency string or number to milliunits (inverse of formatMilliunits)
 *
 * YNAB uses milliunits for all monetary amounts:
 * - 1 currency unit = 1000 milliunits (for 2-decimal currencies)
 * - For USD: $50.00 = 50000 milliunits
 * - For JPY: ¥1 = 1000 milliunits
 *
 * @param input - Currency string (e.g., "$50.00") or number (e.g., 50)
 * @param currencyFormat - The currency format from YNAB API (can be null)
 * @returns Amount in milliunits (integer)
 *
 * @example
 * ```typescript
 * parseAmount("$50.00", usdFormat); // 50000
 * parseAmount(50, usdFormat); // 50000
 * parseAmount("-$1,234.56", usdFormat); // -1234560
 * parseAmount("€100,50", eurFormat); // 100500
 * ```
 */
export function parseAmount(
  input: string | number,
  currencyFormat: CurrencyFormat | null | undefined,
): number {
  // Use default format if null/undefined
  const format = (currencyFormat ?? DEFAULT_CURRENCY_FORMAT) as Exclude<CurrencyFormat, null>;

  // If input is already a number, just convert to milliunits
  if (typeof input === "number") {
    return Math.round(input * 1000);
  }

  // Parse string input
  let cleanedString = input.trim();

  // Remove currency symbol
  if (format.currency_symbol) {
    cleanedString = cleanedString.replace(format.currency_symbol, "");
  }

  // Smart separator detection:
  // When both comma and period exist, the last one is the decimal separator
  // When only one type exists, determine by position and count
  cleanedString = cleanedString.trim();
  const lastCommaIndex = cleanedString.lastIndexOf(",");
  const lastPeriodIndex = cleanedString.lastIndexOf(".");
  const commaCount = (cleanedString.match(/,/g) || []).length;
  const periodCount = (cleanedString.match(/\./g) || []).length;

  if (lastCommaIndex > -1 && lastPeriodIndex > -1) {
    // Both separators exist - the one that appears last is the decimal separator
    if (lastCommaIndex > lastPeriodIndex) {
      // Comma is decimal (e.g., "1.234,56")
      cleanedString = cleanedString.replace(/\./g, "").replace(",", ".");
    } else {
      // Period is decimal (e.g., "1,234.56")
      cleanedString = cleanedString.replace(/,/g, "");
    }
  } else if (lastCommaIndex > -1 && commaCount === 1 && lastCommaIndex === cleanedString.length - 3) {
    // Single comma in decimal position (e.g., "123,45")
    cleanedString = cleanedString.replace(",", ".");
  } else if (lastPeriodIndex > -1 && periodCount === 1 && lastPeriodIndex === cleanedString.length - 3) {
    // Single period in decimal position (e.g., "123.45")
    // Already in correct format
  } else {
    // Multiple separators of same type = thousands separators (e.g., "1,000" or "1.000")
    // Or single separator not in decimal position
    cleanedString = cleanedString.replace(/[,.]/g, "");
  }

  // Remove any remaining whitespace
  cleanedString = cleanedString.trim();

  // Parse to float
  const amount = parseFloat(cleanedString);

  // Convert to milliunits
  return Math.round(amount * 1000);
}

/**
 * Clear the formatter cache
 * Useful for testing or if currency formats change
 */
export function clearFormatterCache(): void {
  formatterCache.clear();
}
