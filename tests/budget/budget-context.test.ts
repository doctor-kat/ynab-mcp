/**
 * Tests for budget context functionality
 */

import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { budgetStore } from "../../src/budget/budget-store.js";
import { initializeClient } from "../../src/api/client.js";
import { createMockFetch, mockYnabResponses } from "../helpers/mock-fetch.js";

describe("BudgetContext", () => {
  let mockFetch: ReturnType<typeof createMockFetch>;

  beforeEach(() => {
    budgetStore.getState().reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with empty state", () => {
      const context = budgetStore.getState().getBudgetContext();
      expect(context.budgets).toEqual([]);
      expect(context.activeBudgetId).toBeNull();
      expect(context.lastFetched).toBeNull();
      expect(context.sessionId).toBeTruthy();
    });

    it("should fetch budgets and populate cache on initialize", async () => {
      mockFetch = createMockFetch({
        responses: new Map([
          ["/budgets", { status: 200, ok: true, data: mockYnabResponses.budgets }],
        ]),
      });

      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      await budgetStore.getState().initialize();

      const context = budgetStore.getState().getBudgetContext();
      expect(context.budgets.length).toBe(1);
      expect(context.budgets[0].id).toBe("budget-123");
      expect(context.budgets[0].name).toBe("Test Budget");
      expect(context.lastFetched).toBeTruthy();

      // Verify API call was made
      expect(mockFetch.calls.length).toBe(1);
      expect(mockFetch.calls[0].url).toContain("/budgets");
    });

    it("should auto-set active budget when user has exactly one budget", async () => {
      mockFetch = createMockFetch({
        responses: new Map([
          ["/budgets", { status: 200, ok: true, data: mockYnabResponses.budgets }],
        ]),
      });

      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      await budgetStore.getState().initialize();

      const context = budgetStore.getState().getBudgetContext();
      expect(context.activeBudgetId).toBe("budget-123");
      expect(context.activeBudgetName).toBe("Test Budget");
    });

    it("should auto-set first budget when user has multiple budgets", async () => {
      const multipleBudgets = {
        data: {
          budgets: [
            {
              id: "budget-1",
              name: "Personal Budget",
              last_modified_on: "2025-01-01T00:00:00.000Z",
            },
            {
              id: "budget-2",
              name: "Business Budget",
              last_modified_on: "2025-01-01T00:00:00.000Z",
            },
          ],
        },
      };

      mockFetch = createMockFetch({
        responses: new Map([
          ["/budgets", { status: 200, ok: true, data: multipleBudgets }],
        ]),
      });

      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      await budgetStore.getState().initialize();

      const context = budgetStore.getState().getBudgetContext();
      expect(context.budgets.length).toBe(2);
      // First budget should be auto-set as active
      expect(context.activeBudgetId).toBe("budget-1");
      expect(context.activeBudgetName).toBe("Personal Budget");
    });

    it("should handle API errors gracefully", async () => {
      mockFetch = createMockFetch({
        responses: new Map([
          ["/budgets", { status: 401, ok: false, data: mockYnabResponses.error }],
        ]),
      });

      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      // Should not throw - errors are logged but not thrown
      await expect(budgetStore.getState().initialize()).resolves.toBeUndefined();

      // Cache should remain empty
      const context = budgetStore.getState().getBudgetContext();
      expect(context.budgets).toEqual([]);
      expect(context.activeBudgetId).toBeNull();
    });
  });

  describe("setActiveBudget", () => {
    beforeEach(async () => {
      const multipleBudgets = {
        data: {
          budgets: [
            {
              id: "budget-1",
              name: "Personal Budget",
              last_modified_on: "2025-01-01T00:00:00.000Z",
            },
            {
              id: "budget-2",
              name: "Business Budget",
              last_modified_on: "2025-01-01T00:00:00.000Z",
            },
          ],
        },
      };

      mockFetch = createMockFetch({
        responses: new Map([
          ["/budgets", { status: 200, ok: true, data: multipleBudgets }],
        ]),
      });

      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      await budgetStore.getState().initialize();
      mockFetch.reset(); // Reset call count
    });

    it("should set active budget without API calls", () => {
      budgetStore.getState().setActiveBudget("budget-1");

      const context = budgetStore.getState().getBudgetContext();
      expect(context.activeBudgetId).toBe("budget-1");
      expect(context.activeBudgetName).toBe("Personal Budget");

      // No API calls should be made
      expect(mockFetch.calls.length).toBe(0);
    });

    it("should throw error for invalid budget ID", () => {
      expect(() => {
        budgetStore.getState().setActiveBudget("invalid-budget");
      }).toThrow(/not found/);
    });

    it("should allow switching active budgets", () => {
      budgetStore.getState().setActiveBudget("budget-1");
      expect(budgetStore.getState().getActiveBudgetId()).toBe("budget-1");

      budgetStore.getState().setActiveBudget("budget-2");
      expect(budgetStore.getState().getActiveBudgetId()).toBe("budget-2");

      const context = budgetStore.getState().getBudgetContext();
      expect(context.activeBudgetName).toBe("Business Budget");
    });
  });

  describe("getBudgetContext", () => {
    it("should return formatted context with no API calls", async () => {
      mockFetch = createMockFetch({
        responses: new Map([
          ["/budgets", { status: 200, ok: true, data: mockYnabResponses.budgets }],
        ]),
      });

      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      await budgetStore.getState().initialize();
      mockFetch.reset();

      const context = budgetStore.getState().getBudgetContext();

      expect(context.budgets.length).toBe(1);
      expect(context.budgets[0].id).toBe("budget-123");
      expect(context.budgets[0].name).toBe("Test Budget");
      expect(context.activeBudgetId).toBe("budget-123");
      expect(context.activeBudgetName).toBe("Test Budget");
      expect(context.sessionId).toBeTruthy();

      // No additional API calls
      expect(mockFetch.calls.length).toBe(0);
    });
  });

  describe("getBudgetMetadata", () => {
    beforeEach(async () => {
      mockFetch = createMockFetch({
        responses: new Map([
          ["/budgets", { status: 200, ok: true, data: mockYnabResponses.budgets }],
        ]),
      });

      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      await budgetStore.getState().initialize();
      mockFetch.reset();
    });

    it("should retrieve budget metadata without API calls", () => {
      const metadata = budgetStore.getState().getBudgetMetadata("budget-123");

      expect(metadata).toBeTruthy();
      expect(metadata?.name).toBe("Test Budget");
      expect(metadata?.currency_format?.iso_code).toBe("USD");

      // No API calls
      expect(mockFetch.calls.length).toBe(0);
    });

    it("should return undefined for non-existent budget", () => {
      const metadata = budgetStore.getState().getBudgetMetadata("invalid-budget");
      expect(metadata).toBeUndefined();
    });
  });

  describe("refreshCache", () => {
    it("should re-fetch budgets and update cache", async () => {
      // Use a mutable responses Map that can be updated
      const responsesMap = new Map<string, any>([
        [
          "/budgets",
          {
            status: 200,
            ok: true,
            data: {
              data: {
                budgets: [
                  {
                    id: "budget-1",
                    name: "Old Budget",
                    last_modified_on: "2025-01-01T00:00:00.000Z",
                  },
                ],
              },
            },
          },
        ],
      ]);

      mockFetch = createMockFetch({ responses: responsesMap });
      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      await budgetStore.getState().initialize();
      expect(budgetStore.getState().getAllBudgets().length).toBe(1);
      expect(budgetStore.getState().getAllBudgets()[0].name).toBe("Old Budget");

      // Update the response in the same Map
      responsesMap.set("/budgets", {
        status: 200,
        ok: true,
        data: {
          data: {
            budgets: [
              {
                id: "budget-1",
                name: "Updated Budget",
                last_modified_on: "2025-01-02T00:00:00.000Z",
              },
              {
                id: "budget-2",
                name: "New Budget",
                last_modified_on: "2025-01-02T00:00:00.000Z",
              },
            ],
          },
        },
      });

      // Refresh
      await budgetStore.getState().refreshCache();

      const budgets = budgetStore.getState().getAllBudgets();
      expect(budgets.length).toBe(2);
      expect(budgets[0].name).toBe("Updated Budget");
      expect(budgets[1].name).toBe("New Budget");
    });
  });

  describe("clearActiveBudget", () => {
    it("should clear active budget without affecting cache", async () => {
      mockFetch = createMockFetch({
        responses: new Map([
          ["/budgets", { status: 200, ok: true, data: mockYnabResponses.budgets }],
        ]),
      });

      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      await budgetStore.getState().initialize();
      expect(budgetStore.getState().getActiveBudgetId()).toBe("budget-123");

      budgetStore.getState().clearActiveBudget();
      expect(budgetStore.getState().getActiveBudgetId()).toBeNull();

      // Cache should still have budgets
      expect(budgetStore.getState().getAllBudgets().length).toBe(1);
    });
  });

  describe("reset", () => {
    it("should reset all state and generate new session ID", async () => {
      mockFetch = createMockFetch({
        responses: new Map([
          ["/budgets", { status: 200, ok: true, data: mockYnabResponses.budgets }],
        ]),
      });

      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      await budgetStore.getState().initialize();
      const sessionId1 = budgetStore.getState().getBudgetContext().sessionId;

      budgetStore.getState().reset();

      const context = budgetStore.getState().getBudgetContext();
      expect(context.budgets).toEqual([]);
      expect(context.activeBudgetId).toBeNull();
      expect(context.lastFetched).toBeNull();
      expect(context.sessionId).not.toBe(sessionId1);
    });
  });
});
