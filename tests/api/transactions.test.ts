/**
 * Unit tests for transaction API functions
 */

import { describe, it, beforeEach, afterEach, expect } from "vitest";
import {
  getTransactions,
  createTransaction,
  updateTransactions,
} from "../../src/api/transactions/index.js";
import { initializeClient } from "../../src/api/client.js";
import { createMockFetch, mockYnabResponses } from "../helpers/mock-fetch.js";
import { setupTestEnv, cleanupTestEnv } from "../helpers/test-env.js";

describe("Transaction API", () => {
  beforeEach(() => {
    setupTestEnv();
  });

  afterEach(() => {
    cleanupTestEnv();
  });

  describe("getTransactions", () => {
    it("should fetch transactions for a budget", async () => {
      const { fetch: mockFetch } = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123/transactions", { status: 200, ok: true, data: mockYnabResponses.transactions }],
        ]),
      });

      initializeClient({ fetchImpl: mockFetch });
      const result = await getTransactions({ budgetId: "budget-123" });

      expect(result.data.transactions).toBeTruthy();
      expect(result.data.transactions.length).toBe(1);
      expect(result.data.transactions[0].id).toBe("tx-123");
    });

    it("should include sinceDate parameter when provided", async () => {
      const { fetch: mockFetch, calls } = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123/transactions", { status: 200, ok: true, data: mockYnabResponses.transactions }],
        ]),
      });

      initializeClient({ fetchImpl: mockFetch });
      await getTransactions({
        budgetId: "budget-123",
        sinceDate: "2025-01-01",
      });

      expect(calls[0].url).toContain("since_date=2025-01-01");
    });

    it("should include type parameter for uncategorized transactions", async () => {
      const { fetch: mockFetch, calls } = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123/transactions", { status: 200, ok: true, data: mockYnabResponses.transactions }],
        ]),
      });

      initializeClient({ fetchImpl: mockFetch });
      await getTransactions({
        budgetId: "budget-123",
        type: "uncategorized",
      });

      expect(calls[0].url).toContain("type=uncategorized");
    });

    it("should include type parameter for unapproved transactions", async () => {
      const { fetch: mockFetch, calls } = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123/transactions", { status: 200, ok: true, data: mockYnabResponses.transactions }],
        ]),
      });

      initializeClient({ fetchImpl: mockFetch });
      await getTransactions({
        budgetId: "budget-123",
        type: "unapproved",
      });

      expect(calls[0].url).toContain("type=unapproved");
    });

    it("should include multiple query parameters", async () => {
      const { fetch: mockFetch, calls } = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123/transactions", { status: 200, ok: true, data: mockYnabResponses.transactions }],
        ]),
      });

      initializeClient({ fetchImpl: mockFetch });
      await getTransactions({
        budgetId: "budget-123",
        sinceDate: "2025-01-01",
        type: "uncategorized",
        lastKnowledgeOfServer: 100,
      });

      expect(calls[0].url).toContain("since_date=2025-01-01");
      expect(calls[0].url).toContain("type=uncategorized");
      expect(calls[0].url).toContain("last_knowledge_of_server=100");
    });
  });

  describe("createTransaction", () => {
    it("should create a single transaction", async () => {
      const mockResponse = {
        data: {
          transaction: {
            id: "new-tx-123",
            date: "2025-01-15",
            amount: -25000,
            account_id: "account-123",
          },
          server_knowledge: 101,
        },
      };

      const { fetch: mockFetch, calls } = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123/transactions", { status: 201, ok: true, data: mockResponse }],
        ]),
      });

      initializeClient({ fetchImpl: mockFetch });
      const result = await createTransaction({
        budgetId: "budget-123",
        data: {
          transaction: {
            account_id: "account-123",
            date: "2025-01-15",
            amount: -25000,
          },
        },
      });

      expect(result.data.transaction).toBeTruthy();
      expect(calls[0].init?.method).toBe("POST");
      expect(calls[0].init?.body).toBeTruthy();
    });

    it("should create multiple transactions", async () => {
      const mockResponse = {
        data: {
          transactions: [
            { id: "tx-1", amount: -10000 },
            { id: "tx-2", amount: -20000 },
          ],
          server_knowledge: 102,
        },
      };

      const { fetch: mockFetch } = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123/transactions", { status: 201, ok: true, data: mockResponse }],
        ]),
      });

      initializeClient({ fetchImpl: mockFetch });
      const result = await createTransaction({
        budgetId: "budget-123",
        data: {
          transactions: [
            { account_id: "account-123", date: "2025-01-15", amount: -10000 },
            { account_id: "account-123", date: "2025-01-16", amount: -20000 },
          ],
        },
      });

      expect(result.data.transactions).toBeTruthy();
      expect(result.data.transactions.length).toBe(2);
    });
  });

  describe("updateTransactions", () => {
    it("should update multiple transactions", async () => {
      const mockResponse = {
        data: {
          transactions: [
            { id: "tx-123", category_id: "cat-456", approved: true },
          ],
          server_knowledge: 103,
        },
      };

      const { fetch: mockFetch, calls } = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123/transactions", { status: 200, ok: true, data: mockResponse }],
        ]),
      });

      initializeClient({ fetchImpl: mockFetch });
      const result = await updateTransactions({
        budgetId: "budget-123",
        transactions: [
          {
            id: "tx-123",
            category_id: "cat-456",
            approved: true,
          },
        ],
      });

      expect(result.data.transactions).toBeTruthy();
      expect(calls[0].init?.method).toBe("PATCH");

      const body = JSON.parse(calls[0].init?.body as string);
      expect(body.transactions).toBeTruthy();
      expect(body.transactions[0].id).toBe("tx-123");
      expect(body.transactions[0].category_id).toBe("cat-456");
    });
  });
});
