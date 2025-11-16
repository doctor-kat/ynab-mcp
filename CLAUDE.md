# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript Model Context Protocol (MCP) server that wraps the YNAB API, providing first-class support for transaction categorization and splitting workflows. It provides strongly-typed functions for each YNAB API endpoint and offers curated MCP tools for common budgeting tasks, including a stage-review-apply system for transaction modifications.

## Key Architecture Components

1. **Environment Configuration**: Uses `dotenv` and `zod` for environment loading and validation
2. **API Client**: Strongly-typed functions (one per endpoint) organized by domain, using types from the OpenAPI spec
3. **MCP Server**: Implements the Model Context Protocol with stdio transport
4. **Budget Context System**: In-memory cache of budget data to minimize API calls (ONE call at startup, ZERO for operations)
5. **Staging System**: In-memory tracker for staging and reviewing transaction modifications before applying
6. **Tool Registration**: Provides MCP tools for:
   - Budget context and discovery helpers
   - Account, transaction, category, and payee management
   - Transaction categorization and splitting with stage-review-apply workflow

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
  - `budget-context.ts` – Singleton manager for cached budget data
- `src/staging/` – Transaction staging system:
  - `types.ts` – TypeScript types for staged changes and session state
  - `staged-changes.ts` – Singleton tracker for managing staged modifications
- `src/server.ts` – MCP server factory + stdio bootstrapper
- `src/tools/` – MCP tool registrations:
  - `budget-context-tools.ts` – Budget context tools (get, set, refresh)
  - Transaction, budget, account, category, payee tools
  - `staging-tools.ts` – Staging, review, and apply tools
- `tools/generate_types.py` – Python-based type generator leveraging vendored PyYAML
- `tests/` – Test suite for budget context, staging system, and API client behavior

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

// Update a transaction
const result = await updateTransaction({
  budgetId: 'abc123',
  transactionId: 'xyz789',
  transaction: { category_id: 'cat456' }
});
```

### MCP Tools:
The server registers 43 tools across all YNAB API endpoints and change management:
- 1 user tool (get user info)
- 3 budget tools (list, get by ID, get settings)
- **3 budget context tools** (get context, set active budget, refresh cache)
- 3 account tools (list, create, get by ID)
- 5 category tools (list, get, update, get month category, update month category)
- 3 payee tools (list, get, update)
- 3 payee location tools (list, get by ID, get by payee)
- 2 month tools (list months, get month detail)
- 11 transaction tools (list, create, update multiple, import, get by ID, update, delete, get by account/category/payee/month)
- 5 scheduled transaction tools (list, create, get, update, delete)
- **5 staging tools** (stage categorization, stage split, review staged changes, apply changes, clear staged changes)

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
// 1. Stage a categorization
const staged = await ynab.stageCategorization({
  budgetId: "abc123",
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
- Automatic active budget selection for single-budget users

#### How It Works:

1. **Initialization**: At server startup, the budget context calls `getBudgets()` once and caches all budget information
2. **Auto-set Active Budget**: If the user has exactly one budget, it's automatically set as the active budget
3. **Cached Lookups**: All budget context queries use cached data (no API calls)
4. **Manual Refresh**: Users can explicitly refresh the cache if budgets are added/removed

#### Available Tools:

**`ynab.getBudgetContext`**
- Returns cached budget information (ZERO API calls)
- Shows all available budgets with metadata
- Displays currently active budget ID and name
- Use this to discover budgetId values for other tools

**`ynab.setActiveBudget`**
- Sets the active budget in the context (ZERO API calls)
- Validates budgetId against cached budgets
- Useful for multi-budget users to track working context

**`ynab.refreshBudgetContext`**
- Refreshes the cache by calling the YNAB API (ONE API call)
- Use only when budgets may have been added, removed, or renamed
- Rarely needed - cache is populated at startup

#### LLM Workflow:

For LLMs (especially local models), this system provides an efficient way to get budget IDs:

```typescript
// Step 1: Get budget context from cache (no API call)
const context = await ynab.getBudgetContext();
// Returns: { budgets: [...], activeBudgetId: "budget-123", ... }

// Step 2: Use the budgetId in other tools
const transactions = await ynab.getTransactions({
  budgetId: context.activeBudgetId,  // or select from context.budgets
  sinceDate: "2025-01-01"
});
```

#### Benefits:
- **Performance**: Eliminates repeated `getBudgets()` calls (saves 100s of API calls per session)
- **Simplicity**: Single-budget users get their budgetId instantly
- **Efficiency**: All budget metadata cached for fast lookups
- **LLM-friendly**: Reduces token usage by avoiding redundant API responses

#### Implementation Details:
- **Singleton pattern**: Uses `BudgetContextManager` singleton (similar to staging system)
- **In-memory cache**: Budgets stored in memory for the server session
- **Session-scoped**: Cache persists until server restart
- **Lazy evaluation**: Budget metadata built into a Map for O(1) lookups
- **Error handling**: Initialization errors are logged but don't crash the server

### Testing Approach:
The project uses a comprehensive multi-layer testing strategy:

- **Test Runner**: Vitest (`pnpm test`)
- **Test Structure**:
  - `tests/api/` - Unit tests for API client functions with mocked HTTP
  - `tests/server/` - Integration tests for MCP server initialization
  - `tests/budget/` - Budget context tests covering initialization, caching, and API call minimization
  - `tests/staging/` - Staged changes tracker tests covering staging, clearing, and filtering
  - `tests/e2e/` - End-to-end tests using MCP Client SDK (skipped by default)
  - `tests/helpers/` - Mock utilities and test environment helpers
- **Features**: Fast execution, watch mode, UI mode, code coverage, and TypeScript support
- **Mocking Strategy**: Mock HTTP fetch implementation to avoid network calls
- **Coverage**: Tests validate success scenarios, error handling, parameter validation, schema compliance, budget context caching, and staging workflows
- **Manual Testing**: MCP Inspector for interactive tool testing during development

See `tests/README.md` for detailed testing guide and best practices

## Configuration Requirements

Required environment variables:
- `YNAB_ACCESS_TOKEN` - Personal Access Token from YNAB (required)
- `READ_ONLY` - Set to `true` to enable read-only mode (optional, defaults to `false`)
- `YNAB_BASE_URL` - YNAB API base URL (optional, defaults to `https://api.ynab.com/v1`)
- `MCP_SERVER_NAME` - Server name (optional, defaults to `ynab-mcp-server`)

All environment variables are validated at runtime with helpful error messages.