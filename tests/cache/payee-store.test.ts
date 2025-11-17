/**
 * Tests for payee cache store functionality
 */

import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { payeeStore } from "../../src/cache/payee-store.js";
import { budgetStore } from "../../src/budget/budget-store.js";
import { initializeClient } from "../../src/api/client.js";
import { createMockFetch } from "../helpers/mock-fetch.js";

const mockPayeesResponse = {
  data: {
    payees: [
      {
        id: "payee-1",
        name: "Grocery Store",
        transfer_account_id: null,
        deleted: false,
      },
      {
        id: "payee-2",
        name: "Gas Station",
        transfer_account_id: null,
        deleted: false,
      },
    ],
    server_knowledge: 100,
  },
};

const mockPayeesDeltaResponse = {
  data: {
    payees: [
      {
        id: "payee-3",
        name: "New Coffee Shop",
        transfer_account_id: null,
        deleted: false,
      },
      {
        id: "payee-1",
        name: "Grocery Store Updated",
        transfer_account_id: null,
        deleted: false,
      },
    ],
    server_knowledge: 150,
  },
};

const mockPayeesDeleteResponse = {
  data: {
    payees: [
      {
        id: "payee-2",
        name: "Gas Station",
        transfer_account_id: null,
        deleted: true,
      },
    ],
    server_knowledge: 175,
  },
};

