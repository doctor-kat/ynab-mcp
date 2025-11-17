import { createStore } from "zustand/vanilla";
import { getBudgetSettingsById } from "../api/budgets/index.js";
import type { BudgetSettings } from "../api/budgets/index.js";
import type { TTLCacheEntry, SettingsState, SettingsActions } from "./types.js";

/**
 * Zustand vanilla store for budget settings caching
 *
 * Caches budget settings per budget using TTL-based caching:
 * - No delta request support (settings rarely change)
 * - 24-hour TTL (configurable)
 * - Lazy loading (only fetches when requested)
 * - Simple invalidation on TTL expiry
 */
export const settingsStore = createStore<SettingsState & SettingsActions>()((set, get) => ({
  // Initial state
  cache: new Map(),
  ttlMs: 24 * 60 * 60 * 1000, // 24 hours in milliseconds

  // Actions
  async getSettings(budgetId: string) {
    const { cache, ttlMs } = get();
    const cached = cache.get(budgetId);
    const now = new Date();

    // Check if cached and not expired
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    try {
      // Fetch from API
      const response = await getBudgetSettingsById({ budgetId });
      const settings = response.data.settings;

      // Store in cache with TTL
      const updated = new Map(cache);
      updated.set(budgetId, {
        data: settings,
        expiresAt: new Date(now.getTime() + ttlMs),
      });

      set({ cache: updated });
      return settings;
    } catch (error) {
      console.error(`[Settings Cache] Failed to fetch settings for budget ${budgetId}:`, error);
      // Return stale cached data if available, otherwise re-throw
      if (cached) {
        console.warn(`[Settings Cache] Using stale cache for budget ${budgetId}`);
        return cached.data;
      }
      throw error;
    }
  },

  invalidate(budgetId: string) {
    const { cache } = get();
    const updated = new Map(cache);
    updated.delete(budgetId);
    set({ cache: updated });
  },

  async refreshCache(budgetId: string) {
    // Invalidate and re-fetch
    get().invalidate(budgetId);
    await get().getSettings(budgetId);
  },

  reset() {
    set({ cache: new Map() });
  },

  async initialize() {
    // Eagerly initialize settings cache for the active budget
    const { budgetStore } = await import("../budget/index.js");
    const context = budgetStore.getState().getBudgetContext();

    if (!context.activeBudgetId) {
      console.warn("[Settings Cache] No active budget, skipping settings cache initialization");
      return;
    }

    try {
      await get().getSettings(context.activeBudgetId);
      console.info(`[Settings Cache] Initialized for budget ${context.activeBudgetName}`);
    } catch (error) {
      console.error("[Settings Cache] Failed to initialize:", error);
      // Don't throw - allow server to start even if settings cache fails
    }
  },
}));
