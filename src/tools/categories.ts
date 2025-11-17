import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getMonthCategoryById,
  updateCategory,
  updateMonthCategory,
} from "../api/index.js";
import { categoryStore } from "../cache/index.js";
import { errorResult, isReadOnly, readOnlyResult, successResult, getActiveBudgetIdOrError } from "./utils.js";

export function registerGetCategoriesTool(server: McpServer): void {
  const schema = z.object({});

  server.registerTool(
    "ynab.getCategories",
    {
      title: "Get categories",
      description:
        "Retrieve and return all categories grouped by category group for the active budget. " +
        "Uses cached data with delta requests for optimal performance. " +
        "Amounts are specific to the current budget month (UTC).",
      inputSchema: schema.shape,
    },
    async () => {
      try {
        const budgetId = getActiveBudgetIdOrError();
        const category_groups = await categoryStore.getState().getCategories(budgetId);
        return successResult(
          `Categories for budget ${budgetId}`,
          { data: { category_groups } },
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

export function registerUpdateCategoryTool(server: McpServer): void {
  const schema = z.object({
    categoryId: z.string().min(1).describe("The ID of the category (use ynab.getCategories to discover)"),
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
      description: "Update a category in the active budget.",
      inputSchema: schema.shape,
    },
    async (args) => {
      if (isReadOnly()) {
        return readOnlyResult();
      }

      try {
        const budgetId = getActiveBudgetIdOrError();
        const response = await updateCategory({ budgetId, ...args });
        // Invalidate cache after write operation
        categoryStore.getState().invalidate(budgetId);
        return successResult(
          `Category ${args.categoryId} updated in budget ${budgetId}`,
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
    month: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe("The budget month in ISO format (YYYY-MM-DD)"),
    categoryId: z.string().min(1).describe("The ID of the category (use ynab.getCategories to discover)"),
  });

  server.registerTool(
    "ynab.getMonthCategory",
    {
      title: "Get month category",
      description:
        "Retrieve and return a single category for a specific budget month in the active budget. Amounts are specific to that month.",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const budgetId = getActiveBudgetIdOrError();
        const response = await getMonthCategoryById({ budgetId, ...args });
        return successResult(
          `Category ${args.categoryId} for month ${args.month} in budget ${budgetId}`,
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
    month: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe("The budget month in ISO format (YYYY-MM-DD)"),
    categoryId: z.string().min(1).describe("The ID of the category (use ynab.getCategories to discover)"),
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
        "Update a category for a specific month in the active budget. Only budgeted amount can be updated.",
      inputSchema: schema.shape,
    },
    async (args) => {
      if (isReadOnly()) {
        return readOnlyResult();
      }

      try {
        const budgetId = getActiveBudgetIdOrError();
        const response = await updateMonthCategory({ budgetId, ...args });
        return successResult(
          `Category ${args.categoryId} updated for month ${args.month} in budget ${budgetId}`,
          response,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
