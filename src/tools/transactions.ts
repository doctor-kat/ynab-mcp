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
import {
  resolveAccountId,
  resolveCategoryId,
  resolvePayeeId,
} from "./resolvers.js";
import { addFormattedAmounts } from "../utils/response-transformer.js";
import { parseAmount } from "../utils/currency-formatter.js";

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
    minAmount: z
      .union([z.string(), z.number()])
      .optional()
      .describe(
        "Only return transactions with amounts greater than or equal to this value (applied client-side). Accepts formatted currency strings (e.g., '$50.00') or raw numbers (e.g., 50). For expenses (negative amounts), use negative values (e.g., -50).",
      ),
    maxAmount: z
      .union([z.string(), z.number()])
      .optional()
      .describe(
        "Only return transactions with amounts less than or equal to this value (applied client-side). Accepts formatted currency strings (e.g., '$100.00') or raw numbers (e.g., 100). For expenses (negative amounts), use negative values (e.g., -100).",
      ),
  });

  server.registerTool(
    "ynab.getTransactions",
    {
      title: "Get transactions",
      description:
        "Get transactions with optional filters (account, category, payee, month, date, amount). Excludes pending transactions. ⚠️ Can return large payloads - use filters to reduce size: sinceDate (ISO format), sinceDaysAgo (e.g., 7 for last week), sinceRelative ('week'/'month'/'quarter'/'year'), minAmount/maxAmount (accepts '$50.00' or 50), limit (max results).",
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

        // Apply amount filtering if specified (client-side)
        let filteredTransactions = response.data.transactions as any;
        if (args.minAmount !== undefined || args.maxAmount !== undefined) {
          const currencyFormat = await getCurrencyFormat();

          const minMilliunits = args.minAmount !== undefined
            ? parseAmount(args.minAmount, currencyFormat)
            : undefined;
          const maxMilliunits = args.maxAmount !== undefined
            ? parseAmount(args.maxAmount, currencyFormat)
            : undefined;

          filteredTransactions = filteredTransactions.filter((txn: any) => {
            if (minMilliunits !== undefined && txn.amount < minMilliunits) return false;
            if (maxMilliunits !== undefined && txn.amount > maxMilliunits) return false;
            return true;
          });
        }

        // Apply client-side limit if specified (works with both TransactionDetail[] and HybridTransaction[])
        const { items, truncated, originalCount } = limitResults(
          filteredTransactions,
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
        if (args.minAmount !== undefined || args.maxAmount !== undefined) {
          const amountFilter = [];
          if (args.minAmount !== undefined) amountFilter.push(`minAmount: ${args.minAmount}`);
          if (args.maxAmount !== undefined) amountFilter.push(`maxAmount: ${args.maxAmount}`);
          context = `${context} (filtered by ${amountFilter.join(", ")})`;
        }

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
  const transactionSchemaBase = z
    .object({
      account_id: z.string().optional().describe("Account ID (use ynab.getAccounts to discover)"),
      account_name: z.string().optional().describe("Account name (alternative to account_id)"),
      date: z
        .string()
        .default(() => new Date().toISOString().split("T")[0])
        .describe("Transaction date (ISO format YYYY-MM-DD). Defaults to today."),
      amount: z.number().int().describe("Transaction amount in milliunits"),
      payee_id: z.string().optional().describe("Payee ID (use ynab.getPayees to discover)"),
      payee_name: z.string().optional().describe("Payee name (resolves to existing payee or creates new)"),
      category_id: z.string().optional().describe("Category ID (use ynab.getCategories to discover)"),
      category_name: z.string().optional().describe("Category name (alternative to category_id)"),
      memo: z.string().optional().describe("Transaction memo"),
      cleared: z
        .enum(["cleared", "uncleared", "reconciled"])
        .default("uncleared")
        .describe("Cleared status. Defaults to 'uncleared'."),
      approved: z.boolean().default(false).describe("Approved status. Defaults to false."),
      flag_color: z
        .enum(["red", "orange", "yellow", "green", "blue", "purple", ""])
        .optional()
        .describe("Flag color"),
      import_id: z.string().optional().describe("Import ID for deduplication"),
    })
    .passthrough();

  const transactionSchema = transactionSchemaBase
    .refine((data) => data.account_id || data.account_name, {
      message: "Either account_id or account_name must be provided",
    })
    .refine((data) => !(data.account_id && data.account_name), {
      message: "Cannot provide both account_id and account_name",
    })
    .refine((data) => !(data.category_id && data.category_name), {
      message: "Cannot provide both category_id and category_name",
    })
    .refine((data) => !(data.payee_id && data.payee_name), {
      message: "Cannot provide both payee_id and payee_name",
    });

  const schema = z.object({
    data: z
      .object({
        transaction: transactionSchemaBase.optional(),
        transactions: z.array(transactionSchemaBase).optional(),
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
      description: "Create one or more transactions. For future/recurring transactions, use createScheduledTransaction instead.",
      inputSchema: schema.shape,
    },
    async (args) => {
      if (isReadOnly()) {
        return readOnlyResult();
      }

      try {
        const budgetId = getActiveBudgetIdOrError();

        // Helper function to resolve names to IDs for a single transaction
        const resolveTransaction = async (txn: any) => {
          const resolved = { ...txn };

          // Resolve account_name to account_id
          if (txn.account_name) {
            const accountId = await resolveAccountId(budgetId, txn.account_name);
            if (!accountId) {
              throw new Error(`Account not found: ${txn.account_name}`);
            }
            resolved.account_id = accountId;
            delete resolved.account_name;
          }

          // Resolve category_name to category_id
          if (txn.category_name) {
            const categoryId = await resolveCategoryId(budgetId, txn.category_name);
            if (!categoryId) {
              throw new Error(`Category not found: ${txn.category_name}`);
            }
            resolved.category_id = categoryId;
            delete resolved.category_name;
          }

          // Resolve payee_name to payee_id (only if not creating new payee)
          // If payee_name doesn't resolve, keep it for YNAB to create new payee
          if (txn.payee_name && !txn.payee_id) {
            const payeeId = await resolvePayeeId(budgetId, txn.payee_name);
            if (payeeId) {
              resolved.payee_id = payeeId;
              delete resolved.payee_name;
            }
            // If not found, keep payee_name to create new payee
          }

          return resolved;
        };

        // Resolve names in transaction(s)
        let resolvedArgs = { ...args };
        if (args.data.transaction) {
          resolvedArgs.data = {
            transaction: await resolveTransaction(args.data.transaction),
          };
        } else if (args.data.transactions) {
          resolvedArgs.data = {
            transactions: await Promise.all(
              args.data.transactions.map(resolveTransaction),
            ),
          };
        }

        const response = await createTransaction({ budgetId, ...resolvedArgs });

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
            account_name: z.string().optional().describe("Account name (alternative to account_id)"),
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
            payee_name: z.string().optional().describe("Payee name (resolves to existing payee or creates new)"),
            category_id: z.string().optional().describe("Category ID"),
            category_name: z.string().optional().describe("Category name (alternative to category_id)"),
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
          .refine((data) => !(data.account_id && data.account_name), {
            message: "Cannot provide both account_id and account_name",
          })
          .refine((data) => !(data.category_id && data.category_name), {
            message: "Cannot provide both category_id and category_name",
          })
          .refine((data) => !(data.payee_id && data.payee_name), {
            message: "Cannot provide both payee_id and payee_name",
          }),
      )
      .min(1)
      .describe("Array of transactions to update"),
  });

  server.registerTool(
    "ynab.updateTransactions",
    {
      title: "Update transactions",
      description: "Update one or more transactions by ID or import_id.",
      inputSchema: schema.shape,
    },
    async (args) => {
      if (isReadOnly()) {
        return readOnlyResult();
      }

      try {
        const budgetId = getActiveBudgetIdOrError();

        // Helper function to resolve names to IDs for a single transaction
        const resolveTransaction = async (txn: any) => {
          const resolved = { ...txn };

          // Resolve account_name to account_id
          if (txn.account_name) {
            const accountId = await resolveAccountId(budgetId, txn.account_name);
            if (!accountId) {
              throw new Error(`Account not found: ${txn.account_name}`);
            }
            resolved.account_id = accountId;
            delete resolved.account_name;
          }

          // Resolve category_name to category_id
          if (txn.category_name) {
            const categoryId = await resolveCategoryId(budgetId, txn.category_name);
            if (!categoryId) {
              throw new Error(`Category not found: ${txn.category_name}`);
            }
            resolved.category_id = categoryId;
            delete resolved.category_name;
          }

          // Resolve payee_name to payee_id (only if not creating new payee)
          if (txn.payee_name && !txn.payee_id) {
            const payeeId = await resolvePayeeId(budgetId, txn.payee_name);
            if (payeeId) {
              resolved.payee_id = payeeId;
              delete resolved.payee_name;
            }
            // If not found, keep payee_name to create new payee
          }

          return resolved;
        };

        // Resolve names in all transactions
        const resolvedTransactions = await Promise.all(
          args.transactions.map(resolveTransaction),
        );

        const response = await updateTransactions({
          budgetId,
          transactions: resolvedTransactions,
        });

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
      description: "Import available transactions from all linked accounts.",
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
      description: "Delete a transaction.",
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
