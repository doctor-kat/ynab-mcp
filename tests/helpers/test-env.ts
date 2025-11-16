/**
 * Test environment utilities
 * Provides test-friendly environment configuration
 */

import type { Env } from "../../src/env.js";

/**
 * Creates a mock environment for testing
 */
export function createTestEnv(overrides?: Partial<Env>): Env {
  return {
    YNAB_ACCESS_TOKEN: "test-token-12345",
    YNAB_BASE_URL: "https://api.ynab.com/v1",
    MCP_SERVER_NAME: "test-ynab-server",
    ...overrides,
  };
}

/**
 * Sets up test environment variables
 */
export function setupTestEnv(overrides?: Partial<Env>): Env {
  const testEnv = createTestEnv(overrides);

  process.env.YNAB_ACCESS_TOKEN = testEnv.YNAB_ACCESS_TOKEN;
  process.env.YNAB_BASE_URL = testEnv.YNAB_BASE_URL;
  process.env.MCP_SERVER_NAME = testEnv.MCP_SERVER_NAME;

  return testEnv;
}

/**
 * Cleans up test environment variables
 */
export function cleanupTestEnv(): void {
  delete process.env.YNAB_ACCESS_TOKEN;
  delete process.env.YNAB_BASE_URL;
  delete process.env.MCP_SERVER_NAME;
}
