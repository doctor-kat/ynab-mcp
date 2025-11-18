import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getMonthCategoryById,
  updateCategory,
  updateMonthCategory,
} from "../api/index.js";
import { categoryStore } from "../cache/index.js";
import { errorResult, isReadOnly, readOnlyResult, successResult, getActiveBudgetIdOrError, getCurrencyFormat, buildMetadata } from "./utils.js";
import { addFormattedAmounts } from "../utils/response-transformer.js";
import { resolveCategoryGroupId, resolveCategoryId } from "./resolvers.js";
import { filterCategoryGroupsWithCategories, filterCategoryGroups, selectCategoryGroupFields } from "../utils/category-filters.js";

export function registerGetCategoriesTool(server: McpServer): void {
  const baseSchema = z.object({
    categoryGroupId: z.string().optional().describe("Filter by category group ID. UUID format. Takes priority over categoryGroupName."),
    categoryGroupName: z.string().optional().describe("Filter by category group name. Used only if categoryGroupId not provided. Resolves to existing group or throws error."),
    categoryId: z.string().optional().describe("Filter to specific category ID. UUID format. Takes priority over categoryName."),
    categoryName: z.string().optional().describe("Filter to specific category name. Used only if categoryId not provided. Resolves to existing category or throws error."),
    includeHidden: z.boolean().optional().default(false).describe("Include hidden categories (default: false)"),
    includeDeleted: z.boolean().optional().default(false).describe("Include deleted categories (default: false)"),
    namePattern: z.string().optional().describe("Case-insensitive substring match on category names"),
    full: z.boolean().optional().default(false).describe("Include all fields (budgeted, activity, balance, goal data). Default: false (minimal fields only)"),
    includeMilliunits: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Include original milliunit amounts in response (default: false). When false, only formatted currency strings are returned (40% token reduction). Set to true when you need milliunits for transaction splitting or precise calculations.",
      ),
  });

  const schema = baseSchema.refine((data) => !(data.categoryGroupId && data.categoryGroupName), {
    message: "Cannot provide both categoryGroupId and categoryGroupName",
  }).refine((data) => !(data.categoryId && data.categoryName), {
    message: "Cannot provide both categoryId and categoryName",
  });

  server.registerTool(
    "ynab.getCategories",
    {
      title: "Get categories",
      description:
        "Get all categories grouped by category group. By default returns minimal fields and excludes hidden/deleted categories. " +
        "Use getCategoryGroups or getCategoriesByGroup for smaller, focused queries. " +
        "Set full=true only if you need budget amounts and goal data.",
      inputSchema: baseSchema.shape,
    },
    async (args: any) => {
      try {
        const budgetId = getActiveBudgetIdOrError();
        let category_groups = await categoryStore.getState().getCategories(budgetId);

        // Resolve category group name to ID if provided
        let resolvedGroupId = args.categoryGroupId;
        if (args.categoryGroupName) {
          resolvedGroupId = await resolveCategoryGroupId(budgetId, args.categoryGroupName);
          if (!resolvedGroupId) {
            throw new Error(`Category group not found: ${args.categoryGroupName}`);
          }
        }

        // Resolve category name to ID if provided
        let resolvedCategoryId = args.categoryId;
        if (args.categoryName) {
          resolvedCategoryId = await resolveCategoryId(budgetId, args.categoryName);
          if (!resolvedCategoryId) {
            throw new Error(`Category not found: ${args.categoryName}`);
          }
        }

        // Filter by category group if specified
        if (resolvedGroupId) {
          category_groups = category_groups.filter(group => group.id === resolvedGroupId);
        }

        // Filter by specific category if specified
        if (resolvedCategoryId) {
          category_groups = category_groups.map(group => ({
            ...group,
            categories: group.categories.filter(cat => cat.id === resolvedCategoryId),
          })).filter(group => group.categories.length > 0);
        }

        // Apply filters and field selection
        const filtered_groups = filterCategoryGroupsWithCategories(
          category_groups,
          {
            includeHidden: args.includeHidden ?? false,
            includeDeleted: args.includeDeleted ?? false,
          },
          {
            includeHidden: args.includeHidden ?? false,
            includeDeleted: args.includeDeleted ?? false,
            namePattern: args.namePattern,
          },
          args.full ?? false,
        );

        // Build metadata
        const filters: Record<string, any> = {};
        if (args.includeHidden !== undefined) filters.includeHidden = args.includeHidden;
        if (args.includeDeleted !== undefined) filters.includeDeleted = args.includeDeleted;
        if (args.namePattern !== undefined) filters.namePattern = args.namePattern;
        if (resolvedGroupId) filters.categoryGroupId = resolvedGroupId;
        if (resolvedCategoryId) filters.categoryId = resolvedCategoryId;
        if (args.full !== undefined) filters.full = args.full;

        const metadata = buildMetadata({
          count: filtered_groups.length,
          filters,
          cached: true,
        });

        const flatResponse = {
          category_groups: filtered_groups,
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
          `${metadata.count} category group(s) retrieved`,
          formattedResponse,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

export function registerUpdateCategoryTool(server: McpServer): void {
  const schema = z.object({
    categoryId: z.string().min(1).describe("Category ID. UUID format."),
    category: z
      .object({
        name: z.string().optional().describe("New category name"),
        note: z.string().optional().describe("Category notes"),
        budgeted: z
          .number()
          .int()
          .optional()
          .describe("Budgeted amount in milliunits (1000 milliunits = $1.00). Example: 50000 for $50.00"),
        goal_type: z.string().optional().describe("Goal type"),
        goal_creation_month: z
          .string()
          .optional()
          .describe("Goal creation month as first day of month (YYYY-MM-DD). Example: '2025-01-01' for January 2025."),
        goal_target: z.number().int().optional().describe("Goal target amount in milliunits (1000 milliunits = $1.00). Example: 100000 for $100.00"),
        goal_target_month: z
          .string()
          .optional()
          .describe("Goal target month as first day of month (YYYY-MM-DD). Example: '2025-12-01' for December 2025."),
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
    includeMilliunits: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Include original milliunit amounts in response (default: false). When false, only formatted currency strings are returned (40% token reduction). Set to true when you need milliunits for transaction splitting or precise calculations.",
      ),
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

        // Add formatted currency amounts
        const currencyFormat = await getCurrencyFormat();
        const formattedResponse = addFormattedAmounts(
          response,
          currencyFormat,
          args.includeMilliunits ?? false,
        );

        return successResult(
          `Category ${args.categoryId} updated in budget ${budgetId}`,
          formattedResponse,
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
      .describe("Budget month as first day of month (YYYY-MM-DD). Example: '2025-01-01' for January 2025."),
    categoryId: z.string().min(1).describe("Category ID. UUID format."),
    includeMilliunits: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Include original milliunit amounts in response (default: false). When false, only formatted currency strings are returned (40% token reduction). Set to true when you need milliunits for transaction splitting or precise calculations.",
      ),
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

        // Build metadata
        const filters: Record<string, any> = {
          categoryId: args.categoryId,
          month: args.month,
        };

        const metadata = buildMetadata({
          count: 1,
          filters,
          cached: false,
        });

        const flatResponse = {
          category: response.data.category,
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
          `Category ${args.categoryId} for month ${args.month} retrieved`,
          formattedResponse,
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
      .describe("Budget month as first day of month (YYYY-MM-DD). Example: '2025-01-01' for January 2025."),
    categoryId: z.string().min(1).describe("Category ID. UUID format."),
    category: z
      .object({
        budgeted: z.number().int().describe("Budgeted amount in milliunits (1000 milliunits = $1.00). Example: 50000 for $50.00"),
      })
      .passthrough()
      .describe("Category update fields"),
    includeMilliunits: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Include original milliunit amounts in response (default: false). When false, only formatted currency strings are returned (40% token reduction). Set to true when you need milliunits for transaction splitting or precise calculations.",
      ),
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

        // Add formatted currency amounts
        const currencyFormat = await getCurrencyFormat();
        const formattedResponse = addFormattedAmounts(
          response,
          currencyFormat,
          args.includeMilliunits ?? false,
        );

        return successResult(
          `Category ${args.categoryId} updated for month ${args.month} in budget ${budgetId}`,
          formattedResponse,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

export function registerGetCategoryGroupsTool(server: McpServer): void {
  const schema = z.object({
    includeHidden: z.boolean().optional().default(false).describe("Include hidden category groups (default: false)"),
    includeDeleted: z.boolean().optional().default(false).describe("Include deleted category groups (default: false)"),
  });

  server.registerTool(
    "ynab.getCategoryGroups",
    {
      title: "Get category groups",
      description:
        "Get category group metadata without nested categories. Returns just id, name, hidden, deleted for each group. " +
        "Use when you only need to list or reference category groups.",
      inputSchema: schema.shape,
    },
    async (args: any) => {
      try {
        const budgetId = getActiveBudgetIdOrError();
        const category_groups = await categoryStore.getState().getCategories(budgetId);

        // Filter and select fields
        const filtered_groups = filterCategoryGroups(category_groups, {
          includeHidden: args.includeHidden ?? false,
          includeDeleted: args.includeDeleted ?? false,
        });

        const minimal_groups = filtered_groups.map(selectCategoryGroupFields);

        // Build metadata
        const filters: Record<string, any> = {};
        if (args.includeHidden !== undefined) filters.includeHidden = args.includeHidden;
        if (args.includeDeleted !== undefined) filters.includeDeleted = args.includeDeleted;

        const metadata = buildMetadata({
          count: minimal_groups.length,
          filters,
          cached: true,
        });

        const flatResponse = {
          category_groups: minimal_groups,
          metadata,
        };

        return successResult(
          `${metadata.count} category group(s) retrieved`,
          flatResponse,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

export function registerGetCategoriesByGroupTool(server: McpServer): void {
  const baseSchema = z.object({
    categoryGroupId: z.string().optional().describe("Category group ID. UUID format. Takes priority over categoryGroupName."),
    categoryGroupName: z.string().optional().describe("Category group name. Used only if categoryGroupId not provided. Resolves to existing group or throws error."),
    includeHidden: z.boolean().optional().default(false).describe("Include hidden categories (default: false)"),
    includeDeleted: z.boolean().optional().default(false).describe("Include deleted categories (default: false)"),
    namePattern: z.string().optional().describe("Case-insensitive substring match on category names"),
    full: z.boolean().optional().default(false).describe("Include all fields (budgeted, activity, balance, goal data). Default: false (minimal fields only)"),
    includeMilliunits: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Include original milliunit amounts in response (default: false). When false, only formatted currency strings are returned (40% token reduction). Set to true when you need milliunits for transaction splitting or precise calculations.",
      ),
  });

  const schema = baseSchema.refine((data) => data.categoryGroupId || data.categoryGroupName, {
    message: "Either categoryGroupId or categoryGroupName must be provided",
  }).refine((data) => !(data.categoryGroupId && data.categoryGroupName), {
    message: "Cannot provide both categoryGroupId and categoryGroupName",
  });

  server.registerTool(
    "ynab.getCategoriesByGroup",
    {
      title: "Get categories by group",
      description:
        "Get categories within a specific category group. Returns focused results for one group. " +
        "Use when you know which group contains the categories you need. " +
        "Set full=true only if you need budget amounts or goal data.",
      inputSchema: baseSchema.shape,
    },
    async (args: any) => {
      try {
        const budgetId = getActiveBudgetIdOrError();
        let category_groups = await categoryStore.getState().getCategories(budgetId);

        // Resolve category group name to ID if provided
        let resolvedGroupId = args.categoryGroupId;
        if (args.categoryGroupName) {
          resolvedGroupId = await resolveCategoryGroupId(budgetId, args.categoryGroupName);
          if (!resolvedGroupId) {
            throw new Error(`Category group not found: ${args.categoryGroupName}`);
          }
        }

        // Filter to the specific group
        category_groups = category_groups.filter(group => group.id === resolvedGroupId);

        if (category_groups.length === 0) {
          throw new Error(`Category group not found: ${resolvedGroupId}`);
        }

        // Apply filters and field selection
        const filtered_groups = filterCategoryGroupsWithCategories(
          category_groups,
          {
            includeHidden: args.includeHidden ?? false,
            includeDeleted: args.includeDeleted ?? false,
          },
          {
            includeHidden: args.includeHidden ?? false,
            includeDeleted: args.includeDeleted ?? false,
            namePattern: args.namePattern,
          },
          args.full ?? false,
        );

        // Extract categories from the single group
        const categories = (filtered_groups[0] as any)?.categories || [];

        // Build metadata
        const filters: Record<string, any> = {
          categoryGroupId: resolvedGroupId,
        };
        if (args.includeHidden !== undefined) filters.includeHidden = args.includeHidden;
        if (args.includeDeleted !== undefined) filters.includeDeleted = args.includeDeleted;
        if (args.namePattern !== undefined) filters.namePattern = args.namePattern;
        if (args.full !== undefined) filters.full = args.full;

        const metadata = buildMetadata({
          count: categories.length,
          filters,
          cached: true,
        });

        const flatResponse = {
          categories,
          metadata,
        };

        // Add formatted currency amounts if full=true
        const currencyFormat = await getCurrencyFormat();
        const formattedResponse = addFormattedAmounts(
          flatResponse,
          currencyFormat,
          args.includeMilliunits ?? false,
        );

        return successResult(
          `${metadata.count} categor${metadata.count === 1 ? 'y' : 'ies'} in group ${resolvedGroupId}`,
          formattedResponse,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

export function registerGetCategoryTool(server: McpServer): void {
  const baseSchema = z.object({
    categoryId: z.string().optional().describe("Category ID. UUID format. Takes priority over categoryName."),
    categoryName: z.string().optional().describe("Category name. Used only if categoryId not provided. Resolves to existing category or throws error."),
    full: z.boolean().optional().default(false).describe("Include all fields (budgeted, activity, balance, goal data). Default: false (minimal fields only)"),
    includeMilliunits: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Include original milliunit amounts in response (default: false). When false, only formatted currency strings are returned (40% token reduction). Set to true when you need milliunits for transaction splitting or precise calculations.",
      ),
  });

  const schema = baseSchema.refine((data) => data.categoryId || data.categoryName, {
    message: "Either categoryId or categoryName must be provided",
  }).refine((data) => !(data.categoryId && data.categoryName), {
    message: "Cannot provide both categoryId and categoryName",
  });

  server.registerTool(
    "ynab.getCategory",
    {
      title: "Get category",
      description:
        "Get details for a single category by ID or name. Use when you need information about one specific category. " +
        "Set full=true only if you need budget amounts or goal data.",
      inputSchema: baseSchema.shape,
    },
    async (args: any) => {
      try {
        const budgetId = getActiveBudgetIdOrError();
        let category_groups = await categoryStore.getState().getCategories(budgetId);

        // Resolve category name to ID if provided
        let resolvedCategoryId = args.categoryId;
        if (args.categoryName) {
          resolvedCategoryId = await resolveCategoryId(budgetId, args.categoryName);
          if (!resolvedCategoryId) {
            throw new Error(`Category not found: ${args.categoryName}`);
          }
        }

        // Find the category
        let foundCategory = null;
        for (const group of category_groups) {
          foundCategory = group.categories.find(cat => cat.id === resolvedCategoryId);
          if (foundCategory) break;
        }

        if (!foundCategory) {
          throw new Error(`Category not found: ${resolvedCategoryId}`);
        }

        // Apply field selection
        const filtered_groups = filterCategoryGroupsWithCategories(
          category_groups.map(group => ({
            ...group,
            categories: group.categories.filter(cat => cat.id === resolvedCategoryId),
          })).filter(group => group.categories.length > 0),
          { includeHidden: true, includeDeleted: true },
          { includeHidden: true, includeDeleted: true },
          args.full ?? false,
        );

        const category = (filtered_groups[0] as any)?.categories[0];

        // Build metadata
        const filters: Record<string, any> = {
          categoryId: resolvedCategoryId,
        };
        if (args.full !== undefined) filters.full = args.full;

        const metadata = buildMetadata({
          count: 1,
          filters,
          cached: true,
        });

        const flatResponse = {
          category,
          metadata,
        };

        // Add formatted currency amounts if full=true
        const currencyFormat = await getCurrencyFormat();
        const formattedResponse = addFormattedAmounts(
          flatResponse,
          currencyFormat,
          args.includeMilliunits ?? false,
        );

        return successResult(
          `Category ${resolvedCategoryId} retrieved`,
          formattedResponse,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
