# Testing Guide

This directory contains comprehensive tests for the YNAB MCP Server.

## Test Structure

```
tests/
├── helpers/           # Test utilities and mocks
│   ├── mock-fetch.ts  # Mock fetch implementation for API calls
│   └── test-env.ts    # Test environment configuration
├── api/               # Unit tests for API client functions
│   ├── client.test.ts        # Core client functionality
│   ├── budgets.test.ts       # Budget API endpoints
│   └── transactions.test.ts  # Transaction API endpoints
├── server/            # Integration tests for MCP server
│   └── server-initialization.test.ts  # Server creation and setup
└── e2e/               # End-to-end tests
    └── server-client.test.ts  # Full client/server communication
```

## Running Tests

### Run All Tests
```bash
pnpm test
```

### Run Specific Test Files
```bash
pnpm vitest tests/api/client.test.ts
pnpm vitest tests/server/server-initialization.test.ts
```

### Run Tests in Watch Mode
```bash
pnpm test:watch
```

### Run with Code Coverage
```bash
pnpm test:coverage
```

### Run with UI (Interactive Mode)
```bash
pnpm test:ui
```

## Test Categories

### 1. Unit Tests (`tests/api/`)

Test individual API client functions in isolation using mocked HTTP responses.

**Purpose:**
- Verify correct URL construction
- Test parameter handling
- Validate error handling
- Ensure type safety

**Example:**
```typescript
import { describe, it, expect } from "vitest";
import { getBudgets } from "../../src/api/budgets/index.js";
import { createMockFetch } from "../helpers/mock-fetch.js";

describe("Budget API", () => {
  it("should fetch budgets list", async () => {
    const { fetch: mockFetch } = createMockFetch({
      responses: new Map([
        ["/budgets", { status: 200, ok: true, data: mockBudgets }],
      ]),
    });

    initializeClient({ fetchImpl: mockFetch });
    const result = await getBudgets();

    expect(result.data.budgets).toBeTruthy();
  });
});
```

### 2. Integration Tests (`tests/server/`)

Test the MCP server's tool registration and invocation mechanisms.

**Purpose:**
- Verify all tools are registered
- Validate tool schemas
- Test tool invocation
- Ensure proper error propagation

**Example:**
```typescript
import { describe, it, expect } from "vitest";
import { createServer } from "../../src/server.js";

describe("MCP Server", () => {
  it("should initialize server instance", () => {
    const { server } = createServer(testEnv);

    expect(server).toBeTruthy();
    expect(typeof server.connect).toBe("function");
  });
});
```

### 3. End-to-End Tests (`tests/e2e/`)

Test the full MCP protocol communication using the client SDK.

**Purpose:**
- Verify stdio transport communication
- Test real client/server interaction
- Validate protocol compliance
- Test complete workflows

**Example:**
```typescript
import { describe, it, expect } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

describe("E2E Tests", () => {
  it("should connect and call tools", async () => {
    const transport = new StdioClientTransport({
      command: "node",
      args: ["--import", "tsx", "src/index.ts"],
      env: { YNAB_ACCESS_TOKEN: "test-token" }
    });

    await client.connect(transport);
    const result = await client.callTool({
      name: "ynab.getBudgets",
      arguments: {}
    });

    expect(result).toBeTruthy();
  });
});
```

## Test Helpers

### Mock Fetch (`tests/helpers/mock-fetch.ts`)

Provides utilities to mock HTTP responses without making real network calls.

```typescript
import { createMockFetch, mockYnabResponses } from "../helpers/mock-fetch.js";

// Create mock with predefined responses
const { fetch: mockFetch, calls } = createMockFetch({
  responses: new Map([
    ["/budgets", { status: 200, ok: true, data: mockYnabResponses.budgets }],
  ]),
});

// Use mock in client
initializeClient({ fetchImpl: mockFetch });

// Verify calls were made
expect(calls.length).toBe(1);
expect(calls[0].url).toContain("/budgets");
```

### Test Environment (`tests/helpers/test-env.ts`)

Creates test-friendly environment configurations.

```typescript
import { createTestEnv } from "../helpers/test-env.js";

const env = createTestEnv({
  YNAB_ACCESS_TOKEN: "custom-token",
});
```

## Testing Best Practices

### 1. Isolate Tests
- Each test should be independent
- Use `beforeEach` to reset state
- Don't rely on test execution order

### 2. Mock External Dependencies
- Never make real API calls in unit tests
- Use `createMockFetch` for HTTP mocking
- Provide realistic mock data

### 3. Test Error Cases
- Test both success and failure scenarios
- Verify error messages and types
- Check proper error propagation

### 4. Validate Schemas
- Ensure tool schemas match expectations
- Verify required/optional parameters
- Test parameter validation

### 5. Keep Tests Fast
- Unit tests should complete in milliseconds
- Use mocks to avoid network delays
- Reserve E2E tests for critical workflows

## Manual Testing with MCP Inspector

For interactive testing during development:

```bash
# Install MCP Inspector globally
npm install -g @modelcontextprotocol/inspector

# Launch inspector with your server
mcp-inspector pnpm dev
```

This opens a web UI where you can:
- Browse all registered tools
- Inspect tool schemas
- Call tools with custom inputs
- View request/response details

## Testing with Real YNAB API

For integration testing with a real YNAB account:

1. Set your real access token:
```bash
export YNAB_ACCESS_TOKEN="your-real-token"
```

2. Run tests (E2E tests will use real API):
```bash
pnpm test
```

**Warning:** Be cautious when running tests against a real YNAB account, especially tests that create/update/delete data.

## Continuous Integration

Tests are designed to run in CI/CD environments:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: pnpm test
  env:
    YNAB_ACCESS_TOKEN: ${{ secrets.YNAB_ACCESS_TOKEN }}
```

For CI environments without a real token, unit and integration tests will still pass using mocks.

## Debugging Tests

### Run Tests with UI
```bash
pnpm test:ui
```

### Debug Specific Test
```bash
pnpm vitest tests/api/client.test.ts --reporter=verbose
```

### Filter Tests by Pattern
```bash
pnpm vitest -t "should fetch budgets"
```

### View Mock Call History
```typescript
const { fetch: mockFetch, calls } = createMockFetch();

// After test runs
console.log("API calls made:", calls);
calls.forEach(call => {
  console.log(`${call.init?.method} ${call.url}`);
});
```

## Adding New Tests

When adding new API functions or tools:

1. **Add unit test** in `tests/api/` for the API function
2. **Update integration tests** in `tests/server/` to verify tool registration
3. **Add mock responses** in `tests/helpers/mock-fetch.ts` if needed
4. **Document** any special testing considerations

## Common Issues

### "Cannot find module" errors
- Ensure you're using `.js` extensions in imports (required for ESM)
- Check that `tsconfig.json` has correct module settings

### Tests hanging
- Ensure all async operations are properly awaited
- Close client connections in `afterEach` hooks
- Check for unclosed network requests

### Mock not working
- Verify you're passing `mockFetch` to `initializeClient`
- Check that URL patterns in mock responses match actual requests
- Use `calls` array to debug which URLs are being requested
