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
    includeMilliunits: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Include original milliunit amounts in response (default: false). When false, only formatted currency strings are returned (40% token reduction). Set to true when you need milliunits for transaction splitting or precise calculations.",
      ),
  });

  server.registerTool(
    "ynab.getBudgets",
    {
      title: "Get budgets",
      description:
        "Get all budgets with summaries. Can optionally include account details. NOTE: For discovering budgetId values, use getBudgetContext instead.",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const response = await getBudgets(args);

        // Add formatted currency amounts
        const currencyFormat = await getCurrencyFormat();
        const formattedResponse = addFormattedAmounts(
          response,
          currencyFormat,
          args.includeMilliunits ?? false,
        );

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
    includeMilliunits: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Include original milliunit amounts in response (default: false). When false, only formatted currency strings are returned (40% token reduction). Set to true when you need milliunits for transaction splitting or precise calculations.",
      ),
  });

  server.registerTool(
    "ynab.getBudgetById",
    {
      title: "Get budget by ID",
      description: "Get complete budget data including all accounts, categories, payees, and transactions.",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const budgetId = getActiveBudgetIdOrError();
        const response = await getBudgetById({ budgetId, ...args });

        // Add formatted currency amounts
        const currencyFormat = await getCurrencyFormat();
        const formattedResponse = addFormattedAmounts(
          response,
          currencyFormat,
          args.includeMilliunits ?? false,
        );

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
      description: "Get budget settings including currency format and date format.",
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
