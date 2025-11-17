import { createStore } from "zustand/vanilla";
import { getCategories as apiGetCategories } from "../api/categories/index.js";
import type { CategoryGroupWithCategories, Category } from "../api/categories/index.js";
import { budgetStore } from "../budget/index.js";
import type { CacheEntry, CategoryState, CategoryActions } from "./types.js";

/**
 * Merge delta response with existing cached category groups
 * Handles add, update, and delete operations for both groups and categories
 */
function mergeDelta(
  existing: CategoryGroupWithCategories[],
  delta: CategoryGroupWithCategories[]
): CategoryGroupWithCategories[] {
  const groupMap = new Map<string, CategoryGroupWithCategories>();

  // Add existing groups to map
  for (const group of existing) {
    groupMap.set(group.id, group);
  }

  // Apply delta changes
  for (const deltaGroup of delta) {
    if (deltaGroup.deleted) {
      // Remove deleted groups
      groupMap.delete(deltaGroup.id);
    } else {
      const existingGroup = groupMap.get(deltaGroup.id);

      if (existingGroup) {
        // Merge categories within the group
        const categoryMap = new Map<string, Category>();

        // Add existing categories
        for (const cat of existingGroup.categories) {
          categoryMap.set(cat.id, cat);
        }

        // Apply delta changes to categories
        for (const deltaCat of deltaGroup.categories) {
          if (deltaCat.deleted) {
            categoryMap.delete(deltaCat.id);
          } else {
            categoryMap.set(deltaCat.id, deltaCat);
          }
        }

        // Update group with merged categories
        groupMap.set(deltaGroup.id, {
          ...deltaGroup,
          categories: Array.from(categoryMap.values()),
        });
      } else {
        // New group - add it
        groupMap.set(deltaGroup.id, deltaGroup);
      }
    }
  }

  return Array.from(groupMap.values());
}

/**
 * Zustand vanilla store for category caching
 *
 * Caches category groups and categories per budget to minimize API calls:
 * - Uses delta requests (server_knowledge) for incremental updates
 * - Eager loads for active budget at server startup
 * - Write-through invalidation on category updates
 */
export const categoryStore = createStore<CategoryState & CategoryActions>()((set, get) => ({
  // Initial state
  cache: new Map(),

  // Actions
  async getCategories(budgetId: string) {
    const { cache } = get();
    const cached = cache.get(budgetId);

    try {
      if (cached) {
        // Use delta request with server_knowledge
        const response = await apiGetCategories({
          budgetId,
          lastKnowledgeOfServer: cached.serverKnowledge,
        });

        // Merge delta response with existing cache
        const merged = mergeDelta(cached.data, response.data.category_groups);

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
        const response = await apiGetCategories({ budgetId });

        // Store in cache
        const updated = new Map(cache);
        updated.set(budgetId, {
          data: response.data.category_groups,
          serverKnowledge: response.data.server_knowledge,
          lastFetched: new Date(),
        });

        set({ cache: updated });
        return response.data.category_groups;
      }
    } catch (error) {
      console.error(`[Category Cache] Failed to fetch categories for budget ${budgetId}:`, error);
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
    // Eager load categories for active budget
    const activeBudgetId = budgetStore.getState().getActiveBudgetId();
    if (activeBudgetId) {
      try {
        await get().getCategories(activeBudgetId);
        console.info(`✓ Category cache initialized for budget ${activeBudgetId}`);
      } catch (error) {
        console.warn(`⚠ Failed to initialize category cache:`, error);
      }
    }
  },

  async refreshCache(budgetId: string) {
    // Invalidate and re-fetch
    get().invalidate(budgetId);
    await get().getCategories(budgetId);
  },

  reset() {
    set({ cache: new Map() });
  },
}));
