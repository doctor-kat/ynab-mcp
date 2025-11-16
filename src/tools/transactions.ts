import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  createTransaction,
  deleteTransaction,
  getTransactions,
  getTransactionsByAccount,
  getTransactionsByCategory,
  getTransactionsByMonth,
  getTransactionsByPayee,
  importTransactions,
  updateTransactions,
} from "../api/index.js";
import {
  errorResult,
  getResultSizeWarning,
  isReadOnly,
  limitResults,
  readOnlyResult,
  successResult,
} from "./utils.js";

export function registerGetTransactionsTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
    accountId: z.string().optional().describe("Filter by account ID"),
    categoryId: z.string().optional().describe("Filter by category ID"),
    payeeId: z.string().optional().describe("Filter by payee ID"),
    month: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Filter by budget month (ISO format YYYY-MM-DD)"),
    sinceDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe(
        "Only return transactions on or after this date (ISO format YYYY-MM-DD). Recommended to prevent large payloads.",
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
        "Maximum number of transactions to return (applied client-side). Useful for preventing context overflow with local LLMs.",
      ),
  });

  server.registerTool(
    "ynab.getTransactions",
    {
      title: "Get transactions",
      description:
        "Returns budget transactions with optional filters for account, category, payee, or month. Excludes pending transactions. ⚠️ Can return large payloads - use sinceDate and limit parameters to reduce context size for local LLMs.",
      inputSchema: schema.shape,
    },
    async (args: any) => {
      try {
        // Use specialized endpoint if specific filter is provided
        let response: any;
        if (args.accountId) {
          response = await getTransactionsByAccount({
            budgetId: args.budgetId,
            accountId: args.accountId,
            sinceDate: args.sinceDate,
            type: args.type,
            lastKnowledgeOfServer: args.lastKnowledgeOfServer,
          });
        } else if (args.categoryId) {
          response = await getTransactionsByCategory({
            budgetId: args.budgetId,
            categoryId: args.categoryId,
            sinceDate: args.sinceDate,
            type: args.type,
            lastKnowledgeOfServer: args.lastKnowledgeOfServer,
          });
        } else if (args.payeeId) {
          response = await getTransactionsByPayee({
            budgetId: args.budgetId,
            payeeId: args.payeeId,
            sinceDate: args.sinceDate,
            type: args.type,
            lastKnowledgeOfServer: args.lastKnowledgeOfServer,
          });
        } else if (args.month) {
          response = await getTransactionsByMonth({
            budgetId: args.budgetId,
            month: args.month,
            sinceDate: args.sinceDate,
            type: args.type,
          });
        } else {
          response = await getTransactions({
            budgetId: args.budgetId,
            sinceDate: args.sinceDate,
            type: args.type,
            lastKnowledgeOfServer: args.lastKnowledgeOfServer,
          });
        }

        // Apply client-side limit if specified (works with both TransactionDetail[] and HybridTransaction[])
        const { items, truncated, originalCount } = limitResults(
          response.data.transactions as any,
          args.limit,
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
          truncated ? originalCount : undefined,
        );

        const countDisplay = truncated
          ? `${items.length}/${originalCount} transaction(s)`
          : `${items.length} transaction(s)`;

        // Build context-specific message
        let context = `budget ${args.budgetId}`;
        if (args.accountId) context = `account ${args.accountId} in ${context}`;
        if (args.categoryId)
          context = `category ${args.categoryId} in ${context}`;
        if (args.payeeId) context = `payee ${args.payeeId} in ${context}`;
        if (args.month) context = `month ${args.month} in ${context}`;

        const message = [
          `Transactions for ${context}: ${countDisplay}`,
          warning,
        ]
          .filter(Boolean)
          .join("\n");

        return successResult(message, limitedResponse);
      } catch (error) {
        return errorResult(error);
      }
    },
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
    import_id: z.string().optional().describe("Import ID for deduplication"),
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
      if (isReadOnly()) {
        return readOnlyResult();
      }

      try {
        const response = await createTransaction(args);
        return successResult(
          `Transaction(s) created in budget ${args.budgetId}`,
          response,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
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
          .passthrough(),
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
      if (isReadOnly()) {
        return readOnlyResult();
      }

      try {
        const response = await updateTransactions(args);
        return successResult(
          `${args.transactions.length} transaction(s) updated in budget ${args.budgetId}`,
          response,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
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
      if (isReadOnly()) {
        return readOnlyResult();
      }

      try {
        const response = await importTransactions(args);
        return successResult(
          `Transactions imported for budget ${args.budgetId}`,
          response,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
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
      if (isReadOnly()) {
        return readOnlyResult();
      }

      try {
        const response = await deleteTransaction(args);
        return successResult(
          `Transaction ${args.transactionId} deleted from budget ${args.budgetId}`,
          response,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
