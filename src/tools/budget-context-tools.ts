import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { budgetStore } from "../budget/index.js";
import { errorResult, successResult } from "./utils.js";

/**
 * Register the getBudgetContext tool
 *
 * Returns the cached budget context without making any API calls.
 * Shows all available budgets and the currently active budget.
 */
export function registerGetBudgetContextTool(server: McpServer): void {
  const schema = z.object({});

  server.registerTool(
    "ynab.getBudgetContext",
    {
      title: "Get budget context",
      description:
        "Get the cached budget context showing all available budgets and the currently active budget. " +
        "This tool makes ZERO API calls - it returns cached data from server initialization. " +
        "Use this to discover budgetId values for other tools. " +
        "If you have one budget, the activeBudgetId will be auto-set. " +
        "For multiple budgets, use ynab.setActiveBudget to set the working budget.",
      inputSchema: schema.shape,
    },
    async () => {
      try {
        const context = budgetStore.getState().getBudgetContext();
        return successResult("Budget context retrieved from cache", context);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

/**
 * Register the setActiveBudget tool
 *
 * Sets the active budget ID in the context without making any API calls.
 */
export function registerSetActiveBudgetTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z
      .string()
      .min(1)
      .describe(
        "The ID of the budget to set as active. Must be one of the budgets from ynab.getBudgetContext",
      ),
  });

  server.registerTool(
    "ynab.setActiveBudget",
    {
      title: "Set active budget",
      description:
        "Set the active budget in the context. " +
        "This updates which budget is considered 'active' for your workflow. " +
        "This tool makes ZERO API calls - it only updates in-memory state. " +
        "The budgetId must be one of the budgets from ynab.getBudgetContext.",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        budgetStore.getState().setActiveBudget(args.budgetId);
        const context = budgetStore.getState().getBudgetContext();
        return successResult(
          `Active budget set to: ${context.activeBudgetName}`,
          context,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

/**
 * Register the refreshBudgetContext tool
 *
 * Refreshes the budget cache by making a new API call to YNAB.
 */
export function registerRefreshBudgetContextTool(server: McpServer): void {
  const schema = z.object({});

  server.registerTool(
    "ynab.refreshBudgetContext",
    {
      title: "Refresh budget context",
      description:
        "Refresh the budget context cache by fetching the latest budgets from the YNAB API. " +
        "This makes ONE API call to update the cache. " +
        "Use this if budgets may have been added, removed, or renamed since the server started. " +
        "In most cases, this is not needed - the cache is populated at server startup.",
      inputSchema: schema.shape,
    },
    async () => {
      try {
        await budgetStore.getState().refreshCache();
        const context = budgetStore.getState().getBudgetContext();
        return successResult("Budget context refreshed from API", context);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
