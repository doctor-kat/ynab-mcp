import { createStore } from "zustand/vanilla";
import { getAccounts as apiGetAccounts } from "../api/accounts/index.js";
import type { Account } from "../api/accounts/index.js";
import { budgetStore } from "../budget/index.js";
import type { CacheEntry, AccountState, AccountActions } from "./types.js";

/**
 * Merge delta response with existing cached accounts
 * Handles add, update, and delete operations
 */
function mergeDelta(existing: Account[], delta: Account[]): Account[] {
  const merged = new Map<string, Account>();

  // Add existing accounts to map
  for (const account of existing) {
    merged.set(account.id, account);
  }

  // Apply delta changes
  for (const account of delta) {
    if (account.deleted) {
      // Remove deleted accounts
      merged.delete(account.id);
    } else {
      // Add or update account (includes updated balances)
      merged.set(account.id, account);
    }
  }

  return Array.from(merged.values());
}

/**
 * Zustand vanilla store for account caching
 *
 * Caches account data per budget to minimize API calls:
 * - Uses delta requests (server_knowledge) for incremental updates
 * - Eager loads for active budget at server startup
 * - Write-through invalidation on account creation
 * - Note: Includes balance fields which are updated via delta requests
 */
export const accountStore = createStore<AccountState & AccountActions>()((set, get) => ({
  // Initial state
  cache: new Map(),

  // Actions
  async getAccounts(budgetId: string) {
    const { cache } = get();
    const cached = cache.get(budgetId);

    try {
      if (cached) {
        // Use delta request with server_knowledge
        const response = await apiGetAccounts({
          budgetId,
          lastKnowledgeOfServer: cached.serverKnowledge,
        });

        // Merge delta response with existing cache
        const merged = mergeDelta(cached.data, response.data.accounts);

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
        const response = await apiGetAccounts({ budgetId });

        // Store in cache
        const updated = new Map(cache);
        updated.set(budgetId, {
          data: response.data.accounts,
          serverKnowledge: response.data.server_knowledge,
          lastFetched: new Date(),
        });

        set({ cache: updated });
        return response.data.accounts;
      }
    } catch (error) {
      console.error(`[Account Cache] Failed to fetch accounts for budget ${budgetId}:`, error);
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
    // Eager load accounts for active budget
    const activeBudgetId = budgetStore.getState().getActiveBudgetId();
    if (activeBudgetId) {
      try {
        await get().getAccounts(activeBudgetId);
        console.info(`✓ Account cache initialized for budget ${activeBudgetId}`);
      } catch (error) {
        console.warn(`⚠ Failed to initialize account cache:`, error);
      }
    }
  },

  async refreshCache(budgetId: string) {
    // Invalidate and re-fetch
    get().invalidate(budgetId);
    await get().getAccounts(budgetId);
  },

  reset() {
    set({ cache: new Map() });
  },
}));
