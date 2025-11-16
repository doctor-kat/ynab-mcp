/**
 * End-to-end tests using MCP Client SDK
 * Tests the full MCP protocol communication between client and server
 */

import { describe, it, beforeEach, afterEach, expect } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Get project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "../..");

describe.skip("E2E - MCP Client/Server Communication", () => {
  let client: Client;
  let cleanup: (() => Promise<void>) | null = null;

  beforeEach(async () => {
    // Create a client instance
    client = new Client(
      {
        name: "test-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      },
    );
  });

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
      cleanup = null;
    }
  });

  describe("Server startup via stdio", () => {
    it("should connect to server via stdio transport", async () => {
      // Start server as a subprocess
      const transport = new StdioClientTransport({
        command: "node",
        args: ["--import", "tsx", "src/index.ts"],
        env: {
          ...process.env,
          YNAB_ACCESS_TOKEN: "test-token-123",
          YNAB_BASE_URL: "https://api.ynab.com/v1/",
          MCP_SERVER_NAME: "test-server",
        },
        cwd: projectRoot,
      });

      await client.connect(transport);

      cleanup = async () => {
        await client.close();
      };

      // Verify connection
      expect(client).toBeTruthy();
    });

    it("should list all tools after connection", async () => {
      const transport = new StdioClientTransport({
        command: "node",
        args: ["--import", "tsx", "src/index.ts"],
        env: {
          ...process.env,
          YNAB_ACCESS_TOKEN: "test-token-123",
          YNAB_BASE_URL: "https://api.ynab.com/v1/",
          MCP_SERVER_NAME: "test-server",
        },
        cwd: projectRoot,
      });

      await client.connect(transport);

      cleanup = async () => {
        await client.close();
      };

      // List tools
      const tools = await client.listTools();

      expect(tools.tools).toBeTruthy();
      expect(tools.tools.length).toBe(30);

      // Verify a few expected tools
      const toolNames = tools.tools.map((t) => t.name);
      expect(toolNames).toContain("ynab.getBudgets");
      expect(toolNames).toContain("ynab.getTransactions");
      expect(toolNames).toContain("ynab.updateTransaction");
    });
  });

  describe("Full workflow simulation", () => {
    it("should simulate budget discovery workflow", async () => {
      // Note: This test requires a real YNAB API token to fully work
      // For CI/CD, you might want to skip this or use mock responses

      const token = process.env.YNAB_ACCESS_TOKEN;
      if (!token || token.startsWith("test-")) {
        // Skip test if no real token available
        return;
      }

      const transport = new StdioClientTransport({
        command: "node",
        args: ["--import", "tsx", "src/index.ts"],
        env: {
          ...process.env,
          YNAB_ACCESS_TOKEN: token,
          YNAB_BASE_URL: "https://api.ynab.com/v1/",
          MCP_SERVER_NAME: "test-server",
        },
        cwd: projectRoot,
      });

      await client.connect(transport);

      cleanup = async () => {
        await client.close();
      };

      // Step 1: List budgets
      const budgetsResult = await client.callTool({
        name: "ynab.getBudgets",
        arguments: {},
      });

      expect(budgetsResult).toBeTruthy();
      expect(budgetsResult.content).toBeTruthy();
      expect(Array.isArray(budgetsResult.content)).toBe(true);

      // Verify we got a response
      const hasContent = (budgetsResult.content as any[]).some(
        (c: any) => c.type === "text" && c.text.length > 0,
      );
      expect(hasContent).toBe(true);
    });
  });

  describe("Error scenarios", () => {
    it("should handle invalid tool calls", async () => {
      const transport = new StdioClientTransport({
        command: "node",
        args: ["--import", "tsx", "src/index.ts"],
        env: {
          ...process.env,
          YNAB_ACCESS_TOKEN: "test-token-123",
          YNAB_BASE_URL: "https://api.ynab.com/v1/",
          MCP_SERVER_NAME: "test-server",
        },
        cwd: projectRoot,
      });

      await client.connect(transport);

      cleanup = async () => {
        await client.close();
      };

      // Try to call non-existent tool
      await expect(
        client.callTool({
          name: "ynab.nonExistentTool",
          arguments: {},
        }),
      ).rejects.toThrow();
    });
  });
});
