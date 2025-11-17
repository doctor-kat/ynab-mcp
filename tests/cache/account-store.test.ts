/**
 * Tests for account cache store functionality
 */

import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { accountStore } from "../../src/cache/account-store.js";
import { budgetStore } from "../../src/budget/budget-store.js";
import { initializeClient } from "../../src/api/client.js";
import { createMockFetch } from "../helpers/mock-fetch.js";

const mockAccountsResponse = {
  data: {
    accounts: [
      {
        id: "account-1",
        name: "Checking",
        type: "checking",
        on_budget: true,
        closed: false,
        balance: 5000000,
        cleared_balance: 4800000,
        uncleared_balance: 200000,
        deleted: false,
      },
      {
        id: "account-2",
        name: "Savings",
        type: "savings",
        on_budget: true,
        closed: false,
        balance: 10000000,
        cleared_balance: 10000000,
        uncleared_balance: 0,
        deleted: false,
      },
    ],
    server_knowledge: 100,
  },
};

const mockAccountsDeltaResponse = {
  data: {
    accounts: [
      {
        id: "account-1",
        name: "Checking",
        type: "checking",
        on_budget: true,
        closed: false,
        balance: 5250000, // Updated balance
        cleared_balance: 5050000,
        uncleared_balance: 200000,
        deleted: false,
      },
      {
        id: "account-3",
        name: "Credit Card",
        type: "creditCard",
        on_budget: true,
        closed: false,
        balance: -500000,
        cleared_balance: -500000,
        uncleared_balance: 0,
        deleted: false,
      },
    ],
    server_knowledge: 150,
  },
};

const mockAccountsDeleteResponse = {
  data: {
    accounts: [
      {
        id: "account-2",
        name: "Savings",
        type: "savings",
        on_budget: true,
        closed: true,
        balance: 0,
        cleared_balance: 0,
        uncleared_balance: 0,
        deleted: true,
      },
    ],
    server_knowledge: 175,
  },
};

