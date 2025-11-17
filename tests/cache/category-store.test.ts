/**
 * Tests for category cache store functionality
 */

import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { categoryStore } from "../../src/cache/category-store.js";
import { budgetStore } from "../../src/budget/budget-store.js";
import { initializeClient } from "../../src/api/client.js";
import { createMockFetch } from "../helpers/mock-fetch.js";

const mockCategoriesResponse = {
  data: {
    category_groups: [
      {
        id: "group-1",
        name: "Monthly Bills",
        hidden: false,
        deleted: false,
        categories: [
          {
            id: "cat-1",
            category_group_id: "group-1",
            name: "Rent",
            hidden: false,
            budgeted: 1000000,
            activity: -1000000,
            balance: 0,
            deleted: false,
          },
          {
            id: "cat-2",
            category_group_id: "group-1",
            name: "Utilities",
            hidden: false,
            budgeted: 200000,
            activity: -150000,
            balance: 50000,
            deleted: false,
          },
        ],
      },
      {
        id: "group-2",
        name: "Everyday Expenses",
        hidden: false,
        deleted: false,
        categories: [
          {
            id: "cat-3",
            category_group_id: "group-2",
            name: "Groceries",
            hidden: false,
            budgeted: 500000,
            activity: -300000,
            balance: 200000,
            deleted: false,
          },
        ],
      },
    ],
    server_knowledge: 100,
  },
};

const mockCategoriesDeltaResponse = {
  data: {
    category_groups: [
      {
        id: "group-1",
        name: "Monthly Bills",
        hidden: false,
        deleted: false,
        categories: [
          {
            id: "cat-2",
            category_group_id: "group-1",
            name: "Utilities Updated",
            hidden: false,
            budgeted: 250000,
            activity: -200000,
            balance: 50000,
            deleted: false,
          },
          {
            id: "cat-4",
            category_group_id: "group-1",
            name: "Internet",
            hidden: false,
            budgeted: 100000,
            activity: 0,
            balance: 100000,
            deleted: false,
          },
        ],
      },
      {
        id: "group-3",
        name: "Transportation",
        hidden: false,
        deleted: false,
        categories: [
          {
            id: "cat-5",
            category_group_id: "group-3",
            name: "Gas",
            hidden: false,
            budgeted: 150000,
            activity: 0,
            balance: 150000,
            deleted: false,
          },
        ],
      },
    ],
    server_knowledge: 150,
  },
};

const mockCategoriesDeleteResponse = {
  data: {
    category_groups: [
      {
        id: "group-1",
        name: "Monthly Bills",
        hidden: false,
        deleted: false,
        categories: [
          {
            id: "cat-1",
            category_group_id: "group-1",
            name: "Rent",
            hidden: false,
            budgeted: 0,
            activity: 0,
            balance: 0,
            deleted: true,
          },
        ],
      },
      {
        id: "group-2",
        name: "Everyday Expenses",
        hidden: false,
        deleted: true,
        categories: [],
      },
    ],
    server_knowledge: 175,
  },
};

