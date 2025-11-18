# YNAB MCP Tools: Comprehensive LLM Usability Refactor

## Overview

Implement all 32 identified improvements to optimize token usage, improve LLM comprehension, and streamline workflows. Breaking changes allowed for better DX.

## Phase 1: Core Infrastructure (Foundation)

### 1.1 Response Format System ✅

- [x] Add `includeMilliunits` boolean parameter to all amount-returning tools (defaults to false)
- [x] Update response-transformer.ts to conditionally include milliunit fields based on parameter
- [x] Breaking: Default to formatted-only (40% token reduction on transaction/category responses)

**Completed:** Modified 8 files (response-transformer.ts + 7 tool files), updated 22 tool functions with `includeMilliunits` parameter. Default behavior now returns formatted amounts only, with option to include milliunits when needed for splits/calculations.

### 1.2 Error Handling Enhancement

- [ ] Create src/utils/error-hints.ts with context-aware error messages by HTTP status
- [ ] Update all errorResult() calls to include actionable hints
- [ ] Add formatted amounts to validation errors (split sum mismatches)

### 1.3 Response Metadata System

- [ ] Add metadata field to all list responses with: count, filters, endpoint, cached
- [ ] Flatten category responses from {data: {category_groups: [...]}} to {category_groups: [...], metadata: {...}}
- [ ] Breaking: Remove excessive nesting throughout

## Phase 2: Tool Descriptions & Parameters

### 2.1 Parameter Description Cleanup

- [ ] Remove all "use X to discover" patterns from ~20+ parameter descriptions
- [ ] Add explicit enum value documentation inline
- [ ] Add examples to complex parameters (amounts, dates, splits)
- [ ] Clarify mutually exclusive parameter priorities

### 2.2 Tool Renaming for Consistency

- [ ] Breaking: Rename staging tools:
  - [ ] reviewChanges → getStagedChanges
  - [ ] applyChanges → applyStagedChanges
  - [ ] clearChanges → clearStagedChanges
- [ ] Breaking: Rename budget tools:
  - [ ] getBudgets → getBudgetDetails
  - [ ] getBudgetContext → getAvailableBudgets

### 2.3 Add Missing Documentation

- [ ] Add milliunit helper constant used across all amount parameters
- [ ] Document in-memory staging persistence behavior
- [ ] Add date validation hints (first-of-month for budgets)
- [ ] Add edge case documentation to complex tools

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
