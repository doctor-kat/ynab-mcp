import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Env } from "./env.js";
import { loadEnv } from "./env.js";
import { initializeClient } from "./api/index.js";
import { registerTools } from "./tools/index.js";
import { budgetContext } from "./budget/index.js";

export interface ServerBundle {
  server: McpServer;
}

export function createServer(env: Env = loadEnv()): ServerBundle {
  initializeClient({
    baseUrl: env.YNAB_BASE_URL,
    accessToken: env.YNAB_ACCESS_TOKEN,
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

  const toolCount = registerTools({ server });
  console.info(`🔧 Registered ${toolCount} MCP tools`);

  return { server };
}

export async function startServer(env: Env = loadEnv()): Promise<void> {
  const { server } = createServer(env);

  // Initialize budget context (ONE API call to cache all budgets)
  console.info("📊 Initializing budget context...");
  await budgetContext.initialize();
  const context = budgetContext.getBudgetContext();
  if (context.activeBudgetId) {
    console.info(`✓ Auto-set active budget: ${context.activeBudgetName} (${context.activeBudgetId})`);
  } else if (context.budgets.length > 1) {
    console.info(`✓ Found ${context.budgets.length} budgets (no active budget set)`);
  } else if (context.budgets.length === 0) {
    console.warn("⚠ No budgets found");
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
