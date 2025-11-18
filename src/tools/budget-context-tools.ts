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
        "Get all available budgets and the currently active budget. " +
        "Use this to discover budgetId values. " +
        "For multiple budgets, use setActiveBudget to switch between them.",
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
        "Budget ID to set as active. UUID format. Must be one of the budgets from ynab.getBudgetContext.",
      ),
  });

  server.registerTool(
    "ynab.setActiveBudget",
    {
      title: "Set active budget",
      description:
        "Switch the active budget. " +
        "The budgetId must be one of the budgets from getBudgetContext.",
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
        "Refresh budget list from YNAB API. " +
        "Use when budgets may have been added, removed, or renamed externally.",
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
