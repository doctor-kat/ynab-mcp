import { describe, it, expect } from "vitest";
import { addFormattedAmounts } from "../../src/utils/response-transformer.js";
import type { CurrencyFormat } from "../../src/api/common/CurrencyFormat.js";

describe("Response Transformer", () => {
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

  describe("simple object transformation", () => {
    it("should add formatted amount field", () => {
      const input = {
        amount: -50000,
        memo: "Test transaction",
      };

      const result = addFormattedAmounts(input, usdFormat);

      expect(result).toEqual({
        amount: -50000,
        amount_formatted: "-$50.00",
        memo: "Test transaction",
      });
    });

    it("should add formatted balance fields", () => {
      const input = {
        balance: 1000000,
        cleared_balance: 950000,
        uncleared_balance: 50000,
      };

      const result = addFormattedAmounts(input, usdFormat);

      expect(result).toEqual({
        balance: 1000000,
        balance_formatted: "$1,000.00",
        cleared_balance: 950000,
        cleared_balance_formatted: "$950.00",
        uncleared_balance: 50000,
        uncleared_balance_formatted: "$50.00",
      });
    });

    it("should add formatted budget-related fields", () => {
      const input = {
        budgeted: 500000,
        activity: -350000,
      };

      const result = addFormattedAmounts(input, usdFormat);

      expect(result).toEqual({
        budgeted: 500000,
        budgeted_formatted: "$500.00",
        activity: -350000,
        activity_formatted: "-$350.00",
      });
    });
  });

  describe("nested object transformation", () => {
    it("should transform nested transaction with subtransactions", () => {
      const input = {
        amount: -100000,
        subtransactions: [
          {
            amount: -50000,
            category_id: "cat-1",
            memo: "Split 1",
          },
          {
            amount: -50000,
            category_id: "cat-2",
            memo: "Split 2",
          },
        ],
      };

      const result = addFormattedAmounts(input, usdFormat);

      expect(result).toEqual({
        amount: -100000,
        amount_formatted: "-$100.00",
        subtransactions: [
          {
            amount: -50000,
            amount_formatted: "-$50.00",
            category_id: "cat-1",
            memo: "Split 1",
          },
          {
            amount: -50000,
            amount_formatted: "-$50.00",
            category_id: "cat-2",
            memo: "Split 2",
          },
        ],
      });
    });

    it("should transform deeply nested structures", () => {
      const input = {
        data: {
          transactions: [
            {
              amount: -50000,
              category_id: "cat-1",
            },
            {
              amount: -25000,
              category_id: "cat-2",
            },
          ],
        },
      };

      const result = addFormattedAmounts(input, usdFormat);

      expect(result).toEqual({
        data: {
          transactions: [
            {
              amount: -50000,
              amount_formatted: "-$50.00",
              category_id: "cat-1",
            },
            {
              amount: -25000,
              amount_formatted: "-$25.00",
              category_id: "cat-2",
            },
          ],
        },
      });
    });
  });

  describe("array transformation", () => {
    it("should transform array of transactions", () => {
      const input = [
        { amount: -50000, memo: "Transaction 1" },
        { amount: -25000, memo: "Transaction 2" },
      ];

      const result = addFormattedAmounts(input, usdFormat);

      expect(result).toEqual([
        {
          amount: -50000,
          amount_formatted: "-$50.00",
          memo: "Transaction 1",
        },
        {
          amount: -25000,
          amount_formatted: "-$25.00",
          memo: "Transaction 2",
        },
      ]);
    });
  });

  describe("edge cases", () => {
    it("should handle null values", () => {
      const result = addFormattedAmounts(null, usdFormat);
      expect(result).toBeNull();
    });

    it("should handle undefined values", () => {
      const result = addFormattedAmounts(undefined, usdFormat);
      expect(result).toBeUndefined();
    });

    it("should handle primitives", () => {
      expect(addFormattedAmounts(42, usdFormat)).toBe(42);
      expect(addFormattedAmounts("test", usdFormat)).toBe("test");
      expect(addFormattedAmounts(true, usdFormat)).toBe(true);
    });

    it("should handle empty objects", () => {
      const result = addFormattedAmounts({}, usdFormat);
      expect(result).toEqual({});
    });

    it("should handle empty arrays", () => {
      const result = addFormattedAmounts([], usdFormat);
      expect(result).toEqual([]);
    });

    it("should not add formatted field for null amounts", () => {
      const input = {
        amount: null,
        memo: "Test",
      };

      const result = addFormattedAmounts(input, usdFormat);

      expect(result).toEqual({
        amount: null,
        memo: "Test",
      });
    });

    it("should not add formatted field for non-number amounts", () => {
      const input = {
        amount: "not a number",
        memo: "Test",
      };

      const result = addFormattedAmounts(input, usdFormat);

      expect(result).toEqual({
        amount: "not a number",
        memo: "Test",
      });
    });
  });

  describe("all amount field names", () => {
    it("should format all recognized amount fields", () => {
      const input = {
        amount: 1000,
        balance: 2000,
        cleared_balance: 3000,
        uncleared_balance: 4000,
        budgeted: 5000,
        activity: 6000,
        goal_target: 7000,
        goal_overall_funded: 8000,
        goal_under_funded: 9000,
        goal_overall_left: 10000,
        income: 11000,
        available: 12000,
        carry_over: 13000,
      };

      const result = addFormattedAmounts(input, usdFormat);

      expect(result.amount_formatted).toBe("$1.00");
      expect(result.balance_formatted).toBe("$2.00");
      expect(result.cleared_balance_formatted).toBe("$3.00");
      expect(result.uncleared_balance_formatted).toBe("$4.00");
      expect(result.budgeted_formatted).toBe("$5.00");
      expect(result.activity_formatted).toBe("$6.00");
      expect(result.goal_target_formatted).toBe("$7.00");
      expect(result.goal_overall_funded_formatted).toBe("$8.00");
      expect(result.goal_under_funded_formatted).toBe("$9.00");
      expect(result.goal_overall_left_formatted).toBe("$10.00");
      expect(result.income_formatted).toBe("$11.00");
      expect(result.available_formatted).toBe("$12.00");
      expect(result.carry_over_formatted).toBe("$13.00");
    });
  });

  describe("mixed data structures", () => {
    it("should preserve non-amount fields unchanged", () => {
      const input = {
        id: "txn-123",
        date: "2025-01-15",
        amount: -50000,
        approved: true,
        cleared: "cleared",
        tags: ["groceries", "food"],
        metadata: {
          created_at: "2025-01-15T10:00:00Z",
        },
      };

      const result = addFormattedAmounts(input, usdFormat);

      expect(result.id).toBe("txn-123");
      expect(result.date).toBe("2025-01-15");
      expect(result.amount).toBe(-50000);
      expect(result.amount_formatted).toBe("-$50.00");
      expect(result.approved).toBe(true);
      expect(result.cleared).toBe("cleared");
      expect(result.tags).toEqual(["groceries", "food"]);
      expect(result.metadata).toEqual({
        created_at: "2025-01-15T10:00:00Z",
      });
    });
  });
});
