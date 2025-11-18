import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  createScheduledTransaction,
  deleteScheduledTransaction,
  getScheduledTransactions,
  updateScheduledTransaction,
} from "../api/index.js";
import { errorResult, isReadOnly, readOnlyResult, successResult, getActiveBudgetIdOrError, getCurrencyFormat, buildMetadata } from "./utils.js";
import { addFormattedAmounts } from "../utils/response-transformer.js";
import {
  resolveAccountId,
  resolveCategoryId,
  resolvePayeeId,
} from "./resolvers.js";

export function registerGetScheduledTransactionsTool(server: McpServer): void {
  const schema = z.object({
    lastKnowledgeOfServer: z
      .number()
      .int()
      .optional()
      .describe("Server knowledge timestamp for delta requests"),
    includeMilliunits: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Include original milliunit amounts in response (default: false). When false, only formatted currency strings are returned (40% token reduction). Set to true when you need milliunits for transaction splitting or precise calculations.",
      ),
  });

  server.registerTool(
    "ynab.getScheduledTransactions",
    {
      title: "Get scheduled transactions",
      description: "Get all scheduled (recurring/future) transactions.",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const budgetId = getActiveBudgetIdOrError();
        const response = await getScheduledTransactions({ budgetId, ...args });

        const scheduledTransactions = response.data.scheduled_transactions;

        // Build metadata
        const metadata = buildMetadata({
          count: scheduledTransactions.length,
          cached: false,
        });

        const flatResponse = {
          scheduled_transactions: scheduledTransactions,
          metadata,
        };

        // Add formatted currency amounts
        const currencyFormat = await getCurrencyFormat();
        const formattedResponse = addFormattedAmounts(
          flatResponse,
          currencyFormat,
          args.includeMilliunits ?? false,
        );

        return successResult(
          `${metadata.count} scheduled transaction(s) retrieved`,
          formattedResponse,
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
    scheduledTransaction: z
      .object({
        account_id: z.string().optional().describe("Account ID. UUID format. Takes priority over account_name."),
        account_name: z.string().optional().describe("Account name. Used only if account_id not provided. Resolves to existing account or throws error."),
        date_first: z
          .string()
          .default(() => new Date().toISOString().split("T")[0])
          .describe("First occurrence date in ISO format (YYYY-MM-DD). Example: '2025-01-15'. Defaults to today."),
        date_next: z
          .string()
          .default(() => new Date().toISOString().split("T")[0])
          .describe("Next occurrence date in ISO format (YYYY-MM-DD). Example: '2025-02-15'. Defaults to today."),
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
          .describe("Frequency of scheduled transaction. Valid values: 'never', 'daily', 'weekly', 'everyOtherWeek', 'twiceAMonth', 'every4Weeks', 'monthly', 'everyOtherMonth', 'every3Months', 'every4Months', 'twiceAYear', 'yearly', 'everyOtherYear'."),
        amount: z.number().int().describe("Transaction amount in milliunits (1000 milliunits = $1.00). Negative for expenses, positive for income. Example: -50000 for -$50.00"),
        payee_id: z.string().optional().describe("Payee ID. UUID format. Takes priority over payee_name."),
        payee_name: z.string().optional().describe("Payee name. Used only if payee_id not provided. Resolves to existing payee or creates new."),
        category_id: z.string().optional().describe("Category ID. UUID format. Takes priority over category_name."),
        category_name: z.string().optional().describe("Category name. Used only if category_id not provided. Resolves to existing category or throws error."),
        memo: z.string().optional().describe("Transaction memo"),
        flag_color: z
          .enum(["red", "orange", "yellow", "green", "blue", "purple", ""])
          .optional()
          .describe("Flag color. Valid values: 'red', 'orange', 'yellow', 'green', 'blue', 'purple', '' (empty string for no flag)."),
      })
      .passthrough()
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
      })
      .describe("Scheduled transaction details"),
    includeMilliunits: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Include original milliunit amounts in response (default: false). When false, only formatted currency strings are returned (40% token reduction). Set to true when you need milliunits for transaction splitting or precise calculations.",
      ),
  });

  server.registerTool(
    "ynab.createScheduledTransaction",
    {
      title: "Create scheduled transaction",
      description: "Create a scheduled (recurring/future) transaction. date_first cannot be in the past. Use frequency='never' for one-time scheduled transactions.",
      inputSchema: schema.shape,
    },
    async (args) => {
      if (isReadOnly()) {
        return readOnlyResult();
      }

      try {
        const budgetId = getActiveBudgetIdOrError();

        // Resolve names to IDs
        const resolved: any = { ...args.scheduledTransaction };

        if (args.scheduledTransaction.account_name) {
          const accountId = await resolveAccountId(budgetId, args.scheduledTransaction.account_name);
          if (!accountId) {
            return errorResult(new Error(`Account not found: ${args.scheduledTransaction.account_name}`));
          }
          resolved.account_id = accountId;
          delete resolved.account_name;
        }

        // Ensure account_id is present after resolution
        if (!resolved.account_id) {
          return errorResult(new Error("account_id is required"));
        }

        if (args.scheduledTransaction.category_name) {
          const categoryId = await resolveCategoryId(budgetId, args.scheduledTransaction.category_name);
          if (!categoryId) {
            return errorResult(new Error(`Category not found: ${args.scheduledTransaction.category_name}`));
          }
          resolved.category_id = categoryId;
          delete resolved.category_name;
        }

        if (args.scheduledTransaction.payee_name && !args.scheduledTransaction.payee_id) {
          const payeeId = await resolvePayeeId(budgetId, args.scheduledTransaction.payee_name);
          if (payeeId) {
            resolved.payee_id = payeeId;
            delete resolved.payee_name;
          }
          // If not found, keep payee_name to create new payee
        }

        const response = await createScheduledTransaction({
          budgetId,
          scheduledTransaction: resolved,
        });

        // Add formatted currency amounts
        const currencyFormat = await getCurrencyFormat();
        const formattedResponse = addFormattedAmounts(
          response,
          currencyFormat,
          args.includeMilliunits ?? false,
        );

        return successResult(
          `Scheduled transaction created in budget ${budgetId}`,
          formattedResponse,
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
    scheduledTransactionId: z
      .string()
      .min(1)
      .describe("Scheduled transaction ID. UUID format."),
    scheduledTransaction: z
      .object({
        account_id: z.string().optional().describe("Account ID. UUID format. Takes priority over account_name."),
        account_name: z.string().optional().describe("Account name. Used only if account_id not provided. Resolves to existing account or throws error."),
        date_first: z
          .string()
          .optional()
          .describe("First occurrence date in ISO format (YYYY-MM-DD). Example: '2025-01-15'."),
        date_next: z
          .string()
          .optional()
          .describe("Next occurrence date in ISO format (YYYY-MM-DD). Example: '2025-02-15'."),
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
          .describe("Frequency of scheduled transaction. Valid values: 'never', 'daily', 'weekly', 'everyOtherWeek', 'twiceAMonth', 'every4Weeks', 'monthly', 'everyOtherMonth', 'every3Months', 'every4Months', 'twiceAYear', 'yearly', 'everyOtherYear'."),
        amount: z
          .number()
          .int()
          .optional()
          .describe("Transaction amount in milliunits (1000 milliunits = $1.00). Negative for expenses, positive for income. Example: -50000 for -$50.00"),
        payee_id: z.string().optional().describe("Payee ID. UUID format. Takes priority over payee_name."),
        payee_name: z.string().optional().describe("Payee name. Used only if payee_id not provided. Resolves to existing payee or creates new."),
        category_id: z.string().optional().describe("Category ID. UUID format. Takes priority over category_name."),
        category_name: z.string().optional().describe("Category name. Used only if category_id not provided. Resolves to existing category or throws error."),
        memo: z.string().optional().describe("Transaction memo"),
        flag_color: z
          .enum(["red", "orange", "yellow", "green", "blue", "purple", ""])
          .optional()
          .describe("Flag color. Valid values: 'red', 'orange', 'yellow', 'green', 'blue', 'purple', '' (empty string for no flag)."),
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
      })
      .describe("Scheduled transaction update fields"),
    includeMilliunits: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Include original milliunit amounts in response (default: false). When false, only formatted currency strings are returned (40% token reduction). Set to true when you need milliunits for transaction splitting or precise calculations.",
      ),
  });

  server.registerTool(
    "ynab.updateScheduledTransaction",
    {
      title: "Update scheduled transaction",
      description: "Update a scheduled transaction.",
      inputSchema: schema.shape,
    },
    async (args) => {
      if (isReadOnly()) {
        return readOnlyResult();
      }

      try {
        const budgetId = getActiveBudgetIdOrError();

        // Resolve names to IDs
        const resolved: any = { ...args.scheduledTransaction };

        if (args.scheduledTransaction.account_name) {
          const accountId = await resolveAccountId(budgetId, args.scheduledTransaction.account_name);
          if (!accountId) {
            return errorResult(new Error(`Account not found: ${args.scheduledTransaction.account_name}`));
          }
          resolved.account_id = accountId;
          delete resolved.account_name;
        }

        if (args.scheduledTransaction.category_name) {
          const categoryId = await resolveCategoryId(budgetId, args.scheduledTransaction.category_name);
          if (!categoryId) {
            return errorResult(new Error(`Category not found: ${args.scheduledTransaction.category_name}`));
          }
          resolved.category_id = categoryId;
          delete resolved.category_name;
        }

        if (args.scheduledTransaction.payee_name && !args.scheduledTransaction.payee_id) {
          const payeeId = await resolvePayeeId(budgetId, args.scheduledTransaction.payee_name);
          if (payeeId) {
            resolved.payee_id = payeeId;
            delete resolved.payee_name;
          }
          // If not found, keep payee_name to create new payee
        }

        const response = await updateScheduledTransaction({
          budgetId,
          scheduledTransactionId: args.scheduledTransactionId,
          scheduledTransaction: resolved,
        });

        // Add formatted currency amounts
        const currencyFormat = await getCurrencyFormat();
        const formattedResponse = addFormattedAmounts(
          response,
          currencyFormat,
          args.includeMilliunits ?? false,
        );

        return successResult(
          `Scheduled transaction ${args.scheduledTransactionId} updated in budget ${budgetId}`,
          formattedResponse,
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
    scheduledTransactionId: z
      .string()
      .min(1)
      .describe("Scheduled transaction ID. UUID format."),
    includeMilliunits: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Include original milliunit amounts in response (default: false). When false, only formatted currency strings are returned (40% token reduction). Set to true when you need milliunits for transaction splitting or precise calculations.",
      ),
  });

  server.registerTool(
    "ynab.deleteScheduledTransaction",
    {
      title: "Delete scheduled transaction",
      description: "Delete a scheduled transaction.",
      inputSchema: schema.shape,
    },
    async (args) => {
      if (isReadOnly()) {
        return readOnlyResult();
      }

      try {
        const budgetId = getActiveBudgetIdOrError();
        const response = await deleteScheduledTransaction({ budgetId, ...args });

        // Add formatted currency amounts
        const currencyFormat = await getCurrencyFormat();
        const formattedResponse = addFormattedAmounts(
          response,
          currencyFormat,
          args.includeMilliunits ?? false,
        );

        return successResult(
          `Scheduled transaction ${args.scheduledTransactionId} deleted from budget ${budgetId}`,
          formattedResponse,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
