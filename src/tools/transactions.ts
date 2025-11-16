import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getTransactions,
  createTransaction,
  updateTransactions,
  importTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getTransactionsByAccount,
  getTransactionsByCategory,
  getTransactionsByPayee,
  getTransactionsByMonth,
} from "../api/index.js";
import { successResult, errorResult, limitResults, getResultSizeWarning } from "./utils.js";

export function registerGetTransactionsTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
    sinceDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe(
        "Only return transactions on or after this date (ISO format YYYY-MM-DD). Recommended to prevent large payloads."
      ),
    type: z
      .enum(["uncategorized", "unapproved"])
      .optional()
      .describe("Filter by transaction type (helps reduce payload size)"),
    lastKnowledgeOfServer: z
      .number()
      .int()
      .optional()
      .describe("Server knowledge timestamp for delta requests"),
    limit: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        "Maximum number of transactions to return (applied client-side). Useful for preventing context overflow with local LLMs."
      ),
  });

  server.registerTool(
    "ynab.getTransactions",
    {
      title: "Get transactions",
      description:
        "Returns budget transactions, excluding any pending transactions. ⚠️ Can return large payloads - use sinceDate and limit parameters to reduce context size for local LLMs.",
      inputSchema: schema.shape,
    },
    async (args: any) => {
      try {
        const response = await getTransactions(args);

        // Apply client-side limit if specified
        const { items, truncated, originalCount } = limitResults(
          response.data.transactions,
          args.limit
        );

        const limitedResponse = {
          ...response,
          data: {
            ...response.data,
            transactions: items,
          },
        };

        // Generate warning message for large result sets
        const warning = getResultSizeWarning(
          items.length,
          truncated,
          truncated ? originalCount : undefined
        );

        const countDisplay = truncated
          ? `${items.length}/${originalCount} transaction(s)`
          : `${items.length} transaction(s)`;

        const message = [
          `Transactions for budget ${args.budgetId}: ${countDisplay}`,
          warning,
        ].filter(Boolean).join('\n');

        return successResult(message, limitedResponse);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}

export function registerCreateTransactionTool(server: McpServer): void {
  const transactionSchema = z.object({
    account_id: z.string().describe("Account ID"),
    date: z.string().describe("Transaction date (ISO format)"),
    amount: z.number().int().describe("Transaction amount in milliunits"),
    payee_id: z.string().optional().describe("Payee ID"),
    payee_name: z.string().optional().describe("Payee name (for new payee)"),
    category_id: z.string().optional().describe("Category ID"),
    memo: z.string().optional().describe("Transaction memo"),
    cleared: z
      .enum(["cleared", "uncleared", "reconciled"])
      .optional()
      .describe("Cleared status"),
    approved: z.boolean().optional().describe("Approved status"),
    flag_color: z
      .enum(["red", "orange", "yellow", "green", "blue", "purple", ""])
      .optional()
      .describe("Flag color"),
    import_id: z
      .string()
      .optional()
      .describe("Import ID for deduplication"),
  });

  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
    data: z
      .object({
        transaction: transactionSchema.passthrough().optional(),
        transactions: z.array(transactionSchema.passthrough()).optional(),
      })
      .refine((data) => !!data.transaction !== !!data.transactions, {
        message: "Provide either 'transaction' or 'transactions', not both",
      })
      .describe("Transaction data"),
  });

  server.registerTool(
    "ynab.createTransaction",
    {
      title: "Create transaction",
      description:
        "Creates a single transaction or multiple transactions. Scheduled transactions cannot be created on this endpoint.",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const response = await createTransaction(args);
        return successResult(
          `Transaction(s) created in budget ${args.budgetId}`,
          response
        );
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}

export function registerUpdateTransactionsTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
    transactions: z
      .array(
        z
          .object({
            id: z.string().optional().describe("Transaction ID"),
            import_id: z.string().optional().describe("Import ID"),
            account_id: z.string().optional().describe("Account ID"),
            date: z
              .string()
              .optional()
              .describe("Transaction date (ISO format)"),
            amount: z
              .number()
              .int()
              .optional()
              .describe("Transaction amount in milliunits"),
            payee_id: z.string().optional().describe("Payee ID"),
            category_id: z.string().optional().describe("Category ID"),
            memo: z.string().optional().describe("Transaction memo"),
            cleared: z
              .enum(["cleared", "uncleared", "reconciled"])
              .optional()
              .describe("Cleared status"),
            approved: z.boolean().optional().describe("Approved status"),
            flag_color: z
              .enum(["red", "orange", "yellow", "green", "blue", "purple", ""])
              .optional()
              .describe("Flag color"),
          })
          .passthrough()
      )
      .min(1)
      .describe("Array of transactions to update"),
  });

  server.registerTool(
    "ynab.updateTransactions",
    {
      title: "Update transactions",
      description: "Updates multiple transactions by id or import_id",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const response = await updateTransactions(args);
        return successResult(
          `${args.transactions.length} transaction(s) updated in budget ${args.budgetId}`,
          response
        );
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}

export function registerImportTransactionsTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
  });

  server.registerTool(
    "ynab.importTransactions",
    {
      title: "Import transactions",
      description:
        'Imports available transactions on all linked accounts. Equivalent to clicking "Import" on each account.',
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const response = await importTransactions(args);
        return successResult(
          `Transactions imported for budget ${args.budgetId}`,
          response
        );
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}

export function registerGetTransactionByIdTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
    transactionId: z.string().min(1).describe("The ID of the transaction"),
  });

  server.registerTool(
    "ynab.getTransactionById",
    {
      title: "Get transaction by ID",
      description: "Returns a single transaction",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const response = await getTransactionById(args);
        return successResult(
          `Transaction ${args.transactionId} in budget ${args.budgetId}`,
          response
        );
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}

export function registerUpdateTransactionTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
    transactionId: z.string().min(1).describe("The ID of the transaction"),
    transaction: z
      .object({
        account_id: z.string().optional().describe("Account ID"),
        date: z.string().optional().describe("Transaction date (ISO format)"),
        amount: z
          .number()
          .int()
          .optional()
          .describe("Transaction amount in milliunits"),
        payee_id: z.string().optional().describe("Payee ID"),
        payee_name: z.string().optional().describe("Payee name"),
        category_id: z.string().optional().describe("Category ID"),
        memo: z.string().optional().describe("Transaction memo"),
        cleared: z
          .enum(["cleared", "uncleared", "reconciled"])
          .optional()
          .describe("Cleared status"),
        approved: z.boolean().optional().describe("Approved status"),
        flag_color: z
          .enum(["red", "orange", "yellow", "green", "blue", "purple", ""])
          .optional()
          .describe("Flag color"),
        subtransactions: z
          .array(
            z
              .object({
                amount: z
                  .number()
                  .int()
                  .describe("Subtransaction amount in milliunits"),
                payee_id: z.string().optional().describe("Payee ID"),
                payee_name: z.string().optional().describe("Payee name"),
                category_id: z.string().optional().describe("Category ID"),
                memo: z
                  .string()
                  .optional()
                  .describe("Subtransaction memo"),
              })
              .passthrough()
          )
          .optional()
          .describe("Subtransactions for split transactions"),
      })
      .passthrough()
      .describe("Transaction update fields"),
  });

  server.registerTool(
    "ynab.updateTransaction",
    {
      title: "Update transaction",
      description: "Updates a single transaction",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const response = await updateTransaction(args);
        return successResult(
          `Transaction ${args.transactionId} updated in budget ${args.budgetId}`,
          response
        );
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}

export function registerDeleteTransactionTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
    transactionId: z.string().min(1).describe("The ID of the transaction"),
  });

  server.registerTool(
    "ynab.deleteTransaction",
    {
      title: "Delete transaction",
      description: "Deletes a transaction",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const response = await deleteTransaction(args);
        return successResult(
          `Transaction ${args.transactionId} deleted from budget ${args.budgetId}`,
          response
        );
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}

export function registerGetTransactionsByAccountTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
    accountId: z.string().min(1).describe("The ID of the account"),
    sinceDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe(
        "Only return transactions on or after this date (ISO format YYYY-MM-DD). Recommended to prevent large payloads."
      ),
    type: z
      .enum(["uncategorized", "unapproved"])
      .optional()
      .describe("Filter by transaction type (helps reduce payload size)"),
    lastKnowledgeOfServer: z
      .number()
      .int()
      .optional()
      .describe("Server knowledge timestamp for delta requests"),
    limit: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        "Maximum number of transactions to return (applied client-side). Useful for preventing context overflow with local LLMs."
      ),
  });

  server.registerTool(
    "ynab.getTransactionsByAccount",
    {
      title: "Get transactions by account",
      description:
        "Returns all transactions for a specified account, excluding any pending transactions. ⚠️ Can return large payloads - use sinceDate and limit parameters to reduce context size for local LLMs.",
      inputSchema: schema.shape,
    },
    async (args: any) => {
      try {
        const response = await getTransactionsByAccount(args);

        // Apply client-side limit if specified
        const { items, truncated, originalCount } = limitResults(
          response.data.transactions,
          args.limit
        );

        const limitedResponse = {
          ...response,
          data: {
            ...response.data,
            transactions: items,
          },
        };

        // Generate warning message for large result sets
        const warning = getResultSizeWarning(
          items.length,
          truncated,
          truncated ? originalCount : undefined
        );

        const countDisplay = truncated
          ? `${items.length}/${originalCount} transaction(s)`
          : `${items.length} transaction(s)`;

        const message = [
          `Transactions for account ${args.accountId} in budget ${args.budgetId}: ${countDisplay}`,
          warning,
        ].filter(Boolean).join('\n');

        return successResult(message, limitedResponse);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}

export function registerGetTransactionsByCategoryTool(
  server: McpServer
): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
    categoryId: z.string().min(1).describe("The ID of the category"),
    sinceDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe(
        "Only return transactions on or after this date (ISO format YYYY-MM-DD). Recommended to prevent large payloads."
      ),
    type: z
      .enum(["uncategorized", "unapproved"])
      .optional()
      .describe("Filter by transaction type (helps reduce payload size)"),
    lastKnowledgeOfServer: z
      .number()
      .int()
      .optional()
      .describe("Server knowledge timestamp for delta requests"),
    limit: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        "Maximum number of transactions to return (applied client-side). Useful for preventing context overflow with local LLMs."
      ),
  });

  server.registerTool(
    "ynab.getTransactionsByCategory",
    {
      title: "Get transactions by category",
      description: "Returns all transactions for a specified category. ⚠️ Can return large payloads - use sinceDate and limit parameters to reduce context size for local LLMs.",
      inputSchema: schema.shape,
    },
    async (args: any) => {
      try {
        const response = await getTransactionsByCategory(args);

        // Apply client-side limit if specified
        const { items, truncated, originalCount } = limitResults(
          response.data.transactions,
          args.limit
        );

        const limitedResponse = {
          ...response,
          data: {
            ...response.data,
            transactions: items,
          },
        };

        // Generate warning message for large result sets
        const warning = getResultSizeWarning(
          items.length,
          truncated,
          truncated ? originalCount : undefined
        );

        const countDisplay = truncated
          ? `${items.length}/${originalCount} transaction(s)`
          : `${items.length} transaction(s)`;

        const message = [
          `Transactions for category ${args.categoryId} in budget ${args.budgetId}: ${countDisplay}`,
          warning,
        ].filter(Boolean).join('\n');

        return successResult(message, limitedResponse);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}

export function registerGetTransactionsByPayeeTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
    payeeId: z.string().min(1).describe("The ID of the payee"),
    sinceDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe(
        "Only return transactions on or after this date (ISO format YYYY-MM-DD). Recommended to prevent large payloads."
      ),
    type: z
      .enum(["uncategorized", "unapproved"])
      .optional()
      .describe("Filter by transaction type (helps reduce payload size)"),
    lastKnowledgeOfServer: z
      .number()
      .int()
      .optional()
      .describe("Server knowledge timestamp for delta requests"),
    limit: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        "Maximum number of transactions to return (applied client-side). Useful for preventing context overflow with local LLMs."
      ),
  });

  server.registerTool(
    "ynab.getTransactionsByPayee",
    {
      title: "Get transactions by payee",
      description: "Returns all transactions for a specified payee. ⚠️ Can return large payloads - use sinceDate and limit parameters to reduce context size for local LLMs.",
      inputSchema: schema.shape,
    },
    async (args: any) => {
      try {
        const response = await getTransactionsByPayee(args);

        // Apply client-side limit if specified
        const { items, truncated, originalCount } = limitResults(
          response.data.transactions,
          args.limit
        );

        const limitedResponse = {
          ...response,
          data: {
            ...response.data,
            transactions: items,
          },
        };

        // Generate warning message for large result sets
        const warning = getResultSizeWarning(
          items.length,
          truncated,
          truncated ? originalCount : undefined
        );

        const countDisplay = truncated
          ? `${items.length}/${originalCount} transaction(s)`
          : `${items.length} transaction(s)`;

        const message = [
          `Transactions for payee ${args.payeeId} in budget ${args.budgetId}: ${countDisplay}`,
          warning,
        ].filter(Boolean).join('\n');

        return successResult(message, limitedResponse);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}

export function registerGetTransactionsByMonthTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
    month: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe("The budget month in ISO format (YYYY-MM-DD)"),
    sinceDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe(
        "Only return transactions on or after this date (ISO format YYYY-MM-DD). Recommended to prevent large payloads."
      ),
    type: z
      .enum(["uncategorized", "unapproved"])
      .optional()
      .describe("Filter by transaction type (helps reduce payload size)"),
    limit: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        "Maximum number of transactions to return (applied client-side). Useful for preventing context overflow with local LLMs."
      ),
  });

  server.registerTool(
    "ynab.getTransactionsByMonth",
    {
      title: "Get transactions by month",
      description: "Returns all transactions for a specified month. ⚠️ Can return large payloads for busy months - use sinceDate and limit parameters to reduce context size for local LLMs.",
      inputSchema: schema.shape,
    },
    async (args: any) => {
      try {
        const response = await getTransactionsByMonth(args);

        // Apply client-side limit if specified
        const { items, truncated, originalCount } = limitResults(
          response.data.transactions,
          args.limit
        );

        const limitedResponse = {
          ...response,
          data: {
            ...response.data,
            transactions: items,
          },
        };

        // Generate warning message for large result sets
        const warning = getResultSizeWarning(
          items.length,
          truncated,
          truncated ? originalCount : undefined
        );

        const countDisplay = truncated
          ? `${items.length}/${originalCount} transaction(s)`
          : `${items.length} transaction(s)`;

        const message = [
          `Transactions for month ${args.month} in budget ${args.budgetId}: ${countDisplay}`,
          warning,
        ].filter(Boolean).join('\n');

        return successResult(message, limitedResponse);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