describe("AccountStore", () => {
  let mockFetch: ReturnType<typeof createMockFetch>;
  const budgetId = "budget-123";

  beforeEach(() => {
    accountStore.getState().reset();
    budgetStore.getState().reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("should start with empty cache", () => {
      const cache = accountStore.getState().cache;
      expect(cache.size).toBe(0);
    });

    it("should initialize cache for active budget", async () => {
      budgetStore.setState({ activeBudgetId: budgetId });

      mockFetch = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123/accounts", { status: 200, ok: true, data: mockAccountsResponse }],
        ]),
      });

      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      await accountStore.getState().initialize();

      const cache = accountStore.getState().cache;
      expect(cache.size).toBe(1);
      expect(cache.get(budgetId)).toBeTruthy();
      expect(cache.get(budgetId)?.data.length).toBe(2);
      expect(cache.get(budgetId)?.serverKnowledge).toBe(100);
    });

    it("should skip initialization when no active budget", async () => {
      mockFetch = createMockFetch({});
      vi.stubGlobal("fetch", mockFetch.fetch);

      await accountStore.getState().initialize();

      const cache = accountStore.getState().cache;
      expect(cache.size).toBe(0);
      expect(mockFetch.calls.length).toBe(0);
    });
  });

  describe("getAccounts", () => {
    it("should fetch accounts on first call", async () => {
      mockFetch = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123/accounts", { status: 200, ok: true, data: mockAccountsResponse }],
        ]),
      });

      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      const accounts = await accountStore.getState().getAccounts(budgetId);

      expect(accounts.length).toBe(2);
      expect(accounts[0].name).toBe("Checking");
      expect(accounts[0].balance).toBe(5000000);
      expect(accounts[1].name).toBe("Savings");
      expect(accounts[1].balance).toBe(10000000);
      expect(mockFetch.calls.length).toBe(1);
    });

    it("should use delta requests on subsequent calls", async () => {
      const responsesMap = new Map<string, any>([
        ["/budgets/budget-123/accounts", { status: 200, ok: true, data: mockAccountsResponse }],
      ]);

      mockFetch = createMockFetch({ responses: responsesMap });
      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      // First call
      await accountStore.getState().getAccounts(budgetId);
      expect(mockFetch.calls.length).toBe(1);

      // Update response to delta
      responsesMap.set("/budgets/budget-123/accounts", {
        status: 200,
        ok: true,
        data: mockAccountsDeltaResponse,
      });

      mockFetch.reset();

      // Second call - should use delta
      const accounts = await accountStore.getState().getAccounts(budgetId);

      expect(mockFetch.calls.length).toBe(1);
      expect(mockFetch.calls[0].url).toContain("last_knowledge_of_server=100");

      // Should have merged results
      expect(accounts.length).toBe(3);
      expect(accounts.find((a) => a.id === "account-1")?.balance).toBe(5250000); // Updated
      expect(accounts.find((a) => a.id === "account-2")?.balance).toBe(10000000); // Unchanged
      expect(accounts.find((a) => a.id === "account-3")?.name).toBe("Credit Card"); // New
    });

    it("should handle deleted accounts in delta", async () => {
      const responsesMap = new Map<string, any>([
        ["/budgets/budget-123/accounts", { status: 200, ok: true, data: mockAccountsResponse }],
      ]);

      mockFetch = createMockFetch({ responses: responsesMap });
      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      // First call
      await accountStore.getState().getAccounts(budgetId);

      // Update response with deletion
      responsesMap.set("/budgets/budget-123/accounts", {
        status: 200,
        ok: true,
        data: mockAccountsDeleteResponse,
      });

      // Second call
      const accounts = await accountStore.getState().getAccounts(budgetId);

      // account-2 should be removed
      expect(accounts.length).toBe(1);
      expect(accounts.find((a) => a.id === "account-2")).toBeUndefined();
      expect(accounts.find((a) => a.id === "account-1")).toBeTruthy();
    });

    it("should return cached data on API errors", async () => {
      const responsesMap = new Map<string, any>([
        ["/budgets/budget-123/accounts", { status: 200, ok: true, data: mockAccountsResponse }],
      ]);

      mockFetch = createMockFetch({ responses: responsesMap });
      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      // First successful call
      await accountStore.getState().getAccounts(budgetId);

      // Simulate API error
      responsesMap.set("/budgets/budget-123/accounts", {
        status: 500,
        ok: false,
        data: { error: { id: "500", name: "server_error", detail: "Server error" } },
      });

      // Should return cached data
      const accounts = await accountStore.getState().getAccounts(budgetId);
      expect(accounts.length).toBe(2);
    });

    it("should throw on first API error with no cache", async () => {
      mockFetch = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123/accounts", { status: 401, ok: false, data: { error: {} } }],
        ]),
      });

      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      await expect(accountStore.getState().getAccounts(budgetId)).rejects.toThrow();
    });
  });

  describe("invalidate", () => {
    it("should clear cache for specific budget", async () => {
      mockFetch = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123/accounts", { status: 200, ok: true, data: mockAccountsResponse }],
        ]),
      });

      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      await accountStore.getState().getAccounts(budgetId);
      expect(accountStore.getState().cache.size).toBe(1);

      accountStore.getState().invalidate(budgetId);
      expect(accountStore.getState().cache.size).toBe(0);
    });
  });

  describe("refreshCache", () => {
    it("should force re-fetch ignoring cache", async () => {
      const responsesMap = new Map<string, any>([
        ["/budgets/budget-123/accounts", { status: 200, ok: true, data: mockAccountsResponse }],
      ]);

      mockFetch = createMockFetch({ responses: responsesMap });
      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      // Initial fetch
      await accountStore.getState().getAccounts(budgetId);
      mockFetch.reset();

      // Update response
      responsesMap.set("/budgets/budget-123/accounts", {
        status: 200,
        ok: true,
        data: {
          data: {
            accounts: [
              {
                id: "account-99",
                name: "Brand New Account",
                type: "checking",
                on_budget: true,
                closed: false,
                balance: 1000000,
                cleared_balance: 1000000,
                uncleared_balance: 0,
                deleted: false,
              },
            ],
            server_knowledge: 200,
          },
        },
      });

      // Refresh should fetch without delta
      await accountStore.getState().refreshCache(budgetId);

      expect(mockFetch.calls.length).toBe(1);
      expect(mockFetch.calls[0].url).not.toContain("last_knowledge_of_server");

      // Should have new data
      const accounts = await accountStore.getState().getAccounts(budgetId);
      expect(accounts.length).toBe(1);
      expect(accounts[0].id).toBe("account-99");
    });
  });

  describe("reset", () => {
    it("should clear all caches", async () => {
      mockFetch = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123/accounts", { status: 200, ok: true, data: mockAccountsResponse }],
          ["/budgets/budget-456/accounts", { status: 200, ok: true, data: mockAccountsResponse }],
        ]),
      });

      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      await accountStore.getState().getAccounts("budget-123");
      await accountStore.getState().getAccounts("budget-456");

      expect(accountStore.getState().cache.size).toBe(2);

      accountStore.getState().reset();
      expect(accountStore.getState().cache.size).toBe(0);
    });
  });
});
