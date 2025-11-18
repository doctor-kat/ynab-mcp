import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { updatePayee } from "../api/index.js";
import { payeeStore } from "../cache/index.js";
import { errorResult, isReadOnly, readOnlyResult, successResult, getActiveBudgetIdOrError, buildMetadata } from "./utils.js";

export function registerGetPayeesTool(server: McpServer): void {
  const schema = z.object({});

  server.registerTool(
    "ynab.getPayees",
    {
      title: "Get payees",
      description: "Get all payees.",
      inputSchema: schema.shape,
    },
    async () => {
      try {
        const budgetId = getActiveBudgetIdOrError();
        const payees = await payeeStore.getState().getPayees(budgetId);

        // Build metadata
        const metadata = buildMetadata({
          count: payees.length,
          cached: true,
        });

        const flatResponse = {
          payees,
          metadata,
        };

        return successResult(`${metadata.count} payee(s) retrieved`, flatResponse);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

export function registerUpdatePayeeTool(server: McpServer): void {
  const schema = z.object({
    payeeId: z.string().min(1).describe("The ID of the payee (use ynab.getPayees to discover)"),
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
      description: "Update a payee name.",
      inputSchema: schema.shape,
    },
    async (args) => {
      if (isReadOnly()) {
        return readOnlyResult();
      }

      try {
        const budgetId = getActiveBudgetIdOrError();
        const response = await updatePayee({ budgetId, ...args });
        // Invalidate cache after write operation
        payeeStore.getState().invalidate(budgetId);
        return successResult(
          `Payee ${args.payeeId} updated in budget ${budgetId}`,
          response,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
