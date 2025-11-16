# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript Model Context Protocol (MCP) server that wraps the YNAB API, providing first-class support for transaction categorization and splitting workflows. It provides strongly-typed functions for each YNAB API endpoint and offers curated MCP tools for common budgeting tasks.

## Key Architecture Components

1. **Environment Configuration**: Uses `dotenv` and `zod` for environment loading and validation
2. **API Client**: Strongly-typed functions (one per endpoint) organized by domain, using types from the OpenAPI spec
3. **MCP Server**: Implements the Model Context Protocol with stdio transport
4. **Tool Registration**: Provides MCP tools for:
   - Budget, account, and transaction discovery helpers
   - Focused utilities for categorizing and splitting transactions

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
- `src/server.ts` – MCP server factory + stdio bootstrapper
- `src/tools/` – MCP tool registrations (categorize, split, list)
- `tools/generate_types.py` – Python-based type generator leveraging vendored PyYAML
- `tests/` – Node test suite for critical client behavior

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
The server registers 35 tools across all YNAB API endpoints:
- 1 user tool (get user info)
- 3 budget tools (list, get by ID, get settings)
- 3 account tools (list, create, get by ID)
- 5 category tools (list, get, update, get month category, update month category)
- 3 payee tools (list, get, update)
- 3 payee location tools (list, get by ID, get by payee)
- 2 month tools (list months, get month detail)
- 11 transaction tools (list, create, update multiple, import, get by ID, update, delete, get by account/category/payee/month)
- 5 scheduled transaction tools (list, create, get, update, delete)

All tools follow the naming pattern `ynab.{operationName}` (e.g., `ynab.getTransactions`, `ynab.updateTransaction`)

### Testing Approach:
The project uses a comprehensive multi-layer testing strategy:

- **Test Runner**: Vitest (`pnpm test`)
- **Test Structure**:
  - `tests/api/` - Unit tests for API client functions with mocked HTTP
  - `tests/server/` - Integration tests for MCP server initialization
  - `tests/e2e/` - End-to-end tests using MCP Client SDK (skipped by default)
  - `tests/helpers/` - Mock utilities and test environment helpers
- **Features**: Fast execution, watch mode, UI mode, code coverage, and TypeScript support
- **Mocking Strategy**: Mock HTTP fetch implementation to avoid network calls
- **Coverage**: Tests validate success scenarios, error handling, parameter validation, and schema compliance
- **Manual Testing**: MCP Inspector for interactive tool testing during development

See `tests/README.md` for detailed testing guide and best practices

## Configuration Requirements

The server requires either:
1. `YNAB_ACCESS_TOKEN` for personal access tokens OR
2. The trio: `YNAB_CLIENT_ID`, `YNAB_CLIENT_SECRET`, `YNAB_REDIRECT_URI` for OAuth flows

Environment variables are validated at runtime with helpful error messages.