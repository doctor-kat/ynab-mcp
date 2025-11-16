/**
 * Integration tests for MCP server initialization
 *
 * These tests verify that the server can be created and initialized properly.
 * For full protocol testing including tool invocation, see E2E tests.
 */

import { describe, it, beforeEach, afterEach, expect } from "vitest";
import { createServer } from "../../src/server.js";
import { setupTestEnv, cleanupTestEnv, createTestEnv } from "../helpers/test-env.js";

describe("MCP Server - Initialization", () => {
  beforeEach(() => {
    setupTestEnv();
  });

  afterEach(() => {
    cleanupTestEnv();
  });

  it("should create server instance without errors", () => {
    const env = createTestEnv();
    const bundle = createServer(env);

    expect(bundle).toBeTruthy();
    expect(bundle.server).toBeTruthy();
  });

  it("should have MCP server methods", () => {
    const env = createTestEnv();
    const { server } = createServer(env);

    // Verify it's an MCP server with expected protocol methods
    expect(typeof server.connect).toBe("function");
    expect(typeof server.close).toBe("function");
    expect(typeof server.registerTool).toBe("function");
    expect(typeof server.sendLoggingMessage).toBe("function");
  });

  it("should initialize with custom environment", () => {
    const customEnv = createTestEnv({
      YNAB_ACCESS_TOKEN: "custom-test-token",
      MCP_SERVER_NAME: "custom-server-name",
    });

    const { server } = createServer(customEnv);

    expect(server).toBeTruthy();
  });

  it("should be able to create multiple server instances", () => {
    const env = createTestEnv();

    const bundle1 = createServer(env);
    const bundle2 = createServer(env);

    expect(bundle1.server).toBeTruthy();
    expect(bundle2.server).toBeTruthy();
    expect(bundle1.server).not.toBe(bundle2.server);
  });
});
