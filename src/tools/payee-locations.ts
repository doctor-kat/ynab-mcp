import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getPayeeLocations, getPayeeLocationsByPayee } from "../api/index.js";
import { errorResult, successResult, getActiveBudgetIdOrError } from "./utils.js";

export function registerGetPayeeLocationsTool(server: McpServer): void {
  const schema = z.object({});

  server.registerTool(
    "ynab.getPayeeLocations",
    {
      title: "Get payee locations",
      description: "Get all payee locations.",
      inputSchema: schema.shape,
    },
    async () => {
      try {
        const budgetId = getActiveBudgetIdOrError();
        const response = await getPayeeLocations({ budgetId });
        return successResult(
          `Payee locations for budget ${budgetId}`,
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
    payeeId: z.string().min(1).describe("The ID of the payee (use ynab.getPayees to discover)"),
  });

  server.registerTool(
    "ynab.getPayeeLocationsByPayee",
    {
      title: "Get payee locations by payee",
      description: "Get all locations for a specific payee.",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const budgetId = getActiveBudgetIdOrError();
        const response = await getPayeeLocationsByPayee({ budgetId, ...args });
        return successResult(
          `Payee locations for payee ${args.payeeId} in budget ${budgetId}`,
          response,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
