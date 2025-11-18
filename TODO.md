# YNAB MCP Tools: Comprehensive LLM Usability Refactor

## Overview

Implement all 32 identified improvements to optimize token usage, improve LLM comprehension, and streamline workflows. Breaking changes allowed for better DX.

## Phase 1: Core Infrastructure (Foundation)

### 1.1 Response Format System ✅

- [x] Add `includeMilliunits` boolean parameter to all amount-returning tools (defaults to false)
- [x] Update response-transformer.ts to conditionally include milliunit fields based on parameter
- [x] Breaking: Default to formatted-only (40% token reduction on transaction/category responses)

**Completed:** Modified 8 files (response-transformer.ts + 7 tool files), updated 22 tool functions with `includeMilliunits` parameter. Default behavior now returns formatted amounts only, with option to include milliunits when needed for splits/calculations.

### 1.2 Error Handling Enhancement ✅

- [x] Create src/utils/error-hints.ts with context-aware error messages by HTTP status
- [x] Update all errorResult() calls to include actionable hints
- [x] Add formatted amounts to validation errors (split sum mismatches)

**Completed:** Created comprehensive error hint system with context-aware messages for all HTTP status codes (400, 401, 403, 404, 409, 429, 500+). Enhanced errorResult() to automatically include hints and next steps. Added formatted amount validation errors for split transactions showing exact difference in currency format.

### 1.3 Response Metadata System ✅

- [x] Add metadata field to all list responses with: count, filters, endpoint, cached
- [x] Flatten category responses from {data: {category_groups: [...]}} to {category_groups: [...], metadata: {...}}
- [x] Breaking: Remove excessive nesting throughout

**Completed:** Added ResponseMetadata interface and buildMetadata() helper in utils.ts. Flattened 12 list-returning tools across 7 files (categories, transactions, accounts, payees, months, scheduled-transactions, budgets). All responses now include metadata with count, active filters, and cache status. Category responses BREAKING CHANGE: no longer nested under data.category_groups.

## Phase 2: Tool Descriptions & Parameters

### 2.1 Parameter Description Cleanup ✅

- [x] Remove all "use X to discover" patterns from ~20+ parameter descriptions
- [x] Add explicit enum value documentation inline
- [x] Add examples to complex parameters (amounts, dates, splits)
- [x] Clarify mutually exclusive parameter priorities

**Completed:** Updated 8 files with 186 lines changed. Removed 23 "use ynab.X to discover" patterns, added explicit UUID format documentation to 36 ID parameters, enhanced 11 enum parameters with inline valid values, added examples to complex parameters (amounts, dates, subtransactions), and clarified priority for mutually exclusive parameters (id vs name).

### 2.2 Tool Renaming for Consistency ✅

- [x] Breaking: Rename staging tools:
  - [x] reviewChanges → getStagedChanges
  - [x] applyChanges → applyStagedChanges
  - [x] clearChanges → clearStagedChanges
- [x] Breaking: Rename budget tools:
  - [x] getBudgets → getBudgetDetails
  - [x] getBudgetContext → getAvailableBudgets

**Completed:** Renamed 5 tools (3 staging, 2 budget) for consistency. Updated 7 files including src code, tests, and documentation (CLAUDE.md, README.md). All cross-references in error messages, tool descriptions, and parameter descriptions updated. Function names unchanged, only MCP tool registration names modified.

### 2.3 Add Missing Documentation ✅

- [x] Add milliunit helper constant used across all amount parameters
- [x] Document in-memory staging persistence behavior
- [x] Add date validation hints (first-of-month for budgets)
- [x] Add edge case documentation to complex tools

**Completed:** Enhanced 12 tool descriptions across 5 files. Added persistence documentation to 4 staging tools (in-memory, session-scoped, cleared on restart). Added date validation hints to 4 month-related parameters (first day of month requirement). Added edge case documentation to 3 tools (pending transaction exclusion, past date validation, non-negative budget amounts).

## Phase 3: Workflow Optimizations

### 3.1 Bulk Operation Improvements

- [ ] Optimize bulkCategorize to batch-fetch transactions once vs. N individual calls
- [ ] Add transaction map caching within tool execution context

### 3.2 Preview Tools (New)

- [ ] Add ynab.previewCategorization - see diff before staging
- [ ] Add ynab.previewSplit - validate split before staging
- [ ] Include "next steps" hints in all staging responses

### 3.3 Cache Visibility

- [ ] Add cache status hints to tool descriptions (e.g., "Uses cached data - refresh with ynab.refreshCategoryCache")
- [ ] Add ynab.getServerInfo tool with version, capabilities, cache status

## Phase 4: Schema & Validation

### 4.1 Enhanced Input Schemas

- [ ] Add inline examples to transaction creation, split staging
- [ ] Document enum values for cleared, frequency, etc.
- [ ] Add format hints to all date/amount parameters
- [ ] Clarify optional vs required parameter interactions

### 4.2 Better Validation Messages

- [ ] Custom Zod error messages for common validation failures
- [ ] Include corrected format examples in validation errors

## Phase 5: Testing & Documentation

### 5.1 Update Tests

- [ ] Update response assertions for new metadata fields
- [ ] Add tests for error hint generation
- [ ] Add tests for formatted-only responses
- [ ] Update integration tests for renamed tools

### 5.2 Update CLAUDE.md

- [ ] Document breaking changes
- [ ] Update all examples to use renamed tools
- [ ] Add format parameter guidance
- [ ] Add error recovery examples

### 5.3 Add Migration Guide

- [ ] Create MIGRATION.md documenting all breaking changes
- [ ] Provide before/after examples for renamed tools
- [ ] Document new response structures

## Implementation Order

1. [ ] Infrastructure (error hints, response format system, metadata)
2. [ ] Tool renaming & description cleanup
3. [ ] Workflow optimizations
4. [ ] Schema enhancements
5. [ ] Testing & documentation

## Estimated Impact

- Token reduction: 25-35% for typical workflows
- API call reduction: 30-40% for bulk operations
- Error recovery: LLMs can self-correct 60%+ of common errors
- Comprehension: Clearer descriptions reduce multi-turn clarifications

## Files Modified (~25 files)

- src/utils/ - error-hints.ts (new), response-transformer.ts, error-result.ts
- src/tools/*.ts - All 7 tool files (descriptions, schemas, renaming)
- src/server.ts - Tool registration updates
- tests/ - Update ~15 test files for new signatures
- CLAUDE.md, MIGRATION.md (new), README.md
