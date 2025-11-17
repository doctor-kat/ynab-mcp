import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createAccount } from "../api/index.js";
import { accountStore } from "../cache/index.js";
import { errorResult, isReadOnly, readOnlyResult, successResult } from "./utils.js";

export function registerGetAccountsTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
  });

  server.registerTool(
    "ynab.getAccounts",
    {
      title: "Get accounts",
      description:
        "Retrieve and return all accounts for a budget. " +
        "Uses cached data with delta requests for optimal performance. " +
        "Use ynab.getBudgetContext to get your budgetId.",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const accounts = await accountStore.getState().getAccounts(args.budgetId);
        return successResult(`Accounts for budget ${args.budgetId}`, { data: { accounts } });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

export function registerCreateAccountTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
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
      description: "Create a new account in the specified budget. Requires budgetId (use ynab.getBudgetContext to get your budgetId).",
      inputSchema: schema.shape,
    },
    async (args) => {
      if (isReadOnly()) {
        return readOnlyResult();
      }

      try {
        const response = await createAccount(args);
        // Invalidate cache after write operation
        accountStore.getState().invalidate(args.budgetId);
        return successResult(
          `Account created in budget ${args.budgetId}`,
          response,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
