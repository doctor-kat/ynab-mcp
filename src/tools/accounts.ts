import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getAccounts, createAccount, getAccountById } from "../api/index.js";
import { successResult, errorResult } from "./utils.js";

export function registerGetAccountsTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
    lastKnowledgeOfServer: z
      .number()
      .int()
      .optional()
      .describe("Server knowledge timestamp for delta requests"),
  });

  server.registerTool(
    "ynab.getAccounts",
    {
      title: "Get accounts",
      description: "Returns all accounts for a budget",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const response = await getAccounts(args);
        return successResult(`Accounts for budget ${args.budgetId}`, response);
      } catch (error) {
        return errorResult(error);
      }
    }
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
      description: "Creates a new account in the specified budget",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const response = await createAccount(args);
        return successResult(
          `Account created in budget ${args.budgetId}`,
          response
        );
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}

export function registerGetAccountByIdTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
    accountId: z.string().min(1).describe("The ID of the account"),
  });

  server.registerTool(
    "ynab.getAccountById",
    {
      title: "Get account by ID",
      description: "Returns a single account",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const response = await getAccountById(args);
        return successResult(
          `Account ${args.accountId} in budget ${args.budgetId}`,
          response
        );
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
