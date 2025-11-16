import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getPayees, updatePayee } from "../api/index.js";
import { errorResult, isReadOnly, readOnlyResult, successResult } from "./utils.js";

export function registerGetPayeesTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
    lastKnowledgeOfServer: z
      .number()
      .int()
      .optional()
      .describe("Server knowledge timestamp for delta requests"),
  });

  server.registerTool(
    "ynab.getPayees",
    {
      title: "Get payees",
      description: "Returns all payees for a budget",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const response = await getPayees(args);
        return successResult(`Payees for budget ${args.budgetId}`, response);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

export function registerUpdatePayeeTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
    payeeId: z.string().min(1).describe("The ID of the payee"),
    payee: z
      .object({
        name: z.string().optional().describe("New payee name"),
      })
      .passthrough()
      .describe("Payee update fields"),
  });

  server.registerTool(
    "ynab.updatePayee",
    {
      title: "Update payee",
      description: "Updates a payee",
      inputSchema: schema.shape,
    },
    async (args) => {
      if (isReadOnly()) {
        return readOnlyResult();
      }

      try {
        const response = await updatePayee(args);
        return successResult(
          `Payee ${args.payeeId} updated in budget ${args.budgetId}`,
          response,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
