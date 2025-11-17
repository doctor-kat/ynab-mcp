# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript Model Context Protocol (MCP) server that wraps the YNAB API, providing first-class support for transaction categorization and splitting workflows. It provides strongly-typed functions for each YNAB API endpoint and offers curated MCP tools for common budgeting tasks, including a stage-review-apply system for transaction modifications.

## Key Architecture Components

1. **Environment Configuration**: Uses `dotenv` and `zod` for environment loading and validation
2. **API Client**: Strongly-typed functions (one per endpoint) organized by domain, using types from the OpenAPI spec
3. **MCP Server**: Implements the Model Context Protocol with stdio transport
4. **Budget Context System**: In-memory cache of budget data to minimize API calls (ONE call at startup, ZERO for operations)
5. **Reference Data Caching**: Delta-based caching for payees, categories, accounts, and settings (TTL-based) to minimize API calls
6. **Staging System**: In-memory tracker for staging and reviewing transaction modifications before applying
7. **Tool Registration**: Provides MCP tools for:
   - Budget context and discovery helpers
   - Account, transaction, category, and payee management
   - Transaction categorization and splitting with stage-review-apply workflow
   - Cache management and refresh operations

## Development Setup

### Commands
- `pnpm dev` - Launch the MCP server with live TypeScript execution (`tsx`)
- `pnpm build` - Compile TypeScript to `dist/`
- `pnpm start` - Run the compiled JavaScript build
- `pnpm generate:types` - Regenerate OpenAPI-based types using vendored Python script
- `pnpm test` - Run Node built-in tests under `tests/`
- `pnpm clean` - Remove the `dist/` build output

### Project Structure
- `src/env.ts` – Environment loading and validation
- `src/api/client.ts` – Simple HTTP fetch wrapper with authentication
- `src/api/` – Strongly-typed API functions organized by domain:
  - `user/` – User info functions
  - `budgets/` – Budget management functions
  - `accounts/` – Account functions
  - `transactions/` – Transaction functions
  - `categories/` – Category functions
  - `payees/` – Payee functions
  - `payee-locations/` – Payee location functions
  - `months/` – Monthly budget functions
  - `scheduled-transactions/` – Scheduled transaction functions
- `src/budget/` – Budget context system:
  - `types.ts` – TypeScript types for budget context and metadata
  - `budget-store.ts` – Zustand store for cached budget data
- `src/cache/` – Reference data caching system:
  - `types.ts` – Cache entry types and store interfaces
  - `payee-store.ts` – Zustand store with delta-based payee caching
  - `category-store.ts` – Zustand store with nested delta merge for categories
  - `account-store.ts` – Zustand store with delta-based account caching
  - `settings-store.ts` – Zustand store with TTL-based settings caching
  - `index.ts` – Cache store exports
- `src/staging/` – Transaction staging system:
  - `types.ts` – TypeScript types for staged changes and session state
  - `staged-changes.ts` – Singleton tracker for managing staged modifications
- `src/server.ts` – MCP server factory + stdio bootstrapper
- `src/tools/` – MCP tool registrations:
  - `budget-context-tools.ts` – Budget context tools (get, set, refresh)
  - `cache-tools.ts` – Cache management tools (refresh, clear)
  - Transaction, budget, account, category, payee tools
  - `staging-tools.ts` – Staging, review, and apply tools
- `tools/generate_types.py` – Python-based type generator leveraging vendored PyYAML
- `tests/` – Test suite for budget context, caching, staging system, and API client behavior

## Core Functionality

### API Client Features:
- **Strongly-typed functions**: One function per endpoint, matching OpenAPI operationIds
- **Type safety**: All parameters and responses use auto-generated TypeScript types
- **Domain organization**: Functions grouped by resource (budgets, accounts, transactions, etc.)
- **Built-in error handling**: YnabApiError with status codes and response details
- **Simple authentication**: Bearer token authentication via global client config
- **Consistent naming**: Function names match OpenAPI operationIds (e.g., `getBudgets`, `updateTransaction`)

Example API usage:
```typescript
import { getBudgets, updateTransaction } from './api';

// List all budgets
const budgets = await getBudgets({ includeAccounts: true });

// Update a transaction (API layer requires budgetId)
const result = await updateTransaction({
  budgetId: 'abc123',
  transactionId: 'xyz789',
  transaction: { category_id: 'cat456' }
});

// Note: MCP tools automatically use the active budget, so budgetId is not required
```

