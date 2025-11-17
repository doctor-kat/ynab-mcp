import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getBudgetById,
  getBudgets,
} from "../api/index.js";
import { settingsStore } from "../cache/index.js";
import { errorResult, successResult, getActiveBudgetIdOrError, getCurrencyFormat } from "./utils.js";
import { addFormattedAmounts } from "../utils/response-transformer.js";

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

        // Add formatted currency amounts
        const currencyFormat = await getCurrencyFormat();
        const formattedResponse = addFormattedAmounts(response, currencyFormat);

        return successResult("Budgets retrieved", formattedResponse);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

export function registerGetBudgetByIdTool(server: McpServer): void {
  const schema = z.object({
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
        "Retrieve the active budget with all related entities. This is effectively a full budget export.",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const budgetId = getActiveBudgetIdOrError();
        const response = await getBudgetById({ budgetId, ...args });

        // Add formatted currency amounts
        const currencyFormat = await getCurrencyFormat();
        const formattedResponse = addFormattedAmounts(response, currencyFormat);

        return successResult(`Budget ${budgetId} retrieved`, formattedResponse);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

export function registerGetBudgetSettingsByIdTool(server: McpServer): void {
  const schema = z.object({});

  server.registerTool(
    "ynab.getBudgetSettings",
    {
      title: "Get budget settings",
      description:
        "Retrieve and return settings for the active budget. " +
        "Uses cached data with 24-hour TTL for optimal performance.",
      inputSchema: schema.shape,
    },
    async () => {
      try {
        const budgetId = getActiveBudgetIdOrError();
        const settings = await settingsStore.getState().getSettings(budgetId);
        return successResult(
          `Budget ${budgetId} settings retrieved`,
          { data: { settings } },
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
