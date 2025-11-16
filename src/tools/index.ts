import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Import all register functions
import { registerGetUserTool } from "./user.js";
import {
  registerGetBudgetsTool,
  registerGetBudgetByIdTool,
  registerGetBudgetSettingsByIdTool,
} from "./budgets.js";
import {
  registerGetAccountsTool,
  registerCreateAccountTool,
  registerGetAccountByIdTool,
} from "./accounts.js";
import {
  registerGetCategoriesTool,
  registerGetCategoryByIdTool,
  registerUpdateCategoryTool,
  registerGetMonthCategoryByIdTool,
  registerUpdateMonthCategoryTool,
} from "./categories.js";
import {
  registerGetPayeesTool,
  registerGetPayeeByIdTool,
  registerUpdatePayeeTool,
} from "./payees.js";
import {
  registerGetPayeeLocationsTool,
  registerGetPayeeLocationByIdTool,
  registerGetPayeeLocationsByPayeeTool,
} from "./payee-locations.js";
import {
  registerGetBudgetMonthsTool,
  registerGetBudgetMonthTool,
} from "./months.js";
import {
  registerGetTransactionsTool,
  registerCreateTransactionTool,
  registerUpdateTransactionsTool,
  registerImportTransactionsTool,
  registerGetTransactionByIdTool,
  registerUpdateTransactionTool,
  registerDeleteTransactionTool,
  registerGetTransactionsByAccountTool,
  registerGetTransactionsByCategoryTool,
  registerGetTransactionsByPayeeTool,
  registerGetTransactionsByMonthTool,
} from "./transactions.js";
import {
  registerGetScheduledTransactionsTool,
  registerCreateScheduledTransactionTool,
  registerGetScheduledTransactionByIdTool,
  registerUpdateScheduledTransactionTool,
  registerDeleteScheduledTransactionTool,
} from "./scheduled-transactions.js";

export interface ToolRegistrationContext {
  server: McpServer;
}

export function registerTools({ server }: ToolRegistrationContext): void {
  // User (1 tool)
  registerGetUserTool(server);

  // Budgets (3 tools)
  registerGetBudgetsTool(server);
  registerGetBudgetByIdTool(server);
  registerGetBudgetSettingsByIdTool(server);

  // Accounts (3 tools)
  registerGetAccountsTool(server);
  registerCreateAccountTool(server);
  registerGetAccountByIdTool(server);

  // Categories (5 tools)
  registerGetCategoriesTool(server);
  registerGetCategoryByIdTool(server);
  registerUpdateCategoryTool(server);
  registerGetMonthCategoryByIdTool(server);
  registerUpdateMonthCategoryTool(server);

  // Payees (3 tools)
  registerGetPayeesTool(server);
  registerGetPayeeByIdTool(server);
  registerUpdatePayeeTool(server);

  // Payee Locations (3 tools)
  registerGetPayeeLocationsTool(server);
  registerGetPayeeLocationByIdTool(server);
  registerGetPayeeLocationsByPayeeTool(server);

  // Months (2 tools)
  registerGetBudgetMonthsTool(server);
  registerGetBudgetMonthTool(server);

  // Transactions (11 tools)
  registerGetTransactionsTool(server);
  registerCreateTransactionTool(server);
  registerUpdateTransactionsTool(server);
  registerImportTransactionsTool(server);
  registerGetTransactionByIdTool(server);
  registerUpdateTransactionTool(server);
  registerDeleteTransactionTool(server);
  registerGetTransactionsByAccountTool(server);
  registerGetTransactionsByCategoryTool(server);
  registerGetTransactionsByPayeeTool(server);
  registerGetTransactionsByMonthTool(server);

  // Scheduled Transactions (5 tools)
  registerGetScheduledTransactionsTool(server);
  registerCreateScheduledTransactionTool(server);
  registerGetScheduledTransactionByIdTool(server);
  registerUpdateScheduledTransactionTool(server);
  registerDeleteScheduledTransactionTool(server);
}
