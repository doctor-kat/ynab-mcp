import { createStore } from "zustand/vanilla";
import { getPayees as apiGetPayees } from "../api/payees/index.js";
import type { Payee } from "../api/payees/index.js";
import { budgetStore } from "../budget/index.js";
import type { CacheEntry, PayeeState, PayeeActions } from "./types.js";

/**
 * Merge delta response with existing cached payees
 * Handles add, update, and delete operations
 */
function mergeDelta(existing: Payee[], delta: Payee[]): Payee[] {
  const merged = new Map<string, Payee>();

  // Add existing payees to map
  for (const payee of existing) {
    merged.set(payee.id, payee);
  }

  // Apply delta changes
  for (const payee of delta) {
    if (payee.deleted) {
      // Remove deleted payees
      merged.delete(payee.id);
    } else {
      // Add or update payee
      merged.set(payee.id, payee);
    }
  }

  return Array.from(merged.values());
}

/**
 * Zustand vanilla store for payee caching
 *
 * Caches payee data per budget to minimize API calls:
 * - Uses delta requests (server_knowledge) for incremental updates
 * - Eager loads for active budget at server startup
 * - Write-through invalidation on payee updates
 */
export const payeeStore = createStore<PayeeState & PayeeActions>()((set, get) => ({
  // Initial state
  cache: new Map(),

  // Actions
  async getPayees(budgetId: string) {
    const { cache } = get();
    const cached = cache.get(budgetId);

    try {
      if (cached) {
        // Use delta request with server_knowledge
        const response = await apiGetPayees({
          budgetId,
          lastKnowledgeOfServer: cached.serverKnowledge,
        });

        // Merge delta response with existing cache
        const merged = mergeDelta(cached.data, response.data.payees);

        // Update cache
        const updated = new Map(cache);
        updated.set(budgetId, {
          data: merged,
          serverKnowledge: response.data.server_knowledge,
          lastFetched: new Date(),
        });

        set({ cache: updated });
        return merged;
      } else {
        // Initial fetch (no cache yet)
        const response = await apiGetPayees({ budgetId });

        // Store in cache
        const updated = new Map(cache);
        updated.set(budgetId, {
          data: response.data.payees,
          serverKnowledge: response.data.server_knowledge,
          lastFetched: new Date(),
        });

        set({ cache: updated });
        return response.data.payees;
      }
    } catch (error) {
      console.error(`[Payee Cache] Failed to fetch payees for budget ${budgetId}:`, error);
      // Return cached data if available, otherwise re-throw
      if (cached) {
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

  async initialize() {
    // Eager load payees for active budget
    const activeBudgetId = budgetStore.getState().getActiveBudgetId();
    if (activeBudgetId) {
      try {
        await get().getPayees(activeBudgetId);
        console.info(`✓ Payee cache initialized for budget ${activeBudgetId}`);
      } catch (error) {
        console.warn(`⚠ Failed to initialize payee cache:`, error);
      }
    }
  },

  async refreshCache(budgetId: string) {
    // Invalidate and re-fetch
    get().invalidate(budgetId);
    await get().getPayees(budgetId);
  },

  reset() {
    set({ cache: new Map() });
  },
}));
