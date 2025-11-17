import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getBudgetById,
  getBudgets,
} from "../api/index.js";
import { settingsStore } from "../cache/index.js";
import { errorResult, successResult } from "./utils.js";

export function registerGetBudgetsTool(server: McpServer): void {
  const schema = z.object({
    includeAccounts: z
      .boolean()
      .optional()
      .describe("Include accounts for each budget"),
  });

  server.registerTool(
    "ynab.getBudgets",
    {
      title: "Get budgets",
      description:
        "Retrieve and return all budgets with summaries. Can optionally include account details. NOTE: For discovering budgetId values, use ynab.getBudgetContext instead (more efficient, ZERO API calls).",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const response = await getBudgets(args);
        return successResult("Budgets retrieved", response);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

export function registerGetBudgetByIdTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
    lastKnowledgeOfServer: z
      .number()
      .int()
      .optional()
      .describe("Server knowledge timestamp for delta requests"),
  });

  server.registerTool(
    "ynab.getBudgetById",
    {
      title: "Get budget by ID",
      description:
        "Retrieve a single budget with all related entities. This is effectively a full budget export. Requires budgetId (use ynab.getBudgetContext to get your budgetId).",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const response = await getBudgetById(args);
        return successResult(`Budget ${args.budgetId} retrieved`, response);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

export function registerGetBudgetSettingsByIdTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
  });

  server.registerTool(
    "ynab.getBudgetSettingsById",
    {
      title: "Get budget settings by ID",
      description:
        "Retrieve and return settings for a specific budget. " +
        "Uses cached data with 24-hour TTL for optimal performance. " +
        "Requires budgetId (use ynab.getBudgetContext to get your budgetId).",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const settings = await settingsStore.getState().getSettings(args.budgetId);
        return successResult(
          `Budget ${args.budgetId} settings retrieved`,
          { data: { settings } },
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
