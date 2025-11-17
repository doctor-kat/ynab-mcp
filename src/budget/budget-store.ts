import { randomUUID } from "crypto";
import { createStore } from "zustand/vanilla";
import { getBudgets } from "../api/index.js";
import type { BudgetSummary } from "../api/index.js";
import type { BudgetMetadata, BudgetContextResponse } from "./types.js";

/**
 * Budget context state
 */
export interface BudgetState {
  /** All budgets available to the user */
  budgets: BudgetSummary[];

  /** Currently active budget ID (user's working context) */
  activeBudgetId: string | null;

  /** Fast lookup map: budgetId -> metadata */
  metadata: Map<string, BudgetMetadata>;

  /** When the cache was last populated */
  lastFetched: Date | null;

  /** Session identifier */
  sessionId: string;
}

/**
 * Budget context actions
 */
export interface BudgetActions {
  /**
   * Initialize the budget context by fetching budgets from YNAB API
   * Should be called once at server startup
   */
  initialize: () => Promise<void>;

  /**
   * Refresh the budget cache by re-fetching from YNAB API
   * Useful when budgets may have been added/removed
   */
  refreshCache: () => Promise<void>;

  /**
   * Set the active budget ID
   * @throws Error if budgetId is not found in cached budgets
   */
  setActiveBudget: (budgetId: string) => void;

  /**
   * Get the currently active budget ID
   */
  getActiveBudgetId: () => string | null;

  /**
   * Get all cached budgets
   */
  getAllBudgets: () => BudgetSummary[];

  /**
   * Get metadata for a specific budget
   */
  getBudgetMetadata: (budgetId: string) => BudgetMetadata | undefined;

  /**
   * Get the full budget context for display to users/LLMs
   */
  getBudgetContext: () => BudgetContextResponse;

  /**
   * Clear the active budget (does not clear cache)
   */
  clearActiveBudget: () => void;

  /**
   * Reset the entire budget context (for testing)
   */
  reset: () => void;
}

/**
 * Zustand vanilla store for budget context
 *
 * Caches budget information from the YNAB API to minimize API calls.
 * - Makes ONE API call at server initialization
 * - Subsequent operations use cached data (ZERO API calls)
 * - Tracks active budget for single-budget users
 */
export const budgetStore = createStore<BudgetState & BudgetActions>()((set, get) => ({
  // Initial state
  budgets: [],
  activeBudgetId: null,
  metadata: new Map(),
  lastFetched: null,
  sessionId: randomUUID(),

  // Actions
  async initialize() {
    try {
      const response = await getBudgets({ includeAccounts: false });
      const budgets = response.data.budgets;

      // Build metadata map for fast lookups
      const metadata = new Map<string, BudgetMetadata>();
      for (const budget of budgets) {
        metadata.set(budget.id, {
          name: budget.name,
          currency_format: budget.currency_format,
          date_format: budget.date_format,
          last_modified_on: budget.last_modified_on,
        });
      }

      // Auto-set first budget as active (if any budgets exist)
      const activeBudgetId = budgets.length > 0 ? budgets[0].id : null;

      // Update state immutably
      set({
        budgets,
        lastFetched: new Date(),
        metadata,
        activeBudgetId,
      });
    } catch (error) {
      // Log error but don't crash server - budget context is optional
      console.error("[Budget Context] Failed to initialize:", error);
      // Keep empty cache - tools will work if budgetId is explicitly provided
    }
  },

  async refreshCache() {
    await get().initialize();
  },

  setActiveBudget(budgetId: string) {
    const { metadata } = get();
    if (!metadata.has(budgetId)) {
      throw new Error(
        `Budget ID "${budgetId}" not found. ` +
        `Available budgets: ${Array.from(metadata.keys()).join(", ")}`
      );
    }
    set({ activeBudgetId: budgetId });
  },

  getActiveBudgetId() {
    return get().activeBudgetId;
  },

  getAllBudgets() {
    return get().budgets;
  },

  getBudgetMetadata(budgetId: string) {
    return get().metadata.get(budgetId);
  },

  getBudgetContext() {
    const state = get();
    const budgets = state.budgets.map((budget: BudgetSummary) => ({
      id: budget.id,
      name: budget.name,
      currency_format: budget.currency_format,
      date_format: budget.date_format,
      last_modified_on: budget.last_modified_on,
    }));

    const activeBudgetName = state.activeBudgetId
      ? state.metadata.get(state.activeBudgetId)?.name || null
      : null;

    return {
      budgets,
      activeBudgetId: state.activeBudgetId,
      activeBudgetName,
      lastFetched: state.lastFetched?.toISOString() || null,
      sessionId: state.sessionId,
    };
  },

  clearActiveBudget() {
    set({ activeBudgetId: null });
  },

  reset() {
    set({
      budgets: [],
      activeBudgetId: null,
      metadata: new Map(),
      lastFetched: null,
      sessionId: randomUUID(),
    });
  },
}));
