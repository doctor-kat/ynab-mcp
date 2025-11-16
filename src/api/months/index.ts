import type { MonthSummariesResponse } from "./MonthSummary.js";
import type { MonthDetailResponse } from "./MonthDetail.js";
import { makeRequest } from "../client.js";

export * from "./MonthSummary.js";
export * from "./MonthDetail.js";

/**
 * Returns all budget months
 */
export async function getBudgetMonths(params: {
  budgetId: string;
  lastKnowledgeOfServer?: number;
}): Promise<MonthSummariesResponse> {
  const queryParams = new URLSearchParams();
  if (params.lastKnowledgeOfServer !== undefined) {
    queryParams.set(
      "last_knowledge_of_server",
      String(params.lastKnowledgeOfServer),
    );
  }

  const path = `budgets/${encodeURIComponent(params.budgetId)}/months`;
  const url = queryParams.toString() ? `${path}?${queryParams}` : path;

  return makeRequest<MonthSummariesResponse>("GET", url);
}

/**
 * Returns a single budget month
 */
export async function getBudgetMonth(params: {
  budgetId: string;
  month: string;
}): Promise<MonthDetailResponse> {
  return makeRequest<MonthDetailResponse>(
    "GET",
    `budgets/${encodeURIComponent(params.budgetId)}/months/${encodeURIComponent(params.month)}`,
  );
}
