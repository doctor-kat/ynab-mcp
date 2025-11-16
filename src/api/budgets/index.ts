import type { BudgetSummaryResponse } from "./BudgetSummary.js";
import type { BudgetDetailResponse } from "./BudgetDetail.js";
import type { BudgetSettingsResponse } from "./BudgetSettings.js";
import { makeRequest } from "../client.js";

export * from "./BudgetSummary.js";
export * from "./BudgetDetail.js";
export * from "./BudgetSettings.js";

/**
 * Returns budgets list with summary information
 */
export async function getBudgets(params?: {
  includeAccounts?: boolean;
}): Promise<BudgetSummaryResponse> {
  const queryParams = new URLSearchParams();
  if (params?.includeAccounts !== undefined) {
    queryParams.set("include_accounts", String(params.includeAccounts));
  }

  const path = "/budgets";
  const url = queryParams.toString() ? `${path}?${queryParams}` : path;

  return makeRequest<BudgetSummaryResponse>("GET", url);
}

/**
 * Returns a single budget with all related entities. This resource is
 * effectively a full budget export.
 */
export async function getBudgetById(params: {
  budgetId: string;
  lastKnowledgeOfServer?: number;
}): Promise<BudgetDetailResponse> {
  const queryParams = new URLSearchParams();
  if (params.lastKnowledgeOfServer !== undefined) {
    queryParams.set(
      "last_knowledge_of_server",
      String(params.lastKnowledgeOfServer),
    );
  }

  const path = `/budgets/${encodeURIComponent(params.budgetId)}`;
  const url = queryParams.toString() ? `${path}?${queryParams}` : path;

  return makeRequest<BudgetDetailResponse>("GET", url);
}

/**
 * Returns settings for a budget
 */
export async function getBudgetSettingsById(params: {
  budgetId: string;
}): Promise<BudgetSettingsResponse> {
  return makeRequest<BudgetSettingsResponse>(
    "GET",
    `/budgets/${encodeURIComponent(params.budgetId)}/settings`,
  );
}