### MCP Tools:
The server registers 41 tools across all YNAB API endpoints and change management:
- 1 user tool (get user info)
- 3 budget tools (list, get by ID, get settings)
- **3 budget context tools** (get context, set active budget, refresh cache)
- 2 account tools (list, create)
- **7 category tools** (get categories, get category groups, get categories by group, get single category, update category, get month category, update month category)
- 2 payee tools (list, update)
- 2 payee location tools (list, get by payee)
- 2 month tools (list months, get month detail)
- 5 transaction tools (list, create, update multiple, import, delete)
- 4 scheduled transaction tools (list, create, update, delete)
- **5 staging tools** (stage categorization, stage split, review staged changes, apply changes, clear staged changes)
- **5 cache management tools** (refresh payee cache, refresh category cache, refresh account cache, refresh settings cache, clear all caches)

All tools follow the naming pattern `ynab.{operationName}` (e.g., `ynab.getTransactions`, `ynab.updateTransaction`, `ynab.getBudgetContext`)

### Transaction Staging:

The server implements a **stage-review-apply workflow** for transaction modifications to prevent accidental mis-categorizations or incorrect splits:

#### Workflow:
1. **Stage**: Propose changes without applying them (`ynab.stageCategorization`, `ynab.stageSplit`)
2. **Review**: Inspect proposed changes before committing (`ynab.reviewChanges`)
3. **Apply**: Commit staged changes to YNAB API (`ynab.applyChanges`)
4. **Clear**: Discard unwanted staged changes (`ynab.clearChanges`)

#### Available Tools:

**`ynab.stageCategorization`**
- Stages a category change for a transaction without applying it
- Fetches current transaction state for comparison
- Returns change ID for tracking

**`ynab.stageSplit`**
- Stages a transaction split into multiple subtransactions
- Validates that subtransactions sum to the total transaction amount
- Does not apply to YNAB until approved

**`ynab.reviewChanges`**
- Lists all staged changes awaiting approval
- Shows original state vs. proposed changes
- Optional filtering by transaction ID

**`ynab.applyChanges`**
- Commits staged changes to YNAB API
- Can apply all staged changes or specific change IDs
- Returns success/failure status for each change
- Removes successfully applied changes from staging

**`ynab.clearChanges`**
- Discards staged changes without applying them
- Can clear all or specific change IDs
- Use this to remove incorrectly staged changes

#### Implementation Details:
- **In-memory state**: Staged changes only persist during MCP server session
- **Atomic operations**: Each change is applied as a complete unit
- **Session isolation**: Each MCP connection has its own change tracker
- **Validation**: Verifies transactions exist before staging
- **Simplicity**: No history tracking - focus on preventing mistakes before they happen

#### Example Usage:
```typescript
// 1. Stage a categorization (uses active budget automatically)
const staged = await ynab.stageCategorization({
  transactionId: "txn-456",
  categoryId: "cat-789",
  description: "Categorize grocery purchase"
});

// 2. Review what will be changed
const review = await ynab.reviewChanges();
// Shows: 1 staged change with before/after comparison

// 3. Apply the change
const result = await ynab.applyChanges();
// Commits to YNAB API and removes from staging

// Alternative: Clear if you made a mistake
const cleared = await ynab.clearChanges();
// Discards all staged changes without applying
```

### Budget Context System:

The server implements a **budget context cache** to minimize API calls and improve performance for LLMs:

#### Core Strategy:
- **ONE** API call at server startup to fetch all budgets
- **ZERO** API calls for subsequent budget context operations
- Cached data includes budget metadata (name, currency format, date format, etc.)
- **Automatic active budget selection**: First budget is automatically set as active
- **No budgetId required**: All tools automatically use the active budget

#### How It Works:

1. **Initialization**: At server startup, the budget context calls `getBudgets()` once and caches all budget information
2. **Auto-set Active Budget**: The first budget is automatically set as the active budget
3. **Cached Lookups**: All budget context queries use cached data (no API calls)
4. **Implicit Budget Usage**: All tools use the active budget automatically - no budgetId parameter needed
5. **Manual Switch**: Use `ynab.setActiveBudget` to switch between budgets (for multi-budget users)
6. **Manual Refresh**: Users can explicitly refresh the cache if budgets are added/removed

