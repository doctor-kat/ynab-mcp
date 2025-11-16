import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getPayeeLocations, getPayeeLocationsByPayee } from "../api/index.js";
import { errorResult, successResult } from "./utils.js";

export function registerGetPayeeLocationsTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
  });

  server.registerTool(
    "ynab.getPayeeLocations",
    {
      title: "Get payee locations",
      description: "Retrieve and return all payee locations for a budget. Use ynab.getBudgetContext to get your budgetId.",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const response = await getPayeeLocations(args);
        return successResult(
          `Payee locations for budget ${args.budgetId}`,
          response,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

export function registerGetPayeeLocationsByPayeeTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
    payeeId: z.string().min(1).describe("The ID of the payee"),
  });

  server.registerTool(
    "ynab.getPayeeLocationsByPayee",
    {
      title: "Get payee locations by payee",
      description: "Retrieve and return all payee locations for a specific payee. Requires budgetId (use ynab.getBudgetContext to get your budgetId) and payeeId (use ynab.getPayees if needed).",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const response = await getPayeeLocationsByPayee(args);
        return successResult(
          `Payee locations for payee ${args.payeeId} in budget ${args.budgetId}`,
          response,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
