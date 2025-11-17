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
  getActiveBudgetIdOrError,
  getCurrencyFormat,
  getResultSizeWarning,
  isReadOnly,
  limitResults,
  readOnlyResult,
  resolveDate,
  successResult,
} from "./utils.js";
import { addFormattedAmounts } from "../utils/response-transformer.js";

export function registerGetTransactionsTool(server: McpServer): void {
  const schema = z.object({
    accountId: z.string().optional().describe("Filter by account ID (use ynab.getAccounts to discover)"),
    categoryId: z.string().optional().describe("Filter by category ID (use ynab.getCategories to discover)"),
    payeeId: z.string().optional().describe("Filter by payee ID (use ynab.getPayees to discover)"),
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
    sinceDaysAgo: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        "Only return transactions from the last N days (convenience parameter, alternative to sinceDate). Example: 7 for last week, 30 for last month.",
      ),
    sinceRelative: z
      .enum(["week", "month", "quarter", "year"])
      .optional()
      .describe(
        "Only return transactions from a relative time period (convenience parameter, alternative to sinceDate). Options: week (7 days), month (30 days), quarter (90 days), year (365 days).",
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
        "Retrieve and return transactions for the active budget with optional filters for account, category, payee, or month. Excludes pending transactions. ⚠️ Can return large payloads - use date filters (sinceDate/sinceDaysAgo/sinceRelative) and limit to reduce context size. Date convenience: sinceDaysAgo: 7 (last week), sinceRelative: 'month' (last 30 days).",
      inputSchema: schema.shape,
    },
    async (args: any) => {
      try {
        const budgetId = getActiveBudgetIdOrError();

        // Resolve date parameters to ISO format
        const sinceDate = resolveDate({
          sinceDate: args.sinceDate,
          sinceDaysAgo: args.sinceDaysAgo,
          sinceRelative: args.sinceRelative,
        });

        // Use specialized endpoint if specific filter is provided
        let response: any;
        if (args.accountId) {
          response = await getTransactionsByAccount({
            budgetId,
            accountId: args.accountId,
            sinceDate,
            type: args.type,
            lastKnowledgeOfServer: args.lastKnowledgeOfServer,
          });
        } else if (args.categoryId) {
          response = await getTransactionsByCategory({
            budgetId,
            categoryId: args.categoryId,
            sinceDate,
            type: args.type,
            lastKnowledgeOfServer: args.lastKnowledgeOfServer,
          });
        } else if (args.payeeId) {
          response = await getTransactionsByPayee({
            budgetId,
            payeeId: args.payeeId,
            sinceDate,
            type: args.type,
            lastKnowledgeOfServer: args.lastKnowledgeOfServer,
          });
        } else if (args.month) {
          response = await getTransactionsByMonth({
            budgetId,
            month: args.month,
            sinceDate,
            type: args.type,
          });
        } else {
          response = await getTransactions({
            budgetId,
            sinceDate,
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
        let context = `budget ${budgetId}`;
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

        // Add formatted currency amounts
        const currencyFormat = await getCurrencyFormat();
        const formattedResponse = addFormattedAmounts(limitedResponse, currencyFormat);

        return successResult(message, formattedResponse);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

export function registerCreateTransactionTool(server: McpServer): void {
  const transactionSchema = z.object({
    account_id: z.string().describe("Account ID (use ynab.getAccounts to discover)"),
    date: z.string().describe("Transaction date (ISO format)"),
    amount: z.number().int().describe("Transaction amount in milliunits"),
    payee_id: z.string().optional().describe("Payee ID (use ynab.getPayees to discover)"),
    payee_name: z.string().optional().describe("Payee name (for new payee)"),
    category_id: z.string().optional().describe("Category ID (use ynab.getCategories to discover)"),
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
        "Create a single transaction or multiple transactions in the active budget. Scheduled transactions cannot be created on this endpoint.",
      inputSchema: schema.shape,
    },
    async (args) => {
      if (isReadOnly()) {
        return readOnlyResult();
      }

      try {
        const budgetId = getActiveBudgetIdOrError();
        const response = await createTransaction({ budgetId, ...args });

        // Add formatted currency amounts
        const currencyFormat = await getCurrencyFormat();
        const formattedResponse = addFormattedAmounts(response, currencyFormat);

        return successResult(
          `Transaction(s) created in budget ${budgetId}`,
          formattedResponse,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

export function registerUpdateTransactionsTool(server: McpServer): void {
  const schema = z.object({
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
      description: "Update multiple transactions by id or import_id in the active budget.",
      inputSchema: schema.shape,
    },
    async (args) => {
      if (isReadOnly()) {
        return readOnlyResult();
      }

      try {
        const budgetId = getActiveBudgetIdOrError();
        const response = await updateTransactions({ budgetId, ...args });

        // Add formatted currency amounts
        const currencyFormat = await getCurrencyFormat();
        const formattedResponse = addFormattedAmounts(response, currencyFormat);

        return successResult(
          `${args.transactions.length} transaction(s) updated in budget ${budgetId}`,
          formattedResponse,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

export function registerImportTransactionsTool(server: McpServer): void {
  const schema = z.object({});

  server.registerTool(
    "ynab.importTransactions",
    {
      title: "Import transactions",
      description:
        'Import available transactions on all linked accounts for the active budget. Equivalent to clicking "Import" on each account.',
      inputSchema: schema.shape,
    },
    async () => {
      if (isReadOnly()) {
        return readOnlyResult();
      }

      try {
        const budgetId = getActiveBudgetIdOrError();
        const response = await importTransactions({ budgetId });

        // Add formatted currency amounts
        const currencyFormat = await getCurrencyFormat();
        const formattedResponse = addFormattedAmounts(response, currencyFormat);

        return successResult(
          `Transactions imported for budget ${budgetId}`,
          formattedResponse,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

export function registerDeleteTransactionTool(server: McpServer): void {
  const schema = z.object({
    transactionId: z.string().min(1).describe("The ID of the transaction (use ynab.getTransactions to discover)"),
  });

  server.registerTool(
    "ynab.deleteTransaction",
    {
      title: "Delete transaction",
      description: "Delete a transaction from the active budget.",
      inputSchema: schema.shape,
    },
    async (args) => {
      if (isReadOnly()) {
        return readOnlyResult();
      }

      try {
        const budgetId = getActiveBudgetIdOrError();
        const response = await deleteTransaction({ budgetId, ...args });

        // Add formatted currency amounts
        const currencyFormat = await getCurrencyFormat();
        const formattedResponse = addFormattedAmounts(response, currencyFormat);

        return successResult(
          `Transaction ${args.transactionId} deleted from budget ${budgetId}`,
          formattedResponse,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