#### Available Tools:

**`ynab.getBudgetContext`**
- Returns cached budget information (ZERO API calls)
- Shows all available budgets with metadata
- Displays currently active budget ID and name
- Useful for understanding which budget is being used
- Note: You don't need to call this before other tools - the active budget is already set

**`ynab.setActiveBudget`**
- Switches the active budget (ZERO API calls)
- Validates budgetId against cached budgets
- Required only for multi-budget users who want to switch between budgets
- Takes a budgetId parameter (use `ynab.getBudgetContext` to see available budgets)

**`ynab.refreshBudgetContext`**
- Refreshes the cache by calling the YNAB API (ONE API call)
- Use only when budgets may have been added, removed, or renamed
- Rarely needed - cache is populated at startup

#### LLM Workflow:

For LLMs, the system is designed to be zero-friction:

```typescript
// Just call tools directly - active budget is used automatically
const transactions = await ynab.getTransactions({
  sinceDate: "2025-01-01"
});

// No need to call getBudgetContext first!

// For multi-budget users, switch budgets when needed:
await ynab.setActiveBudget({ budgetId: "other-budget-id" });
const otherTransactions = await ynab.getTransactions({
  sinceDate: "2025-01-01"
});
```

#### Benefits:
- **Performance**: Eliminates repeated `getBudgets()` calls (saves 100s of API calls per session)
- **Simplicity**: Zero-parameter tools - no budgetId required for 95% of operations
- **Efficiency**: All budget metadata cached for fast lookups
- **LLM-friendly**: Eliminates chained tool calls - single call for most operations
- **Auto-initialization**: First budget is active by default - works immediately

#### Implementation Details:
- **Zustand store pattern**: Uses Zustand vanilla stores for state management
- **In-memory cache**: Budgets stored in memory for the server session
- **Session-scoped**: Cache persists until server restart
- **Lazy evaluation**: Budget metadata built into a Map for O(1) lookups
- **Error handling**: Initialization errors are logged but don't crash the server

### Reference Data Caching:

The server implements **delta-based caching** for frequently accessed reference data to dramatically reduce API calls:

#### Cached Data Types:

1. **Payees** (delta-based)
2. **Categories** (delta-based with nested groups)
3. **Accounts** (delta-based)
4. **Budget Settings** (TTL-based, 24-hour cache)

#### Performance Benefits:

- **Startup**: 4 API calls total (1 budget context + 3 reference data caches for active budget)
- **Operations**: Near-zero API calls for cached data reads
- **Updates**: Delta requests fetch only changes since last sync
- **Estimated Reduction**: 35-45% fewer API calls compared to uncached implementation

#### How Delta Caching Works:

1. **Initial Fetch**: First call to a cache store fetches all data and stores `server_knowledge` value
2. **Delta Requests**: Subsequent calls include `last_knowledge_of_server` parameter
3. **Merge Logic**: Delta responses contain only changed/added/deleted items
4. **Update Cache**: Merged data replaces cache, new `server_knowledge` stored
5. **Fallback**: On API errors, stale cache data is returned when available

Example delta merge for payees (internal implementation):
```typescript
// Initial fetch: Get all payees (server_knowledge: 100)
const payees1 = await payeeStore.getState().getPayees(budgetId);
// Returns: [payee-1, payee-2]

// Delta request: Only fetch changes since server_knowledge 100
const payees2 = await payeeStore.getState().getPayees(budgetId);
// API returns: [payee-1 (updated), payee-3 (new), payee-4 (deleted flag)]
// Merged cache: [payee-1 (updated), payee-2 (unchanged), payee-3 (new)]

// Note: MCP tools call these store methods automatically using the active budget
```

#### Available Cache Management Tools:

**`ynab.refreshPayeeCache`**
- Forces full re-fetch of payees (ignores delta)
- Use when payees were modified outside this server session
- Clears and rebuilds the payee cache

**`ynab.refreshCategoryCache`**
- Forces full re-fetch of categories and category groups
- Use when categories were added/modified externally
- Handles nested category group structure

**`ynab.refreshAccountCache`**
- Forces full re-fetch of accounts
- Use when accounts were created/modified externally
- Updates balances and account details

