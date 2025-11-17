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
      description: "Refresh payee data from YNAB API. Use when payees were modified externally.",
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
      description: "Refresh category data from YNAB API. Use when categories were modified externally.",
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
      description: "Refresh account data from YNAB API. Use when accounts were modified externally.",
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
      description: "Refresh budget settings from YNAB API. Use when currency or date format settings changed.",
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
      description: "Clear all caches (budgets, payees, categories, accounts, settings). Use for troubleshooting.",
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
