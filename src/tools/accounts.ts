import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createAccount } from "../api/index.js";
import { accountStore } from "../cache/index.js";
import { errorResult, isReadOnly, readOnlyResult, successResult, getActiveBudgetIdOrError, getCurrencyFormat } from "./utils.js";
import { addFormattedAmounts } from "../utils/response-transformer.js";

export function registerGetAccountsTool(server: McpServer): void {
  const schema = z.object({});

  server.registerTool(
    "ynab.getAccounts",
    {
      title: "Get accounts",
      description: "Get all accounts with balances and details.",
      inputSchema: schema.shape,
    },
    async () => {
      try {
        const budgetId = getActiveBudgetIdOrError();
        const accounts = await accountStore.getState().getAccounts(budgetId);

        // Add formatted currency amounts
        const currencyFormat = await getCurrencyFormat();
        const formattedResponse = addFormattedAmounts({ data: { accounts } }, currencyFormat);

        return successResult(`Accounts for budget ${budgetId}`, formattedResponse);
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
          .describe("Account type"),
        balance: z
          .number()
          .int()
          .describe("Current account balance in milliunits"),
      })
      .passthrough()
      .describe("Account details"),
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
        const formattedResponse = addFormattedAmounts(response, currencyFormat);

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