**`ynab.refreshSettingsCache`**
- Forces re-fetch of budget settings (currency, date format)
- Settings normally cached for 24 hours
- Use when budget settings change

**`ynab.clearAllCaches`**
- Clears ALL caches (budget context + all reference data)
- Nuclear option for troubleshooting
- Caches repopulate on next access

#### Write-Through Invalidation:

When data is modified through MCP tools, the cache is automatically invalidated:

```typescript
// Creating an account invalidates the account cache
await ynab.createAccount({ budgetId, account: { ... } });
// Account cache is cleared and will be re-fetched on next access

// Updating a payee invalidates the payee cache
await ynab.updatePayee({ budgetId, payeeId, payee: { ... } });
// Payee cache is cleared and will be re-fetched on next access
```

**Auto-invalidation triggers:**
- `ynab.createAccount` → invalidates account cache
- `ynab.updatePayee` → invalidates payee cache
- `ynab.updateCategory` → invalidates category cache
- `ynab.updateMonthCategory` → no invalidation (month-specific)

#### Implementation Details:

**Zustand Store Pattern:**
All cache stores use Zustand vanilla stores for consistent state management:
```typescript
export const payeeStore = createStore<PayeeState & PayeeActions>()((set, get) => ({
  cache: new Map<string, CacheEntry<Payee>>(),

  async getPayees(budgetId: string) {
    const cached = get().cache.get(budgetId);
    if (cached) {
      // Delta request using server_knowledge
      const response = await apiGetPayees({
        budgetId,
        lastKnowledgeOfServer: cached.serverKnowledge,
      });
      const merged = mergeDelta(cached.data, response.data.payees);
      set({ cache: new Map(get().cache).set(budgetId, { ... }) });
    } else {
      // Initial fetch
    }
  },

  invalidate(budgetId: string) {
    const newCache = new Map(get().cache);
    newCache.delete(budgetId);
    set({ cache: newCache });
  },

  // ... other methods
}));
```

**Cache Entry Structure:**
```typescript
interface CacheEntry<T> {
  data: T[];                 // Cached entities
  serverKnowledge: number;   // Last known server state
  lastFetched: Date;         // Timestamp of last fetch
}

interface TTLCacheEntry<T> {
  data: T;                   // Cached data
  expiresAt: Date;           // TTL expiration
}
```

**Delta Merge Strategies:**

1. **Simple Merge** (Payees, Accounts):
   - Map existing items by ID
   - Apply updates from delta
   - Remove items marked as deleted
   - Return merged array

2. **Nested Merge** (Categories):
   - Merge category groups first
   - Within each group, merge categories
   - Handle deletions at both levels
   - Preserve group structure

**TTL vs Delta:**
- **Delta-based**: Payees, Categories, Accounts (YNAB API supports `server_knowledge`)
- **TTL-based**: Settings (no delta support, cached for 24 hours)

**Eager Loading:**
At server startup, the system automatically initializes caches for the active budget:
```typescript
// In src/server.ts
await budgetStore.getState().initialize();  // 1 API call

await Promise.all([
  payeeStore.getState().initialize(),       // 3 API calls (parallel)
  categoryStore.getState().initialize(),
  accountStore.getState().initialize(),
]);
```

This ensures all reference data is pre-loaded before the first MCP tool call.

### Category Tools and Filtering:

The server provides optimized category tools with built-in filtering and field selection to reduce response sizes:

#### Core Strategy:
- **Smart defaults**: Exclude hidden/deleted categories by default (reduces noise)
- **Field selection**: Minimal fields by default; full fields only when requested
- **Name-based resolution**: Accept category names or IDs for flexible querying
- **Focused tools**: Purpose-built tools for specific use cases (groups, single category, etc.)

#### Available Tools:

**`ynab.getCategories`** - Get all categories grouped by category group
- **Default behavior**: Returns minimal fields, excludes hidden/deleted categories
- **Filtering options**:
  - `categoryGroupId` / `categoryGroupName`: Filter to specific group
  - `categoryId` / `categoryName`: Filter to specific category
  - `includeHidden` (default: false): Include hidden categories
  - `includeDeleted` (default: false): Include deleted categories
  - `namePattern`: Case-insensitive substring match on category names
  - `full` (default: false): Include all fields (budgeted, activity, balance, goal data)