describe("CategoryStore", () => {
  let mockFetch: ReturnType<typeof createMockFetch>;
  const budgetId = "budget-123";

  beforeEach(() => {
    categoryStore.getState().reset();
    budgetStore.getState().reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("should start with empty cache", () => {
      const cache = categoryStore.getState().cache;
      expect(cache.size).toBe(0);
    });

    it("should initialize cache for active budget", async () => {
      budgetStore.setState({ activeBudgetId: budgetId });

      mockFetch = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123/categories", { status: 200, ok: true, data: mockCategoriesResponse }],
        ]),
      });

      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      await categoryStore.getState().initialize();

      const cache = categoryStore.getState().cache;
      expect(cache.size).toBe(1);
      expect(cache.get(budgetId)).toBeTruthy();
      expect(cache.get(budgetId)?.data.length).toBe(2);
      expect(cache.get(budgetId)?.serverKnowledge).toBe(100);
    });

    it("should skip initialization when no active budget", async () => {
      mockFetch = createMockFetch({});
      vi.stubGlobal("fetch", mockFetch.fetch);

      await categoryStore.getState().initialize();

      const cache = categoryStore.getState().cache;
      expect(cache.size).toBe(0);
      expect(mockFetch.calls.length).toBe(0);
    });
  });

  describe("getCategories", () => {
    it("should fetch categories on first call", async () => {
      mockFetch = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123/categories", { status: 200, ok: true, data: mockCategoriesResponse }],
        ]),
      });

      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      const categoryGroups = await categoryStore.getState().getCategories(budgetId);

      expect(categoryGroups.length).toBe(2);
      expect(categoryGroups[0].name).toBe("Monthly Bills");
      expect(categoryGroups[0].categories.length).toBe(2);
      expect(categoryGroups[1].name).toBe("Everyday Expenses");
      expect(categoryGroups[1].categories.length).toBe(1);
      expect(mockFetch.calls.length).toBe(1);
    });

    it("should use delta requests on subsequent calls", async () => {
      const responsesMap = new Map<string, any>([
        ["/budgets/budget-123/categories", { status: 200, ok: true, data: mockCategoriesResponse }],
      ]);

      mockFetch = createMockFetch({ responses: responsesMap });
      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      // First call
      await categoryStore.getState().getCategories(budgetId);
      expect(mockFetch.calls.length).toBe(1);

      // Update response to delta
      responsesMap.set("/budgets/budget-123/categories", {
        status: 200,
        ok: true,
        data: mockCategoriesDeltaResponse,
      });

      mockFetch.reset();

      // Second call - should use delta
      const categoryGroups = await categoryStore.getState().getCategories(budgetId);

      expect(mockFetch.calls.length).toBe(1);
      expect(mockFetch.calls[0].url).toContain("last_knowledge_of_server=100");

      // Should have merged results
      expect(categoryGroups.length).toBe(3); // group-1, group-2, group-3

      const group1 = categoryGroups.find((g) => g.id === "group-1");
      expect(group1).toBeTruthy();
      expect(group1?.categories.length).toBe(3); // cat-1, cat-2 (updated), cat-4 (new)
      expect(group1?.categories.find((c) => c.id === "cat-2")?.name).toBe("Utilities Updated");
      expect(group1?.categories.find((c) => c.id === "cat-4")?.name).toBe("Internet");

      const group3 = categoryGroups.find((g) => g.id === "group-3");
      expect(group3).toBeTruthy();
      expect(group3?.categories.length).toBe(1);
    });

    it("should handle deleted categories and groups in delta", async () => {
      const responsesMap = new Map<string, any>([
        ["/budgets/budget-123/categories", { status: 200, ok: true, data: mockCategoriesResponse }],
      ]);

      mockFetch = createMockFetch({ responses: responsesMap });
      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      // First call
      await categoryStore.getState().getCategories(budgetId);

      // Update response with deletions
      responsesMap.set("/budgets/budget-123/categories", {
        status: 200,
        ok: true,
        data: mockCategoriesDeleteResponse,
      });

      // Second call
      const categoryGroups = await categoryStore.getState().getCategories(budgetId);

      // group-2 should be deleted
      expect(categoryGroups.find((g) => g.id === "group-2")).toBeUndefined();

      // cat-1 should be removed from group-1
      const group1 = categoryGroups.find((g) => g.id === "group-1");
      expect(group1).toBeTruthy();
      expect(group1?.categories.find((c) => c.id === "cat-1")).toBeUndefined();
      expect(group1?.categories.find((c) => c.id === "cat-2")).toBeTruthy();
    });

    it("should return cached data on API errors", async () => {
      const responsesMap = new Map<string, any>([
        ["/budgets/budget-123/categories", { status: 200, ok: true, data: mockCategoriesResponse }],
      ]);

      mockFetch = createMockFetch({ responses: responsesMap });
      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      // First successful call
      await categoryStore.getState().getCategories(budgetId);

      // Simulate API error
      responsesMap.set("/budgets/budget-123/categories", {
        status: 500,
        ok: false,
        data: { error: { id: "500", name: "server_error", detail: "Server error" } },
      });

      // Should return cached data
      const categoryGroups = await categoryStore.getState().getCategories(budgetId);
      expect(categoryGroups.length).toBe(2);
    });

    it("should throw on first API error with no cache", async () => {
      mockFetch = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123/categories", { status: 401, ok: false, data: { error: {} } }],
        ]),
      });

      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      await expect(categoryStore.getState().getCategories(budgetId)).rejects.toThrow();
    });
  });

  describe("invalidate", () => {
    it("should clear cache for specific budget", async () => {
      mockFetch = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123/categories", { status: 200, ok: true, data: mockCategoriesResponse }],
        ]),
      });

      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      await categoryStore.getState().getCategories(budgetId);
      expect(categoryStore.getState().cache.size).toBe(1);

      categoryStore.getState().invalidate(budgetId);
      expect(categoryStore.getState().cache.size).toBe(0);
    });
  });

  describe("refreshCache", () => {
    it("should force re-fetch ignoring cache", async () => {
      const responsesMap = new Map<string, any>([
        ["/budgets/budget-123/categories", { status: 200, ok: true, data: mockCategoriesResponse }],
      ]);

      mockFetch = createMockFetch({ responses: responsesMap });
      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      // Initial fetch
      await categoryStore.getState().getCategories(budgetId);
      mockFetch.reset();

      // Update response
      responsesMap.set("/budgets/budget-123/categories", {
        status: 200,
        ok: true,
        data: {
          data: {
            category_groups: [
              {
                id: "group-99",
                name: "Brand New Group",
                hidden: false,
                deleted: false,
                categories: [],
              },
            ],
            server_knowledge: 200,
          },
        },
      });

      // Refresh should fetch without delta
      await categoryStore.getState().refreshCache(budgetId);

      expect(mockFetch.calls.length).toBe(1);
      expect(mockFetch.calls[0].url).not.toContain("last_knowledge_of_server");

      // Should have new data
      const categoryGroups = await categoryStore.getState().getCategories(budgetId);
      expect(categoryGroups.length).toBe(1);
      expect(categoryGroups[0].id).toBe("group-99");
    });
  });

  describe("reset", () => {
    it("should clear all caches", async () => {
      mockFetch = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123/categories", { status: 200, ok: true, data: mockCategoriesResponse }],
          ["/budgets/budget-456/categories", { status: 200, ok: true, data: mockCategoriesResponse }],
        ]),
      });

      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      await categoryStore.getState().getCategories("budget-123");
      await categoryStore.getState().getCategories("budget-456");

      expect(categoryStore.getState().cache.size).toBe(2);

      categoryStore.getState().reset();
      expect(categoryStore.getState().cache.size).toBe(0);
    });
  });
});
