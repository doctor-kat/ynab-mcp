import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getBudgetMonth, getBudgetMonths } from "../api/index.js";
import { errorResult, successResult, getActiveBudgetIdOrError, getCurrencyFormat } from "./utils.js";
import { addFormattedAmounts } from "../utils/response-transformer.js";

export function registerGetBudgetMonthsTool(server: McpServer): void {
  const schema = z.object({
    lastKnowledgeOfServer: z
      .number()
      .int()
      .optional()
      .describe("Server knowledge timestamp for delta requests"),
  });

  server.registerTool(
    "ynab.getBudgetMonths",
    {
      title: "Get budget months",
      description: "Retrieve and return all budget months for the active budget.",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const budgetId = getActiveBudgetIdOrError();
        const response = await getBudgetMonths({ budgetId, ...args });

        // Add formatted currency amounts
        const currencyFormat = await getCurrencyFormat();
        const formattedResponse = addFormattedAmounts(response, currencyFormat);

        return successResult(
          `Budget months for budget ${budgetId}`,
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
      .describe("The budget month in ISO format (YYYY-MM-DD)"),
  });

  server.registerTool(
    "ynab.getBudgetMonth",
    {
      title: "Get budget month",
      description: "Retrieve and return a single budget month for the active budget.",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const budgetId = getActiveBudgetIdOrError();
        const response = await getBudgetMonth({ budgetId, ...args });

        // Add formatted currency amounts
        const currencyFormat = await getCurrencyFormat();
        const formattedResponse = addFormattedAmounts(response, currencyFormat);

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
