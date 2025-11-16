import type { CategoryResponse } from "./Category.js";
import type { CategoriesResponse } from "./CategoryGroupWithCategories.js";
import type { SaveCategoryResponse, PatchCategoryWrapper } from "./SaveCategory.js";
import type { PatchMonthCategoryWrapper } from "./SaveMonthCategory.js";
import { makeRequest } from "../client.js";

export * from './Category.js';
export * from './CategoryGroup.js';
export * from './CategoryGroupWithCategories.js';
export * from './SaveCategory.js';
export * from './SaveMonthCategory.js';

/**
 * Returns all categories grouped by category group. Amounts (budgeted,
 * activity, balance, etc.) are specific to the current budget month (UTC).
 */
export async function getCategories(params: {
  budgetId: string;
  lastKnowledgeOfServer?: number;
}): Promise<CategoriesResponse> {
  const queryParams = new URLSearchParams();
  if (params.lastKnowledgeOfServer !== undefined) {
    queryParams.set(
      "last_knowledge_of_server",
      String(params.lastKnowledgeOfServer),
    );
  }

  const path = `/budgets/${encodeURIComponent(params.budgetId)}/categories`;
  const url = queryParams.toString() ? `${path}?${queryParams}` : path;

  return makeRequest<CategoriesResponse>("GET", url);
}

/**
 * Returns a single category. Amounts (budgeted, activity, balance, etc.)
 * are specific to the current budget month (UTC).
 */
export async function getCategoryById(params: {
  budgetId: string;
  categoryId: string;
}): Promise<CategoryResponse> {
  return makeRequest<CategoryResponse>(
    "GET",
    `/budgets/${encodeURIComponent(params.budgetId)}/categories/${encodeURIComponent(params.categoryId)}`,
  );
}

/**
 * Update a category
 */
export async function updateCategory(params: {
  budgetId: string;
  categoryId: string;
  category: PatchCategoryWrapper["category"];
}): Promise<SaveCategoryResponse> {
  return makeRequest<SaveCategoryResponse>(
    "PATCH",
    `/budgets/${encodeURIComponent(params.budgetId)}/categories/${encodeURIComponent(params.categoryId)}`,
    { category: params.category },
  );
}

/**
 * Returns a single category for a specific budget month. Amounts
 * (budgeted, activity, balance, etc.) are specific to the current budget
 * month (UTC).
 */
export async function getMonthCategoryById(params: {
  budgetId: string;
  month: string;
  categoryId: string;
}): Promise<CategoryResponse> {
  return makeRequest<CategoryResponse>(
    "GET",
    `/budgets/${encodeURIComponent(params.budgetId)}/months/${encodeURIComponent(params.month)}/categories/${encodeURIComponent(params.categoryId)}`,
  );
}

/**
 * Update a category for a specific month. Only `budgeted` amount can be
 * updated.
 */
export async function updateMonthCategory(params: {
  budgetId: string;
  month: string;
  categoryId: string;
  category: PatchMonthCategoryWrapper["category"];
}): Promise<SaveCategoryResponse> {
  return makeRequest<SaveCategoryResponse>(
    "PATCH",
    `/budgets/${encodeURIComponent(params.budgetId)}/months/${encodeURIComponent(params.month)}/categories/${encodeURIComponent(params.categoryId)}`,
    { category: params.category },
  );
}
