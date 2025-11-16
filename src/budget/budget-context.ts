import { randomUUID } from "crypto";
import { getBudgets } from "../api/index.js";
import type { BudgetSummary } from "../api/index.js";
import type { BudgetContext, BudgetMetadata, BudgetContextResponse } from "./types.js";

/**
 * Singleton manager for budget context state
 *
 * Caches budget information from the YNAB API to minimize API calls.
 * - Makes ONE API call at server initialization
 * - Subsequent operations use cached data (ZERO API calls)
 * - Tracks active budget for single-budget users
 */
export class BudgetContextManager {
  private context: BudgetContext;

  constructor() {
    this.context = {
      budgets: [],
      activeBudgetId: null,
      metadata: new Map(),
      lastFetched: null,
      sessionId: randomUUID(),
    };
  }

  /**
   * Initialize the budget context by fetching budgets from YNAB API
   * Should be called once at server startup
   *
   * @returns Promise that resolves when initialization is complete
   */
  async initialize(): Promise<void> {
    try {
      const response = await getBudgets({ includeAccounts: false });
      const budgets = response.data.budgets;

      // Update cache
      this.context.budgets = budgets;
      this.context.lastFetched = new Date();
      this.context.metadata.clear();

      // Build metadata map for fast lookups
      for (const budget of budgets) {
        this.context.metadata.set(budget.id, {
          name: budget.name,
          currency_format: budget.currency_format,
          date_format: budget.date_format,
          last_modified_on: budget.last_modified_on,
        });
      }

      // Auto-set active budget if user has exactly one budget
      if (budgets.length === 1) {
        this.context.activeBudgetId = budgets[0].id;
      } else {
        this.context.activeBudgetId = null;
      }
    } catch (error) {
      // Log error but don't crash server - budget context is optional
      console.error("[Budget Context] Failed to initialize:", error);
      // Keep empty cache - tools will work if budgetId is explicitly provided
    }
  }

  /**
   * Refresh the budget cache by re-fetching from YNAB API
   * Useful when budgets may have been added/removed
   *
   * @returns Promise that resolves when refresh is complete
   */
  async refreshCache(): Promise<void> {
    await this.initialize();
  }

  /**
   * Set the active budget ID
   *
   * @param budgetId - The budget ID to set as active
   * @throws Error if budgetId is not found in cached budgets
   */
  setActiveBudget(budgetId: string): void {
    if (!this.context.metadata.has(budgetId)) {
      throw new Error(
        `Budget ID "${budgetId}" not found. ` +
        `Available budgets: ${Array.from(this.context.metadata.keys()).join(", ")}`
      );
    }
    this.context.activeBudgetId = budgetId;
  }

  /**
   * Get the currently active budget ID
   *
   * @returns The active budget ID, or null if no budget is active
   */
  getActiveBudgetId(): string | null {
    return this.context.activeBudgetId;
  }

  /**
   * Get all cached budgets
   *
   * @returns Array of all budget summaries
   */
  getAllBudgets(): BudgetSummary[] {
    return this.context.budgets;
  }

  /**
   * Get metadata for a specific budget
   *
   * @param budgetId - The budget ID to look up
   * @returns Budget metadata, or undefined if not found
   */
  getBudgetMetadata(budgetId: string): BudgetMetadata | undefined {
    return this.context.metadata.get(budgetId);
  }

  /**
   * Get the full budget context for display to users/LLMs
   *
   * @returns Formatted budget context response
   */
  getBudgetContext(): BudgetContextResponse {
    const budgets = this.context.budgets.map((budget: BudgetSummary) => ({
      id: budget.id,
      name: budget.name,
      currency_format: budget.currency_format,
      date_format: budget.date_format,
      last_modified_on: budget.last_modified_on,
    }));

    const activeBudgetName = this.context.activeBudgetId
      ? this.context.metadata.get(this.context.activeBudgetId)?.name || null
      : null;

    return {
      budgets,
      activeBudgetId: this.context.activeBudgetId,
      activeBudgetName,
      lastFetched: this.context.lastFetched?.toISOString() || null,
      sessionId: this.context.sessionId,
    };
  }

  /**
   * Clear the active budget (does not clear cache)
   */
  clearActiveBudget(): void {
    this.context.activeBudgetId = null;
  }

  /**
   * Reset the entire budget context (for testing)
   */
  reset(): void {
    this.context = {
      budgets: [],
      activeBudgetId: null,
      metadata: new Map(),
      lastFetched: null,
      sessionId: randomUUID(),
    };
  }
}

// Export singleton instance
export const budgetContext = new BudgetContextManager();