- **Use when**: You need all categories or multiple groups
- **Recommendation**: Use getCategoryGroups or getCategoriesByGroup for smaller payloads

**`ynab.getCategoryGroups`** - Get category group metadata only
- **Returns**: id, name, hidden, deleted for each group (no nested categories)
- **Filtering options**:
  - `includeHidden` (default: false)
  - `includeDeleted` (default: false)
- **Use when**: You only need group names/IDs for selection or reference

**`ynab.getCategoriesByGroup`** - Get categories within a specific group
- **Parameters**: `categoryGroupId` / `categoryGroupName` (required, mutually exclusive)
- **Filtering options**: Same as `getCategories` (includeHidden, includeDeleted, namePattern, full)
- **Use when**: You know which group contains the categories you need
- **Benefit**: Much smaller response than full getCategories

**`ynab.getCategory`** - Get a single category by ID or name
- **Parameters**: `categoryId` / `categoryName` (required, mutually exclusive)
- **Filtering options**: `full` (default: false)
- **Use when**: You need information about one specific category
- **Benefit**: Minimal response, perfect for lookups

#### Field Selection:

**Minimal fields (default, `full=false`):**
- id, name, category_group_id, category_group_name, hidden, deleted
- Reduces response size by ~60% for typical budgets

**Full fields (`full=true`):**
- All minimal fields PLUS:
- budgeted, activity, balance (with _formatted versions)
- Goal data: goal_type, goal_target, goal_under_funded, goal_overall_funded, etc.
- Note, timestamps, and other metadata

#### Example Usage:

```typescript
// Get all category groups (minimal, fast)
const groups = await ynab.getCategoryGroups();
// Returns: [{id, name, hidden, deleted}, ...]

// Get categories in "Monthly Bills" group (minimal)
const bills = await ynab.getCategoriesByGroup({
  categoryGroupName: "Monthly Bills"
});
// Returns: {data: {categories: [{id, name, ...}, ...]}}

// Get "Groceries" category with budget amounts
const groceries = await ynab.getCategory({
  categoryName: "Groceries",
  full: true
});
// Returns: {data: {category: {id, name, budgeted, activity, balance, ...}}}

// Get all categories with filtering
const active = await ynab.getCategories({
  includeHidden: false,  // default
  includeDeleted: false, // default
  full: false            // default (minimal fields)
});
```

#### Name Resolution:

All category tools support name-based lookups using the resolver pattern:
- **Case-insensitive**: "groceries" matches "Groceries"
- **Exact match first**: Tries exact match before partial match
- **Partial match fallback**: "electric" matches "Electric Bill"
- **Error on not found**: Throws clear error if name doesn't resolve

#### Implementation Details:
- **Resolver**: `src/tools/resolvers.ts` - `resolveCategoryId()`, `resolveCategoryGroupId()`
- **Filters**: `src/utils/category-filters.ts` - Filtering and field selection logic
- **Cache-powered**: All tools use cached category data (delta-based, minimal API calls)

### Currency Formatting:

The server automatically formats all monetary amounts in MCP tool responses for improved readability:

#### Core Strategy:
- **Dual-field approach**: All responses include both original milliunits AND formatted currency strings
- **Automatic formatting**: Applied to all tools that return financial data
- **Uses budget settings**: Formats according to the active budget's currency format (from settings cache)

#### How It Works:

1. **Milliunit Storage**: YNAB stores all amounts as milliunits (1000 milliunits = 1 currency unit)
2. **Response Transformation**: Before returning data to LLMs, the server adds `_formatted` fields
3. **Preserved Precision**: Original milliunit values remain unchanged for calculations

#### Example Response:

**Before formatting:**
```json
{
  "amount": -50000,
  "balance": 1000000
}
```

**After formatting:**
```json
{
  "amount": -50000,
  "amount_formatted": "-$50.00",
  "balance": 1000000,
  "balance_formatted": "$1,000.00"
}
```

#### Formatted Fields:

The following amount fields automatically get `_formatted` counterparts:
- `amount` → `amount_formatted`
- `balance` → `balance_formatted`
- `cleared_balance` → `cleared_balance_formatted`
- `uncleared_balance` → `uncleared_balance_formatted`
- `budgeted` → `budgeted_formatted`
- `activity` → `activity_formatted`
- `goal_target` → `goal_target_formatted`
- `goal_overall_funded`, `goal_under_funded`, `goal_overall_left`
- `income`, `available`, `carry_over`

