import type { Payee, Category, Account, BudgetSettings, CategoryGroupWithCategories } from "../api/index.js";

/**
 * Generic cache entry with delta request support
 */
export interface CacheEntry<T> {
  /** Cached data */
  data: T[];

  /** Server knowledge for delta requests */
  serverKnowledge: number;

  /** When the cache was last fetched */
  lastFetched: Date;
}

/**
 * TTL-based cache entry for data without delta support
 */
export interface TTLCacheEntry<T> {
  /** Cached data */
  data: T;

  /** When the cache expires */
  expiresAt: Date;
}

/**
 * Payee cache state
 */
export interface PayeeState {
  /** Cache per budget: budgetId -> CacheEntry<Payee[]> */
  cache: Map<string, CacheEntry<Payee>>;
}

/**
 * Payee cache actions
 */
export interface PayeeActions {
  /**
   * Get payees for a budget (uses delta requests)
   */
  getPayees: (budgetId: string) => Promise<Payee[]>;

  /**
   * Invalidate cache for a budget
   */
  invalidate: (budgetId: string) => void;

  /**
   * Initialize cache for active budget
   */
  initialize: () => Promise<void>;

  /**
   * Refresh cache for a budget
   */
  refreshCache: (budgetId: string) => Promise<void>;

  /**
   * Reset all caches (for testing)
   */
  reset: () => void;
}

/**
 * Category cache state
 */
export interface CategoryState {
  /** Cache per budget: budgetId -> CacheEntry<CategoryGroupWithCategories[]> */
  cache: Map<string, CacheEntry<CategoryGroupWithCategories>>;
}

/**
 * Category cache actions
 */
export interface CategoryActions {
  /**
   * Get categories for a budget (uses delta requests)
   */
  getCategories: (budgetId: string) => Promise<CategoryGroupWithCategories[]>;

  /**
   * Invalidate cache for a budget
   */
  invalidate: (budgetId: string) => void;

  /**
   * Initialize cache for active budget
   */
  initialize: () => Promise<void>;

  /**
   * Refresh cache for a budget
   */
  refreshCache: (budgetId: string) => Promise<void>;

  /**
   * Reset all caches (for testing)
   */
  reset: () => void;
}

/**
 * Account cache state
 */
export interface AccountState {
  /** Cache per budget: budgetId -> CacheEntry<Account[]> */
  cache: Map<string, CacheEntry<Account>>;
}

/**
 * Account cache actions
 */
export interface AccountActions {
  /**
   * Get accounts for a budget (uses delta requests)
   */
  getAccounts: (budgetId: string) => Promise<Account[]>;

  /**
   * Invalidate cache for a budget
   */
  invalidate: (budgetId: string) => void;

  /**
   * Initialize cache for active budget
   */
  initialize: () => Promise<void>;

  /**
   * Refresh cache for a budget
   */
  refreshCache: (budgetId: string) => Promise<void>;

  /**
   * Reset all caches (for testing)
   */
  reset: () => void;
}

/**
 * Settings cache state
 */
export interface SettingsState {
  /** Cache per budget: budgetId -> TTLCacheEntry<BudgetSettings> */
  cache: Map<string, TTLCacheEntry<BudgetSettings>>;

  /** TTL in milliseconds (default: 24 hours) */
  ttlMs: number;
}

/**
 * Settings cache actions
 */
export interface SettingsActions {
  /**
   * Get budget settings (uses TTL cache)
   */
  getSettings: (budgetId: string) => Promise<BudgetSettings>;

  /**
   * Invalidate cache for a budget
   */
  invalidate: (budgetId: string) => void;

  /**
   * Initialize cache for active budget
   */
  initialize: () => Promise<void>;

  /**
   * Refresh cache for a budget
   */
  refreshCache: (budgetId: string) => Promise<void>;

  /**
   * Reset all caches (for testing)
   */
  reset: () => void;
}
