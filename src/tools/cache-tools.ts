import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { payeeStore, categoryStore, accountStore, settingsStore } from "../cache/index.js";
import { budgetStore } from "../budget/index.js";
import { errorResult, successResult, getActiveBudgetIdOrError } from "./utils.js";

/**
 * Register the refreshPayeeCache tool
 */
export function registerRefreshPayeeCacheTool(server: McpServer): void {
  const schema = z.object({});

  server.registerTool(
    "ynab.refreshPayeeCache",
    {
      title: "Refresh payee cache",
      description:
        "Force refresh the payee cache for the active budget by fetching the latest data from the YNAB API. " +
        "This invalidates and re-fetches all payees. " +
        "Use this if payees have been added/modified outside this server session.",
      inputSchema: schema.shape,
    },
    async () => {
      try {
        const budgetId = getActiveBudgetIdOrError();
        await payeeStore.getState().refreshCache(budgetId);
        return successResult(
          `Payee cache refreshed for budget ${budgetId}`,
          { budgetId },
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

/**
 * Register the refreshCategoryCache tool
 */
export function registerRefreshCategoryCacheTool(server: McpServer): void {
  const schema = z.object({});

  server.registerTool(
    "ynab.refreshCategoryCache",
    {
      title: "Refresh category cache",
      description:
        "Force refresh the category cache for the active budget by fetching the latest data from the YNAB API. " +
        "This invalidates and re-fetches all categories. " +
        "Use this if categories have been added/modified outside this server session.",
      inputSchema: schema.shape,
    },
    async () => {
      try {
        const budgetId = getActiveBudgetIdOrError();
        await categoryStore.getState().refreshCache(budgetId);
        return successResult(
          `Category cache refreshed for budget ${budgetId}`,
          { budgetId },
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

/**
 * Register the refreshAccountCache tool
 */
export function registerRefreshAccountCacheTool(server: McpServer): void {
  const schema = z.object({});

  server.registerTool(
    "ynab.refreshAccountCache",
    {
      title: "Refresh account cache",
      description:
        "Force refresh the account cache for the active budget by fetching the latest data from the YNAB API. " +
        "This invalidates and re-fetches all accounts. " +
        "Use this if accounts have been added/modified outside this server session.",
      inputSchema: schema.shape,
    },
    async () => {
      try {
        const budgetId = getActiveBudgetIdOrError();
        await accountStore.getState().refreshCache(budgetId);
        return successResult(
          `Account cache refreshed for budget ${budgetId}`,
          { budgetId },
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

/**
 * Register the refreshSettingsCache tool
 */
export function registerRefreshSettingsCacheTool(server: McpServer): void {
  const schema = z.object({});

  server.registerTool(
    "ynab.refreshSettingsCache",
    {
      title: "Refresh settings cache",
      description:
        "Force refresh the budget settings cache for the active budget by fetching the latest data from the YNAB API. " +
        "This invalidates and re-fetches budget settings (currency format, date format). " +
        "Settings are cached for 24 hours by default.",
      inputSchema: schema.shape,
    },
    async () => {
      try {
        const budgetId = getActiveBudgetIdOrError();
        await settingsStore.getState().refreshCache(budgetId);
        return successResult(
          `Settings cache refreshed for budget ${budgetId}`,
          { budgetId },
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

/**
 * Register the clearAllCaches tool
 */
export function registerClearAllCachesTool(server: McpServer): void {
  const schema = z.object({});

  server.registerTool(
    "ynab.clearAllCaches",
    {
      title: "Clear all caches",
      description:
        "Clear all caches (budget context, payees, categories, accounts, settings). " +
        "This resets all cached data. " +
        "Useful for troubleshooting or forcing a complete refresh. " +
        "Caches will be repopulated on next access.",
      inputSchema: schema.shape,
    },
    async () => {
      try {
        // Reset all cache stores
        payeeStore.getState().reset();
        categoryStore.getState().reset();
        accountStore.getState().reset();
        settingsStore.getState().reset();
        budgetStore.getState().reset();

        return successResult(
          "All caches cleared successfully",
          {
            cleared: [
              "budget context",
              "payees",
              "categories",
              "accounts",
              "settings",
            ],
          },
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
