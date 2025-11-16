import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getBudgetMonth, getBudgetMonths } from "../api/index.js";
import { errorResult, successResult } from "./utils.js";

export function registerGetBudgetMonthsTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
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
      description: "Retrieve and return all budget months. Use ynab.getBudgetContext to get your budgetId.",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const response = await getBudgetMonths(args);
        return successResult(
          `Budget months for budget ${args.budgetId}`,
          response,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

export function registerGetBudgetMonthTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
    month: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe("The budget month in ISO format (YYYY-MM-DD)"),
  });

  server.registerTool(
    "ynab.getBudgetMonth",
    {
      title: "Get budget month",
      description: "Retrieve and return a single budget month. Requires budgetId (use ynab.getBudgetContext to get your budgetId).",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const response = await getBudgetMonth(args);
        return successResult(
          `Budget month ${args.month} for budget ${args.budgetId}`,
          response,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
