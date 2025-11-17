import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Import all register functions
import { registerGetUserTool } from "./user.js";
import {
  registerGetBudgetByIdTool,
  registerGetBudgetSettingsByIdTool,
  registerGetBudgetsTool,
} from "./budgets.js";
import {
  registerGetBudgetContextTool,
  registerRefreshBudgetContextTool,
  registerSetActiveBudgetTool,
} from "./budget-context-tools.js";
import {
  registerCreateAccountTool,
  registerGetAccountsTool,
} from "./accounts.js";
import {
  registerGetCategoriesTool,
  registerGetMonthCategoryByIdTool,
  registerUpdateCategoryTool,
  registerUpdateMonthCategoryTool,
  registerGetCategoryGroupsTool,
  registerGetCategoriesByGroupTool,
  registerGetCategoryTool,
} from "./categories.js";
import { registerGetPayeesTool, registerUpdatePayeeTool } from "./payees.js";
import {
  registerGetPayeeLocationsByPayeeTool,
  registerGetPayeeLocationsTool,
} from "./payee-locations.js";
import {
  registerGetBudgetMonthsTool,
  registerGetBudgetMonthTool,
} from "./months.js";
import {
  registerCreateTransactionTool,
  registerDeleteTransactionTool,
  registerGetTransactionsTool,
  registerImportTransactionsTool,
  registerUpdateTransactionsTool,
} from "./transactions.js";
import {
  registerCreateScheduledTransactionTool,
  registerDeleteScheduledTransactionTool,
  registerGetScheduledTransactionsTool,
  registerUpdateScheduledTransactionTool,
} from "./scheduled-transactions.js";
import {
  registerApplyChangesTool,
  registerBulkCategorizeTool,
  registerClearChangesTool,
  registerReviewChangesTool,
  registerStageCategorizationTool,
  registerStageSplitTool,
} from "./staging-tools.js";
import {
  registerClearAllCachesTool,
  registerRefreshAccountCacheTool,
  registerRefreshCategoryCacheTool,
  registerRefreshPayeeCacheTool,
  registerRefreshSettingsCacheTool,
} from "./cache-tools.js";

export interface ToolRegistrationContext {
  server: McpServer;
}

export function registerTools({ server }: ToolRegistrationContext): number {
  let toolCount = 0;

  // User (1 tool)
  registerGetUserTool(server);
  toolCount += 1;

  // Budgets (3 tools)
  registerGetBudgetsTool(server);
  registerGetBudgetByIdTool(server);
  registerGetBudgetSettingsByIdTool(server);
  toolCount += 3;

  // Budget Context (3 tools)
  registerGetBudgetContextTool(server);
  registerSetActiveBudgetTool(server);
  registerRefreshBudgetContextTool(server);
  toolCount += 3;

  // Accounts (2 tools)
  registerGetAccountsTool(server);
  registerCreateAccountTool(server);
  toolCount += 2;

  // Categories (7 tools)
  registerGetCategoriesTool(server);
  registerGetCategoryGroupsTool(server);
  registerGetCategoriesByGroupTool(server);
  registerGetCategoryTool(server);
  registerUpdateCategoryTool(server);
  registerGetMonthCategoryByIdTool(server);
  registerUpdateMonthCategoryTool(server);
  toolCount += 7;

  // Payees (2 tools)
  registerGetPayeesTool(server);
  registerUpdatePayeeTool(server);
  toolCount += 2;

  // Payee Locations (2 tools)
  registerGetPayeeLocationsTool(server);
  registerGetPayeeLocationsByPayeeTool(server);
  toolCount += 2;

  // Months (2 tools)
  registerGetBudgetMonthsTool(server);
  registerGetBudgetMonthTool(server);
  toolCount += 2;

  // Transactions (5 tools)
  registerGetTransactionsTool(server); // Now supports accountId, categoryId, payeeId, month filters
  registerCreateTransactionTool(server);
  registerUpdateTransactionsTool(server);
  registerImportTransactionsTool(server);
  registerDeleteTransactionTool(server);
  toolCount += 5;

  // Scheduled Transactions (4 tools)
  registerGetScheduledTransactionsTool(server);
  registerCreateScheduledTransactionTool(server);
  registerUpdateScheduledTransactionTool(server);
  registerDeleteScheduledTransactionTool(server);
  toolCount += 4;

  // Staging Tools (6 tools)
  registerStageCategorizationTool(server);
  registerStageSplitTool(server);
  registerBulkCategorizeTool(server);
  registerReviewChangesTool(server);
  registerApplyChangesTool(server);
  registerClearChangesTool(server);
  toolCount += 6;

  // Cache Management Tools (5 tools)
  registerRefreshPayeeCacheTool(server);
  registerRefreshCategoryCacheTool(server);
  registerRefreshAccountCacheTool(server);
  registerRefreshSettingsCacheTool(server);
  registerClearAllCachesTool(server);
  toolCount += 5;

  return toolCount;
}