#### Why Both Formats?

**Milliunits (original):**
- Required for transaction splitting (must sum exactly to parent amount)
- Precise calculations without floating-point errors
- Required by YNAB API for write operations

**Formatted strings:**
- Human-readable for LLMs and users
- Shows currency symbol and proper decimal places
- Locale-aware formatting (e.g., "$1,234.56" vs "€1.234,56")

#### Transaction Splitting Example:

```typescript
// 1. Get transaction (includes both formats)
const response = await ynab.getTransactions();
// {
//   amount: -100000,
//   amount_formatted: "-$100.00",
//   ...
// }

// 2. Stage split using milliunits (required for exact math)
await ynab.stageSplit({
  transactionId: "txn-123",
  subtransactions: [
    { amount: -50000, category_id: "cat-1" },  // Use milliunits!
    { amount: -50000, category_id: "cat-2" }
  ]
});

// 3. Review shows both formats
const review = await ynab.reviewChanges();
// {
//   changes: [{
//     proposedChanges: {
//       subtransactions: [
//         {
//           amount: -50000,
//           amount_formatted: "-$50.00",  // Formatted for display
//           category_id: "cat-1"
//         }
//       ]
//     }
//   }]
// }
```

#### Implementation Details:

**Formatter Location:** `src/utils/currency-formatter.ts`
- Uses `Intl.NumberFormat` for locale-aware formatting
- Caches formatter instances for performance
- Supports all currency formats (USD, EUR, JPY, etc.)

**Transformer Location:** `src/utils/response-transformer.ts`
- Recursively walks response objects/arrays
- Adds `_formatted` fields next to amount fields
- Preserves all original data unchanged

**Applied Tools:**
- Transactions: `getTransactions`, `createTransaction`, `updateTransactions`, `importTransactions`, `deleteTransaction`
- Accounts: `getAccounts`, `createAccount`
- Categories: `getCategories`, `getCategoryGroups`, `getCategoriesByGroup`, `getCategory`, `updateCategory`, `getMonthCategory`, `updateMonthCategory`
- Months: `getMonths`, `getMonthDetail`
- Budgets: `getBudgets`, `getBudgetById`
- Scheduled transactions: All scheduled transaction tools
- Staging: `reviewChanges` (shows formatted amounts in staged changes)

**Testing:** Comprehensive tests in `tests/utils/`:
- `currency-formatter.test.ts` - Tests USD, EUR, JPY formatting with edge cases
- `response-transformer.test.ts` - Tests transformation of nested structures

### Testing Approach:
The project uses a comprehensive multi-layer testing strategy:

- **Test Runner**: Vitest (`pnpm test`)
- **Test Structure**:
  - `tests/api/` - Unit tests for API client functions with mocked HTTP
  - `tests/server/` - Integration tests for MCP server initialization
  - `tests/budget/` - Budget context tests covering initialization, caching, and API call minimization
  - `tests/cache/` - Cache store tests covering delta merging, TTL expiration, and invalidation
  - `tests/staging/` - Staged changes tracker tests covering staging, clearing, and filtering
  - `tests/e2e/` - End-to-end tests using MCP Client SDK (skipped by default)
  - `tests/helpers/` - Mock utilities and test environment helpers
- **Features**: Fast execution, watch mode, UI mode, code coverage, and TypeScript support
- **Mocking Strategy**: Mock HTTP fetch implementation to avoid network calls
- **Coverage**: Tests validate success scenarios, error handling, parameter validation, schema compliance, budget context caching, reference data caching with delta merging, and staging workflows
- **Manual Testing**: MCP Inspector for interactive tool testing during development

See `tests/README.md` for detailed testing guide and best practices

## Configuration Requirements

Required environment variables:
- `YNAB_ACCESS_TOKEN` - Personal Access Token from YNAB (required)
- `READ_ONLY` - Set to `true` to enable read-only mode (optional, defaults to `false`)
- `YNAB_BASE_URL` - YNAB API base URL (optional, defaults to `https://api.ynab.com/v1`)
- `MCP_SERVER_NAME` - Server name (optional, defaults to `ynab-mcp-server`)

All environment variables are validated at runtime with helpful error messages.