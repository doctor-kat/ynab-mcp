/**
 * Unit tests for budget API functions
 */

import { describe, it, beforeEach, afterEach, expect } from "vitest";
import { getBudgets, getBudgetById, getBudgetSettingsById } from "../../src/api/budgets/index.js";
import { initializeClient } from "../../src/api/client.js";
import { createMockFetch, mockYnabResponses } from "../helpers/mock-fetch.js";
import { setupTestEnv, cleanupTestEnv } from "../helpers/test-env.js";

describe("Budget API", () => {
  beforeEach(() => {
    setupTestEnv();
  });

  afterEach(() => {
    cleanupTestEnv();
  });

  describe("getBudgets", () => {
    it("should fetch budgets list", async () => {
      const { fetch: mockFetch } = createMockFetch({
        responses: new Map([
          ["/budgets", { status: 200, ok: true, data: mockYnabResponses.budgets }],
        ]),
      });

      initializeClient({ fetchImpl: mockFetch });
      const result = await getBudgets();

      expect(result.data.budgets).toBeTruthy();
      expect(result.data.budgets.length).toBe(1);
      expect(result.data.budgets[0].id).toBe("budget-123");
      expect(result.data.budgets[0].name).toBe("Test Budget");
    });

    it("should include query parameters when provided", async () => {
      const { fetch: mockFetch, calls } = createMockFetch({
        responses: new Map([
          ["/budgets", { status: 200, ok: true, data: mockYnabResponses.budgets }],
        ]),
      });

      initializeClient({ fetchImpl: mockFetch });
      await getBudgets({ includeAccounts: true });

      expect(calls[0].url).toContain("include_accounts=true");
    });

    it("should not include query parameters when not provided", async () => {
      const { fetch: mockFetch, calls } = createMockFetch({
        responses: new Map([
          ["/budgets", { status: 200, ok: true, data: mockYnabResponses.budgets }],
        ]),
      });

      initializeClient({ fetchImpl: mockFetch });
      await getBudgets();

      expect(calls[0].url).not.toContain("include_accounts");
    });
  });

  describe("getBudgetById", () => {
    it("should fetch budget detail by ID", async () => {
      const { fetch: mockFetch } = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123", { status: 200, ok: true, data: mockYnabResponses.budgetDetail }],
        ]),
      });

      initializeClient({ fetchImpl: mockFetch });
      const result = await getBudgetById({ budgetId: "budget-123" });

      expect(result.data.budget).toBeTruthy();
      expect(result.data.budget.id).toBe("budget-123");
      expect(result.data.server_knowledge).toBe(100);
    });

    it("should include lastKnowledgeOfServer when provided", async () => {
      const { fetch: mockFetch, calls } = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123", { status: 200, ok: true, data: mockYnabResponses.budgetDetail }],
        ]),
      });

      initializeClient({ fetchImpl: mockFetch });
      await getBudgetById({
        budgetId: "budget-123",
        lastKnowledgeOfServer: 50,
      });

      expect(calls[0].url).toContain("last_knowledge_of_server=50");
    });

    it("should encode budget ID in URL", async () => {
      const { fetch: mockFetch, calls } = createMockFetch({
        responses: new Map([
          ["/budgets/", { status: 200, ok: true, data: mockYnabResponses.budgetDetail }],
        ]),
      });

      initializeClient({ fetchImpl: mockFetch });
      await getBudgetById({ budgetId: "budget/with/slashes" });

      expect(calls[0].url).toContain("budget%2Fwith%2Fslashes");
    });
  });

  describe("getBudgetSettingsById", () => {
    it("should fetch budget settings", async () => {
      const mockSettings = {
        data: {
          settings: {
            date_format: {
              format: "MM/DD/YYYY",
            },
            currency_format: {
              iso_code: "USD",
              example_format: "$123.45",
              decimal_digits: 2,
              decimal_separator: ".",
              symbol_first: true,
              group_separator: ",",
              currency_symbol: "$",
              display_symbol: true,
            },
          },
        },
      };

      const { fetch: mockFetch } = createMockFetch({
        responses: new Map([["/budgets/budget-123/settings", { status: 200, ok: true, data: mockSettings }]]),
      });

      initializeClient({ fetchImpl: mockFetch });
      const result = await getBudgetSettingsById({ budgetId: "budget-123" });

      expect(result.data.settings).toBeTruthy();
      expect(result.data.settings.currency_format.iso_code).toBe("USD");
    });
  });
});
