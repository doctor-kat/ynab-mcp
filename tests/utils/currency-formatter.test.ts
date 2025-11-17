import { describe, it, expect, beforeEach } from "vitest";
import { formatMilliunits, parseAmount, clearFormatterCache } from "../../src/utils/currency-formatter.js";
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

describe("Currency Parser", () => {
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

  describe("USD parsing", () => {
    it("should parse raw numbers to milliunits", () => {
      expect(parseAmount(50, usdFormat)).toBe(50000);
      expect(parseAmount(100.5, usdFormat)).toBe(100500);
      expect(parseAmount(1234.56, usdFormat)).toBe(1234560);
    });

    it("should parse formatted currency strings to milliunits", () => {
      expect(parseAmount("$50.00", usdFormat)).toBe(50000);
      expect(parseAmount("$100.50", usdFormat)).toBe(100500);
      expect(parseAmount("$1,234.56", usdFormat)).toBe(1234560);
    });

    it("should parse negative amounts correctly", () => {
      expect(parseAmount(-50, usdFormat)).toBe(-50000);
      expect(parseAmount("-$50.00", usdFormat)).toBe(-50000);
      expect(parseAmount("-$1,234.56", usdFormat)).toBe(-1234560);
    });

    it("should handle strings without currency symbol", () => {
      expect(parseAmount("50.00", usdFormat)).toBe(50000);
      expect(parseAmount("1,234.56", usdFormat)).toBe(1234560);
    });

    it("should handle zero", () => {
      expect(parseAmount(0, usdFormat)).toBe(0);
      expect(parseAmount("$0.00", usdFormat)).toBe(0);
    });

    it("should handle amounts with extra whitespace", () => {
      expect(parseAmount("  $50.00  ", usdFormat)).toBe(50000);
      expect(parseAmount(" $ 50.00 ", usdFormat)).toBe(50000);
    });
  });

  describe("EUR parsing", () => {
    it("should parse raw numbers to milliunits", () => {
      expect(parseAmount(50, eurFormat)).toBe(50000);
      expect(parseAmount(100.5, eurFormat)).toBe(100500);
    });

    it("should parse EUR formatted strings with comma decimal separator", () => {
      expect(parseAmount("€50,00", eurFormat)).toBe(50000);
      expect(parseAmount("€100,50", eurFormat)).toBe(100500);
      expect(parseAmount("€1.234,56", eurFormat)).toBe(1234560);
    });

    it("should parse negative EUR amounts", () => {
      expect(parseAmount(-50, eurFormat)).toBe(-50000);
      expect(parseAmount("-€50,00", eurFormat)).toBe(-50000);
    });
  });

  describe("JPY parsing (zero decimal places)", () => {
    it("should parse raw numbers to milliunits", () => {
      expect(parseAmount(1, jpyFormat)).toBe(1000);
      expect(parseAmount(1000, jpyFormat)).toBe(1000000);
    });

    it("should parse JPY formatted strings", () => {
      expect(parseAmount("¥1", jpyFormat)).toBe(1000);
      expect(parseAmount("¥1,000", jpyFormat)).toBe(1000000);
      expect(parseAmount("¥1,234", jpyFormat)).toBe(1234000);
    });

    it("should parse negative JPY amounts", () => {
      expect(parseAmount(-1, jpyFormat)).toBe(-1000);
      expect(parseAmount("-¥1,000", jpyFormat)).toBe(-1000000);
    });
  });

  describe("null/undefined handling", () => {
    it("should use USD default when format is null", () => {
      expect(parseAmount(50, null)).toBe(50000);
      expect(parseAmount("$50.00", null)).toBe(50000);
    });

    it("should use USD default when format is undefined", () => {
      expect(parseAmount(50, undefined)).toBe(50000);
      expect(parseAmount("$50.00", undefined)).toBe(50000);
    });
  });

  describe("edge cases", () => {
    it("should handle very large amounts", () => {
      expect(parseAmount(1000000, usdFormat)).toBe(1000000000);
      expect(parseAmount("$1,000,000.00", usdFormat)).toBe(1000000000);
    });

    it("should handle very small amounts", () => {
      expect(parseAmount(0.01, usdFormat)).toBe(10);
      expect(parseAmount("$0.01", usdFormat)).toBe(10);
    });

    it("should handle invalid strings gracefully", () => {
      // parseFloat returns NaN for invalid strings
      expect(parseAmount("invalid", usdFormat)).toBeNaN();
      expect(parseAmount("", usdFormat)).toBeNaN();
    });

    it("should round floating point precision correctly", () => {
      // JavaScript floating point: 0.1 + 0.2 = 0.30000000000000004
      expect(parseAmount(0.1 + 0.2, usdFormat)).toBe(300);
      expect(parseAmount(1234.567, usdFormat)).toBe(1234567);
    });
  });

  describe("roundtrip formatting and parsing", () => {
    it("should roundtrip USD amounts correctly", () => {
      const milliunits = 1234560;
      const formatted = formatMilliunits(milliunits, usdFormat);
      const parsed = parseAmount(formatted, usdFormat);
      expect(parsed).toBe(milliunits);
    });

    it("should roundtrip EUR amounts correctly", () => {
      const milliunits = 1234560;
      const formatted = formatMilliunits(milliunits, eurFormat);
      const parsed = parseAmount(formatted, eurFormat);
      expect(parsed).toBe(milliunits);
    });

    it("should roundtrip JPY amounts correctly", () => {
      const milliunits = 1234000;
      const formatted = formatMilliunits(milliunits, jpyFormat);
      const parsed = parseAmount(formatted, jpyFormat);
      expect(parsed).toBe(milliunits);
    });

    it("should roundtrip negative amounts correctly", () => {
      const milliunits = -50000;
      const formatted = formatMilliunits(milliunits, usdFormat);
      const parsed = parseAmount(formatted, usdFormat);
      expect(parsed).toBe(milliunits);
    });
  });
});
