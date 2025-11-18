import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createAccount } from "../api/index.js";
import { accountStore } from "../cache/index.js";
import { errorResult, isReadOnly, readOnlyResult, successResult, getActiveBudgetIdOrError, getCurrencyFormat, buildMetadata } from "./utils.js";
import { addFormattedAmounts } from "../utils/response-transformer.js";

export function registerGetAccountsTool(server: McpServer): void {
  const schema = z.object({
    includeMilliunits: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Include original milliunit amounts in response (default: false). When false, only formatted currency strings are returned (40% token reduction). Set to true when you need milliunits for transaction splitting or precise calculations.",
      ),
  });

  server.registerTool(
    "ynab.getAccounts",
    {
      title: "Get accounts",
      description: "Get all accounts with balances and details.",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const budgetId = getActiveBudgetIdOrError();
        const accounts = await accountStore.getState().getAccounts(budgetId);

        // Build metadata
        const metadata = buildMetadata({
          count: accounts.length,
          cached: true,
        });

        const flatResponse = {
          accounts,
          metadata,
        };

        // Add formatted currency amounts
        const currencyFormat = await getCurrencyFormat();
        const formattedResponse = addFormattedAmounts(
          flatResponse,
          currencyFormat,
          args.includeMilliunits ?? false,
        );

        return successResult(`${metadata.count} account(s) retrieved`, formattedResponse);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

export function registerCreateAccountTool(server: McpServer): void {
  const schema = z.object({
    account: z
      .object({
        name: z.string().describe("Account name"),
        type: z
          .enum([
            "checking",
            "savings",
            "cash",
            "creditCard",
            "lineOfCredit",
            "otherAsset",
            "otherLiability",
            "mortgage",
            "autoLoan",
            "studentLoan",
            "personalLoan",
            "medicalDebt",
            "otherDebt",
          ])
          .describe("Account type. Valid values: 'checking', 'savings', 'cash', 'creditCard', 'lineOfCredit', 'otherAsset', 'otherLiability', 'mortgage', 'autoLoan', 'studentLoan', 'personalLoan', 'medicalDebt', 'otherDebt'."),
        balance: z
          .number()
          .int()
          .describe("Current account balance in milliunits (1000 milliunits = $1.00). Example: 50000 for $50.00"),
      })
      .passthrough()
      .describe("Account details"),
    includeMilliunits: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Include original milliunit amounts in response (default: false). When false, only formatted currency strings are returned (40% token reduction). Set to true when you need milliunits for transaction splitting or precise calculations.",
      ),
  });

  server.registerTool(
    "ynab.createAccount",
    {
      title: "Create account",
      description: "Create a new account.",
      inputSchema: schema.shape,
    },
    async (args) => {
      if (isReadOnly()) {
        return readOnlyResult();
      }

      try {
        const budgetId = getActiveBudgetIdOrError();
        const response = await createAccount({ budgetId, ...args });
        // Invalidate cache after write operation
        accountStore.getState().invalidate(budgetId);

        // Add formatted currency amounts
        const currencyFormat = await getCurrencyFormat();
        const formattedResponse = addFormattedAmounts(
          response,
          currencyFormat,
          args.includeMilliunits ?? false,
        );

        return successResult(
          `Account created in budget ${budgetId}`,
          formattedResponse,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
