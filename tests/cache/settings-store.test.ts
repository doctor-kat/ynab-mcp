/**
 * Tests for settings cache store functionality
 */

import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { settingsStore } from "../../src/cache/settings-store.js";
import { initializeClient } from "../../src/api/client.js";
import { createMockFetch } from "../helpers/mock-fetch.js";

const mockSettingsResponse = {
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

const mockUpdatedSettingsResponse = {
  data: {
    settings: {
      date_format: {
        format: "DD/MM/YYYY",
      },
      currency_format: {
        iso_code: "EUR",
        example_format: "€123,45",
        decimal_digits: 2,
        decimal_separator: ",",
        symbol_first: false,
        group_separator: ".",
        currency_symbol: "€",
        display_symbol: true,
      },
    },
  },
};

describe("SettingsStore", () => {
  let mockFetch: ReturnType<typeof createMockFetch>;
  const budgetId = "budget-123";

  beforeEach(() => {
    settingsStore.getState().reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("should start with empty cache", () => {
      const cache = settingsStore.getState().cache;
      expect(cache.size).toBe(0);
    });

    it("should have 24-hour TTL configured", () => {
      const ttl = settingsStore.getState().ttlMs;
      expect(ttl).toBe(24 * 60 * 60 * 1000); // 24 hours in milliseconds
    });
  });

  describe("getSettings", () => {
    it("should fetch settings on first call", async () => {
      mockFetch = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123/settings", { status: 200, ok: true, data: mockSettingsResponse }],
        ]),
      });

      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      const settings = await settingsStore.getState().getSettings(budgetId);

      expect(settings).toBeTruthy();
      expect(settings.currency_format.iso_code).toBe("USD");
      expect(settings.date_format.format).toBe("MM/DD/YYYY");
      expect(mockFetch.calls.length).toBe(1);
    });

    it("should return cached settings within TTL", async () => {
      mockFetch = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123/settings", { status: 200, ok: true, data: mockSettingsResponse }],
        ]),
      });

      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      // First call
      await settingsStore.getState().getSettings(budgetId);
      expect(mockFetch.calls.length).toBe(1);

      mockFetch.reset();

      // Second call - should use cache
      const settings = await settingsStore.getState().getSettings(budgetId);

      expect(settings).toBeTruthy();
      expect(settings.currency_format.iso_code).toBe("USD");
      expect(mockFetch.calls.length).toBe(0); // No API call made
    });

    it("should re-fetch settings after TTL expires", async () => {
      const responsesMap = new Map<string, any>([
        ["/budgets/budget-123/settings", { status: 200, ok: true, data: mockSettingsResponse }],
      ]);

      mockFetch = createMockFetch({ responses: responsesMap });
      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      // First call
      const settings1 = await settingsStore.getState().getSettings(budgetId);
      expect(settings1.currency_format.iso_code).toBe("USD");

      // Manually expire the cache entry
      const cache = settingsStore.getState().cache;
      const entry = cache.get(budgetId);
      if (entry) {
        entry.expiresAt = new Date(Date.now() - 1000); // Set to 1 second ago
      }

      // Update response
      responsesMap.set("/budgets/budget-123/settings", {
        status: 200,
        ok: true,
        data: mockUpdatedSettingsResponse,
      });

      mockFetch.reset();

      // Second call - should re-fetch because TTL expired
      const settings2 = await settingsStore.getState().getSettings(budgetId);

      expect(mockFetch.calls.length).toBe(1); // New API call made
      expect(settings2.currency_format.iso_code).toBe("EUR");
      expect(settings2.date_format.format).toBe("DD/MM/YYYY");
    });

    it("should cache settings for multiple budgets", async () => {
      mockFetch = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123/settings", { status: 200, ok: true, data: mockSettingsResponse }],
          ["/budgets/budget-456/settings", { status: 200, ok: true, data: mockUpdatedSettingsResponse }],
        ]),
      });

      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      const settings1 = await settingsStore.getState().getSettings("budget-123");
      const settings2 = await settingsStore.getState().getSettings("budget-456");

      expect(settings1.currency_format.iso_code).toBe("USD");
      expect(settings2.currency_format.iso_code).toBe("EUR");

      const cache = settingsStore.getState().cache;
      expect(cache.size).toBe(2);
    });

    it("should throw on API errors", async () => {
      mockFetch = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123/settings", { status: 404, ok: false, data: { error: {} } }],
        ]),
      });

      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      await expect(settingsStore.getState().getSettings(budgetId)).rejects.toThrow();
    });
  });

  describe("invalidate", () => {
    it("should clear cache for specific budget", async () => {
      mockFetch = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123/settings", { status: 200, ok: true, data: mockSettingsResponse }],
        ]),
      });

      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      await settingsStore.getState().getSettings(budgetId);
      expect(settingsStore.getState().cache.size).toBe(1);

      settingsStore.getState().invalidate(budgetId);
      expect(settingsStore.getState().cache.size).toBe(0);
    });

    it("should not affect other budget caches", async () => {
      mockFetch = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123/settings", { status: 200, ok: true, data: mockSettingsResponse }],
          ["/budgets/budget-456/settings", { status: 200, ok: true, data: mockUpdatedSettingsResponse }],
        ]),
      });

      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      await settingsStore.getState().getSettings("budget-123");
      await settingsStore.getState().getSettings("budget-456");

      settingsStore.getState().invalidate("budget-123");

      const cache = settingsStore.getState().cache;
      expect(cache.size).toBe(1);
      expect(cache.has("budget-456")).toBe(true);
      expect(cache.has("budget-123")).toBe(false);
    });
  });

  describe("refreshCache", () => {
    it("should force re-fetch ignoring TTL", async () => {
      const responsesMap = new Map<string, any>([
        ["/budgets/budget-123/settings", { status: 200, ok: true, data: mockSettingsResponse }],
      ]);

      mockFetch = createMockFetch({ responses: responsesMap });
      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      // Initial fetch
      const settings1 = await settingsStore.getState().getSettings(budgetId);
      expect(settings1.currency_format.iso_code).toBe("USD");

      mockFetch.reset();

      // Update response
      responsesMap.set("/budgets/budget-123/settings", {
        status: 200,
        ok: true,
        data: mockUpdatedSettingsResponse,
      });

      // Refresh should fetch even within TTL
      await settingsStore.getState().refreshCache(budgetId);

      expect(mockFetch.calls.length).toBe(1);

      // Should have new data
      const settings2 = await settingsStore.getState().getSettings(budgetId);
      expect(settings2.currency_format.iso_code).toBe("EUR");
    });
  });

  describe("reset", () => {
    it("should clear all caches", async () => {
      mockFetch = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123/settings", { status: 200, ok: true, data: mockSettingsResponse }],
          ["/budgets/budget-456/settings", { status: 200, ok: true, data: mockUpdatedSettingsResponse }],
        ]),
      });

      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      await settingsStore.getState().getSettings("budget-123");
      await settingsStore.getState().getSettings("budget-456");

      expect(settingsStore.getState().cache.size).toBe(2);

      settingsStore.getState().reset();
      expect(settingsStore.getState().cache.size).toBe(0);
    });
  });

  describe("TTL behavior", () => {
    it("should set correct expiration time", async () => {
      mockFetch = createMockFetch({
        responses: new Map([
          ["/budgets/budget-123/settings", { status: 200, ok: true, data: mockSettingsResponse }],
        ]),
      });

      vi.stubGlobal("fetch", mockFetch.fetch);
      initializeClient({
        baseUrl: "https://api.ynab.com/v1",
        accessToken: "test-token",
      });

      const beforeFetch = Date.now();
      await settingsStore.getState().getSettings(budgetId);
      const afterFetch = Date.now();

      const cache = settingsStore.getState().cache;
      const entry = cache.get(budgetId);

      expect(entry).toBeTruthy();

      const ttl = 24 * 60 * 60 * 1000;
      const expectedMinExpiry = beforeFetch + ttl;
      const expectedMaxExpiry = afterFetch + ttl;

      expect(entry!.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinExpiry);
      expect(entry!.expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxExpiry);
    });
  });
});
