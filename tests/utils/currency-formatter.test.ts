import { describe, it, expect, beforeEach } from "vitest";
import { formatMilliunits, clearFormatterCache } from "../../src/utils/currency-formatter.js";
import type { CurrencyFormat } from "../../src/api/common/CurrencyFormat.js";

describe("Currency Formatter", () => {
  beforeEach(() => {
    clearFormatterCache();
  });

  const usdFormat: CurrencyFormat = {
    iso_code: "USD",
    example_format: "$123.45",
    decimal_digits: 2,
    decimal_separator: ".",
    symbol_first: true,
    group_separator: ",",
    currency_symbol: "$",
    display_symbol: true,
  };

  const eurFormat: CurrencyFormat = {
    iso_code: "EUR",
    example_format: "€123,45",
    decimal_digits: 2,
    decimal_separator: ",",
    symbol_first: false,
    group_separator: ".",
    currency_symbol: "€",
    display_symbol: true,
  };

  const jpyFormat: CurrencyFormat = {
    iso_code: "JPY",
    example_format: "¥1,234",
    decimal_digits: 0,
    decimal_separator: ".",
    symbol_first: true,
    group_separator: ",",
    currency_symbol: "¥",
    display_symbol: true,
  };

  describe("USD formatting", () => {
    it("should format positive amounts correctly", () => {
      expect(formatMilliunits(50000, usdFormat)).toBe("$50.00");
      expect(formatMilliunits(1000000, usdFormat)).toBe("$1,000.00");
      expect(formatMilliunits(1234567, usdFormat)).toBe("$1,234.57");
    });

    it("should format negative amounts correctly", () => {
      expect(formatMilliunits(-50000, usdFormat)).toBe("-$50.00");
      expect(formatMilliunits(-1000000, usdFormat)).toBe("-$1,000.00");
      expect(formatMilliunits(-1234567, usdFormat)).toBe("-$1,234.57");
    });

    it("should format zero correctly", () => {
      expect(formatMilliunits(0, usdFormat)).toBe("$0.00");
    });

    it("should handle small amounts", () => {
      expect(formatMilliunits(1, usdFormat)).toBe("$0.00");
      expect(formatMilliunits(10, usdFormat)).toBe("$0.01");
      expect(formatMilliunits(100, usdFormat)).toBe("$0.10");
      expect(formatMilliunits(1000, usdFormat)).toBe("$1.00");
    });
  });

  describe("EUR formatting", () => {
    it("should format positive amounts correctly", () => {
      expect(formatMilliunits(50000, eurFormat)).toBe("€50.00");
      expect(formatMilliunits(1000000, eurFormat)).toBe("€1,000.00");
      expect(formatMilliunits(1234567, eurFormat)).toBe("€1,234.57");
    });

    it("should format negative amounts correctly", () => {
      expect(formatMilliunits(-50000, eurFormat)).toBe("-€50.00");
      expect(formatMilliunits(-1234567, eurFormat)).toBe("-€1,234.57");
    });
  });

  describe("JPY formatting (zero decimal places)", () => {
    it("should format positive amounts correctly", () => {
      expect(formatMilliunits(1000, jpyFormat)).toBe("¥1");
      expect(formatMilliunits(1000000, jpyFormat)).toBe("¥1,000");
      expect(formatMilliunits(1234567, jpyFormat)).toBe("¥1,235");
    });

    it("should format negative amounts correctly", () => {
      expect(formatMilliunits(-1000, jpyFormat)).toBe("-¥1");
      expect(formatMilliunits(-1000000, jpyFormat)).toBe("-¥1,000");
    });

    it("should round fractional yen correctly", () => {
      expect(formatMilliunits(1234, jpyFormat)).toBe("¥1");
      expect(formatMilliunits(1567, jpyFormat)).toBe("¥2");
    });
  });

  describe("null/undefined handling", () => {
    it("should use USD default when format is null", () => {
      expect(formatMilliunits(50000, null)).toBe("$50.00");
    });

    it("should use USD default when format is undefined", () => {
      expect(formatMilliunits(50000, undefined)).toBe("$50.00");
    });
  });

  describe("edge cases", () => {
    it("should handle very large amounts", () => {
      expect(formatMilliunits(1000000000000, usdFormat)).toBe("$1,000,000,000.00");
      expect(formatMilliunits(999999990000, usdFormat)).toBe("$999,999,990.00");
    });

    it("should handle very small negative amounts", () => {
      expect(formatMilliunits(-1, usdFormat)).toBe("-$0.00");
      expect(formatMilliunits(-10, usdFormat)).toBe("-$0.01");
    });
  });

  describe("formatter caching", () => {
    it("should cache formatters for reuse", () => {
      // First call creates formatter
      const result1 = formatMilliunits(50000, usdFormat);

      // Second call should reuse cached formatter
      const result2 = formatMilliunits(100000, usdFormat);

      expect(result1).toBe("$50.00");
      expect(result2).toBe("$100.00");
    });

    it("should clear cache when requested", () => {
      formatMilliunits(50000, usdFormat);
      clearFormatterCache();

      // Should still work after cache clear
      expect(formatMilliunits(50000, usdFormat)).toBe("$50.00");
    });
  });
});
