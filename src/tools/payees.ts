import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { updatePayee } from "../api/index.js";
import { payeeStore } from "../cache/index.js";
import { errorResult, isReadOnly, readOnlyResult, successResult } from "./utils.js";

export function registerGetPayeesTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
  });

  server.registerTool(
    "ynab.getPayees",
    {
      title: "Get payees",
      description:
        "Retrieve and return all payees for a budget. " +
        "Uses cached data with delta requests for optimal performance. " +
        "Use ynab.getBudgetContext to get your budgetId.",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const payees = await payeeStore.getState().getPayees(args.budgetId);
        return successResult(`Payees for budget ${args.budgetId}`, { data: { payees } });
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
      description: "Update a payee. Requires budgetId (use ynab.getBudgetContext to get your budgetId) and payeeId (use ynab.getPayees if needed).",
      inputSchema: schema.shape,
    },
    async (args) => {
      if (isReadOnly()) {
        return readOnlyResult();
      }

      try {
        const response = await updatePayee(args);
        // Invalidate cache after write operation
        payeeStore.getState().invalidate(args.budgetId);
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
