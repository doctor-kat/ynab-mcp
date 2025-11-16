import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Env } from "./env.js";
import { loadEnv } from "./env.js";
import { initializeClient } from "./api/index.js";
import { registerTools } from "./tools/index.js";

export interface ServerBundle {
  server: McpServer;
}

export function createServer(env: Env = loadEnv()): ServerBundle {
  initializeClient({
    baseUrl: env.YNAB_BASE_URL,
    accessToken: env.YNAB_ACCESS_TOKEN!,
  });

  const server = new McpServer(
    {
      name: env.MCP_SERVER_NAME,
      version: "0.1.0",
    },
    {
      capabilities: {
        logging: {},
      },
      instructions:
        "Interact with the user's YNAB budgets. Use the provided tools to list budgets, fetch transactions, categorize, and split entries. Always confirm destructive actions.",
    },
  );

  registerTools({ server });
  return { server };
}

export async function startServer(env: Env = loadEnv()): Promise<void> {
  const { server } = createServer(env);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