describe("PayeeStore", () => {
  let mockFetch: ReturnType<typeof createMockFetch>;
  const budgetId = "budget-123";

  beforeEach(() => {
    payeeStore.getState().reset();
    budgetStore.getState().reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("should start with empty cache", () => {
      const cache = payeeStore.getState().cache;
      expect(cache.size).toBe(0);
    });

    it("should initialize cache for active budget", async () => {
      // Set up budget context
      budgetStore.setState({ activeBudgetId: budgetId });

      mockFetch = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123/payees", { status: 200, ok: true, data: mockPayeesResponse }],
        ]),
      });

      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      await payeeStore.getState().initialize();

      const cache = payeeStore.getState().cache;
      expect(cache.size).toBe(1);
      expect(cache.get(budgetId)).toBeTruthy();
      expect(cache.get(budgetId)?.data.length).toBe(2);
      expect(cache.get(budgetId)?.serverKnowledge).toBe(100);
    });

    it("should skip initialization when no active budget", async () => {
      mockFetch = createMockFetch({});
      vi.stubGlobal("fetch", mockFetch.fetch);

      await payeeStore.getState().initialize();

      const cache = payeeStore.getState().cache;
      expect(cache.size).toBe(0);
      expect(mockFetch.calls.length).toBe(0);
    });
  });

  describe("getPayees", () => {
    it("should fetch payees on first call", async () => {
      mockFetch = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123/payees", { status: 200, ok: true, data: mockPayeesResponse }],
        ]),
      });

      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      const payees = await payeeStore.getState().getPayees(budgetId);

      expect(payees.length).toBe(2);
      expect(payees[0].name).toBe("Grocery Store");
      expect(payees[1].name).toBe("Gas Station");
      expect(mockFetch.calls.length).toBe(1);
    });

    it("should use delta requests on subsequent calls", async () => {
      const responsesMap = new Map<string, any>([
        ["/budgets/budget-123/payees", { status: 200, ok: true, data: mockPayeesResponse }],
      ]);

      mockFetch = createMockFetch({ responses: responsesMap });
      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      // First call - initial fetch
      await payeeStore.getState().getPayees(budgetId);
      expect(mockFetch.calls.length).toBe(1);
      expect(mockFetch.calls[0].url).not.toContain("last_knowledge_of_server");

      // Update response to delta
      responsesMap.set("/budgets/budget-123/payees", {
        status: 200,
        ok: true,
        data: mockPayeesDeltaResponse,
      });

      mockFetch.reset();

      // Second call - should use delta
      const payees = await payeeStore.getState().getPayees(budgetId);

      expect(mockFetch.calls.length).toBe(1);
      expect(mockFetch.calls[0].url).toContain("last_knowledge_of_server=100");

      // Should have merged results
      expect(payees.length).toBe(3);
      expect(payees.find((p) => p.id === "payee-1")?.name).toBe("Grocery Store Updated");
      expect(payees.find((p) => p.id === "payee-3")?.name).toBe("New Coffee Shop");
    });

    it("should handle deleted payees in delta", async () => {
      const responsesMap = new Map<string, any>([
        ["/budgets/budget-123/payees", { status: 200, ok: true, data: mockPayeesResponse }],
      ]);

      mockFetch = createMockFetch({ responses: responsesMap });
      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      // First call
      await payeeStore.getState().getPayees(budgetId);

      // Update response with deletion
      responsesMap.set("/budgets/budget-123/payees", {
        status: 200,
        ok: true,
        data: mockPayeesDeleteResponse,
      });

      // Second call
      const payees = await payeeStore.getState().getPayees(budgetId);

      // payee-2 should be removed
      expect(payees.length).toBe(1);
      expect(payees.find((p) => p.id === "payee-2")).toBeUndefined();
      expect(payees.find((p) => p.id === "payee-1")).toBeTruthy();
    });

    it("should return cached data on API errors", async () => {
      const responsesMap = new Map<string, any>([
        ["/budgets/budget-123/payees", { status: 200, ok: true, data: mockPayeesResponse }],
      ]);

      mockFetch = createMockFetch({ responses: responsesMap });
      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      // First successful call
      await payeeStore.getState().getPayees(budgetId);

      // Simulate API error
      responsesMap.set("/budgets/budget-123/payees", {
        status: 500,
        ok: false,
        data: { error: { id: "500", name: "server_error", detail: "Server error" } },
      });

      // Should return cached data
      const payees = await payeeStore.getState().getPayees(budgetId);
      expect(payees.length).toBe(2);
    });

    it("should throw on first API error with no cache", async () => {
      mockFetch = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123/payees", { status: 401, ok: false, data: { error: {} } }],
        ]),
      });

      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      await expect(payeeStore.getState().getPayees(budgetId)).rejects.toThrow();
    });
  });

  describe("invalidate", () => {
    it("should clear cache for specific budget", async () => {
      mockFetch = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123/payees", { status: 200, ok: true, data: mockPayeesResponse }],
        ]),
      });

      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      await payeeStore.getState().getPayees(budgetId);
      expect(payeeStore.getState().cache.size).toBe(1);

      payeeStore.getState().invalidate(budgetId);
      expect(payeeStore.getState().cache.size).toBe(0);
    });
  });

  describe("refreshCache", () => {
    it("should force re-fetch ignoring cache", async () => {
      const responsesMap = new Map<string, any>([
        ["/budgets/budget-123/payees", { status: 200, ok: true, data: mockPayeesResponse }],
      ]);

      mockFetch = createMockFetch({ responses: responsesMap });
      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      // Initial fetch
      await payeeStore.getState().getPayees(budgetId);
      mockFetch.reset();

      // Update response
      responsesMap.set("/budgets/budget-123/payees", {
        status: 200,
        ok: true,
        data: {
          data: {
            payees: [
              {
                id: "payee-99",
                name: "Brand New Payee",
                transfer_account_id: null,
                deleted: false,
              },
            ],
            server_knowledge: 200,
          },
        },
      });

      // Refresh should fetch without delta
      await payeeStore.getState().refreshCache(budgetId);

      expect(mockFetch.calls.length).toBe(1);
      expect(mockFetch.calls[0].url).not.toContain("last_knowledge_of_server");

      // Should have new data
      const payees = await payeeStore.getState().getPayees(budgetId);
      expect(payees.length).toBe(1);
      expect(payees[0].id).toBe("payee-99");
    });
  });

  describe("reset", () => {
    it("should clear all caches", async () => {
      mockFetch = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123/payees", { status: 200, ok: true, data: mockPayeesResponse }],
          ["/budgets/budget-456/payees", { status: 200, ok: true, data: mockPayeesResponse }],
        ]),
      });

      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      await payeeStore.getState().getPayees("budget-123");
      await payeeStore.getState().getPayees("budget-456");

      expect(payeeStore.getState().cache.size).toBe(2);

      payeeStore.getState().reset();
      expect(payeeStore.getState().cache.size).toBe(0);
    });
  });
});
