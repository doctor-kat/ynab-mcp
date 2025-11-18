import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getBudgetMonth, getBudgetMonths } from "../api/index.js";
import { errorResult, successResult, getActiveBudgetIdOrError, getCurrencyFormat, buildMetadata } from "./utils.js";
import { addFormattedAmounts } from "../utils/response-transformer.js";

export function registerGetBudgetMonthsTool(server: McpServer): void {
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
    "ynab.getBudgetMonths",
    {
      title: "Get budget months",
      description: "Get all budget months.",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const budgetId = getActiveBudgetIdOrError();
        const response = await getBudgetMonths({ budgetId, ...args });

        const months = response.data.months;

        // Build metadata
        const metadata = buildMetadata({
          count: months.length,
          cached: false,
        });

        const flatResponse = {
          months,
          metadata,
        };

        // Add formatted currency amounts
        const currencyFormat = await getCurrencyFormat();
        const formattedResponse = addFormattedAmounts(
          flatResponse,
          currencyFormat,
          args.includeMilliunits ?? false,
        );

        return successResult(
          `${metadata.count} budget month(s) retrieved`,
          formattedResponse,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

export function registerGetBudgetMonthTool(server: McpServer): void {
  const schema = z.object({
    month: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe("Budget month as first day of month (YYYY-MM-DD). Example: '2025-01-01' for January 2025."),
    includeMilliunits: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Include original milliunit amounts in response (default: false). When false, only formatted currency strings are returned (40% token reduction). Set to true when you need milliunits for transaction splitting or precise calculations.",
      ),
  });

  server.registerTool(
    "ynab.getBudgetMonth",
    {
      title: "Get budget month",
      description: "Get details for a specific budget month.",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const budgetId = getActiveBudgetIdOrError();
        const response = await getBudgetMonth({ budgetId, ...args });

        // Add formatted currency amounts
        const currencyFormat = await getCurrencyFormat();
        const formattedResponse = addFormattedAmounts(
          response,
          currencyFormat,
          args.includeMilliunits ?? false,
        );

        return successResult(
          `Budget month ${args.month} for budget ${budgetId}`,
          formattedResponse,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
