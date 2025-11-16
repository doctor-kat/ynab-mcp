import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  createScheduledTransaction,
  deleteScheduledTransaction,
  getScheduledTransactions,
  updateScheduledTransaction,
} from "../api/index.js";
import { errorResult, isReadOnly, readOnlyResult, successResult } from "./utils.js";

export function registerGetScheduledTransactionsTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
    lastKnowledgeOfServer: z
      .number()
      .int()
      .optional()
      .describe("Server knowledge timestamp for delta requests"),
  });

  server.registerTool(
    "ynab.getScheduledTransactions",
    {
      title: "Get scheduled transactions",
      description: "Retrieve and return all scheduled transactions. Use ynab.getBudgetContext to get your budgetId.",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const response = await getScheduledTransactions(args);
        return successResult(
          `Scheduled transactions for budget ${args.budgetId}`,
          response,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

export function registerCreateScheduledTransactionTool(
  server: McpServer,
): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
    scheduledTransaction: z
      .object({
        account_id: z.string().describe("Account ID"),
        date_first: z.string().describe("First occurrence date (ISO format)"),
        date_next: z.string().describe("Next occurrence date (ISO format)"),
        frequency: z
          .enum([
            "never",
            "daily",
            "weekly",
            "everyOtherWeek",
            "twiceAMonth",
            "every4Weeks",
            "monthly",
            "everyOtherMonth",
            "every3Months",
            "every4Months",
            "twiceAYear",
            "yearly",
            "everyOtherYear",
          ])
          .describe("Frequency of scheduled transaction"),
        amount: z.number().int().describe("Transaction amount in milliunits"),
        payee_id: z.string().optional().describe("Payee ID"),
        category_id: z.string().optional().describe("Category ID"),
        memo: z.string().optional().describe("Transaction memo"),
        flag_color: z
          .enum(["red", "orange", "yellow", "green", "blue", "purple", ""])
          .optional()
          .describe("Flag color"),
      })
      .passthrough()
      .describe("Scheduled transaction details"),
  });

  server.registerTool(
    "ynab.createScheduledTransaction",
    {
      title: "Create scheduled transaction",
      description:
        "Create a single scheduled transaction (a transaction with a future date). Requires budgetId (use ynab.getBudgetContext to get your budgetId) and account_id (use ynab.getAccounts if needed). For category_id and payee_id, use ynab.getCategories or ynab.getPayees.",
      inputSchema: schema.shape,
    },
    async (args) => {
      if (isReadOnly()) {
        return readOnlyResult();
      }

      try {
        const response = await createScheduledTransaction(args);
        return successResult(
          `Scheduled transaction created in budget ${args.budgetId}`,
          response,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

export function registerUpdateScheduledTransactionTool(
  server: McpServer,
): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
    scheduledTransactionId: z
      .string()
      .min(1)
      .describe("The ID of the scheduled transaction"),
    scheduledTransaction: z
      .object({
        account_id: z.string().optional().describe("Account ID"),
        date_first: z
          .string()
          .optional()
          .describe("First occurrence date (ISO format)"),
        date_next: z
          .string()
          .optional()
          .describe("Next occurrence date (ISO format)"),
        frequency: z
          .enum([
            "never",
            "daily",
            "weekly",
            "everyOtherWeek",
            "twiceAMonth",
            "every4Weeks",
            "monthly",
            "everyOtherMonth",
            "every3Months",
            "every4Months",
            "twiceAYear",
            "yearly",
            "everyOtherYear",
          ])
          .optional()
          .describe("Frequency of scheduled transaction"),
        amount: z
          .number()
          .int()
          .optional()
          .describe("Transaction amount in milliunits"),
        payee_id: z.string().optional().describe("Payee ID"),
        category_id: z.string().optional().describe("Category ID"),
        memo: z.string().optional().describe("Transaction memo"),
        flag_color: z
          .enum(["red", "orange", "yellow", "green", "blue", "purple", ""])
          .optional()
          .describe("Flag color"),
      })
      .passthrough()
      .describe("Scheduled transaction update fields"),
  });

  server.registerTool(
    "ynab.updateScheduledTransaction",
    {
      title: "Update scheduled transaction",
      description: "Update a single scheduled transaction. Requires budgetId (use ynab.getBudgetContext to get your budgetId) and scheduledTransactionId (use ynab.getScheduledTransactions if needed).",
      inputSchema: schema.shape,
    },
    async (args) => {
      if (isReadOnly()) {
        return readOnlyResult();
      }

      try {
        const response = await updateScheduledTransaction(args);
        return successResult(
          `Scheduled transaction ${args.scheduledTransactionId} updated in budget ${args.budgetId}`,
          response,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

export function registerDeleteScheduledTransactionTool(
  server: McpServer,
): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
    scheduledTransactionId: z
      .string()
      .min(1)
      .describe("The ID of the scheduled transaction"),
  });

  server.registerTool(
    "ynab.deleteScheduledTransaction",
    {
      title: "Delete scheduled transaction",
      description: "Delete a scheduled transaction. Requires budgetId (use ynab.getBudgetContext to get your budgetId) and scheduledTransactionId (use ynab.getScheduledTransactions if needed).",
      inputSchema: schema.shape,
    },
    async (args) => {
      if (isReadOnly()) {
        return readOnlyResult();
      }

      try {
        const response = await deleteScheduledTransaction(args);
        return successResult(
          `Scheduled transaction ${args.scheduledTransactionId} deleted from budget ${args.budgetId}`,
          response,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
