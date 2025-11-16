import type { BudgetSummary, CurrencyFormat, DateFormat } from "../api/index.js";

/**
 * Metadata extracted from a BudgetSummary for quick lookups
 */
export interface BudgetMetadata {
  name: string;
  currency_format?: CurrencyFormat;
  date_format?: DateFormat;
  last_modified_on?: string;
}

/**
 * In-memory cache of budget information
 */
export interface BudgetContext {
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
 * Response format for getBudgetContext tool
 */
export interface BudgetContextResponse {
  budgets: Array<{
    id: string;
    name: string;
    currency_format?: CurrencyFormat;
    date_format?: DateFormat;
    last_modified_on?: string;
  }>;
  activeBudgetId: string | null;
  activeBudgetName: string | null;
  lastFetched: string | null;
  sessionId: string;
}
