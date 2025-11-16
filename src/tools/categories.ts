import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getCategories,
  getMonthCategoryById,
  updateCategory,
  updateMonthCategory,
} from "../api/index.js";
import { errorResult, isReadOnly, readOnlyResult, successResult } from "./utils.js";

export function registerGetCategoriesTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
    lastKnowledgeOfServer: z
      .number()
      .int()
      .optional()
      .describe("Server knowledge timestamp for delta requests"),
  });

  server.registerTool(
    "ynab.getCategories",
    {
      title: "Get categories",
      description:
        "Returns all categories grouped by category group. Amounts are specific to the current budget month (UTC).",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const response = await getCategories(args);
        return successResult(
          `Categories for budget ${args.budgetId}`,
          response,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

export function registerUpdateCategoryTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
    categoryId: z.string().min(1).describe("The ID of the category"),
    category: z
      .object({
        name: z.string().optional().describe("New category name"),
        note: z.string().optional().describe("Category notes"),
        budgeted: z
          .number()
          .int()
          .optional()
          .describe("Budgeted amount in milliunits"),
        goal_type: z.string().optional().describe("Goal type"),
        goal_creation_month: z
          .string()
          .optional()
          .describe("Goal creation month (ISO format)"),
        goal_target: z.number().int().optional().describe("Goal target amount"),
        goal_target_month: z
          .string()
          .optional()
          .describe("Goal target month (ISO format)"),
        goal_percentage_complete: z
          .number()
          .optional()
          .describe("Goal percentage complete"),
        goal_months_to_budget: z
          .number()
          .int()
          .optional()
          .describe("Months to budget for goal"),
      })
      .passthrough()
      .describe("Category update fields"),
  });

  server.registerTool(
    "ynab.updateCategory",
    {
      title: "Update category",
      description: "Updates a category",
      inputSchema: schema.shape,
    },
    async (args) => {
      if (isReadOnly()) {
        return readOnlyResult();
      }

      try {
        const response = await updateCategory(args);
        return successResult(
          `Category ${args.categoryId} updated in budget ${args.budgetId}`,
          response,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

export function registerGetMonthCategoryByIdTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
    month: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe("The budget month in ISO format (YYYY-MM-DD)"),
    categoryId: z.string().min(1).describe("The ID of the category"),
  });

  server.registerTool(
    "ynab.getMonthCategoryById",
    {
      title: "Get month category by ID",
      description:
        "Returns a single category for a specific budget month. Amounts are specific to that month.",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const response = await getMonthCategoryById(args);
        return successResult(
          `Category ${args.categoryId} for month ${args.month} in budget ${args.budgetId}`,
          response,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

export function registerUpdateMonthCategoryTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
    month: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe("The budget month in ISO format (YYYY-MM-DD)"),
    categoryId: z.string().min(1).describe("The ID of the category"),
    category: z
      .object({
        budgeted: z.number().int().describe("Budgeted amount in milliunits"),
      })
      .passthrough()
      .describe("Category update fields"),
  });

  server.registerTool(
    "ynab.updateMonthCategory",
    {
      title: "Update month category",
      description:
        "Updates a category for a specific month. Only budgeted amount can be updated.",
      inputSchema: schema.shape,
    },
    async (args) => {
      if (isReadOnly()) {
        return readOnlyResult();
      }

      try {
        const response = await updateMonthCategory(args);
        return successResult(
          `Category ${args.categoryId} updated for month ${args.month} in budget ${args.budgetId}`,
          response,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
