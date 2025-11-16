import type { PayeeResponse, PayeesResponse } from "./Payee.js";
import type { PatchPayeeWrapper, SavePayeeResponse } from "./SavePayee.js";
import { makeRequest } from "../client.js";

export * from "./Payee.js";
export * from "./SavePayee.js";

/**
 * Returns all payees
 */
export async function getPayees(params: {
  budgetId: string;
  lastKnowledgeOfServer?: number;
}): Promise<PayeesResponse> {
  const queryParams = new URLSearchParams();
  if (params.lastKnowledgeOfServer !== undefined) {
    queryParams.set(
      "last_knowledge_of_server",
      String(params.lastKnowledgeOfServer),
    );
  }

  const path = `budgets/${encodeURIComponent(params.budgetId)}/payees`;
  const url = queryParams.toString() ? `${path}?${queryParams}` : path;

  return makeRequest<PayeesResponse>("GET", url);
}

/**
 * Returns a single payee
 */
export async function getPayeeById(params: {
  budgetId: string;
  payeeId: string;
}): Promise<PayeeResponse> {
  return makeRequest<PayeeResponse>(
    "GET",
    `budgets/${encodeURIComponent(params.budgetId)}/payees/${encodeURIComponent(params.payeeId)}`,
  );
}

/**
 * Update a payee
 */
export async function updatePayee(params: {
  budgetId: string;
  payeeId: string;
  payee: PatchPayeeWrapper["payee"];
}): Promise<SavePayeeResponse> {
  return makeRequest<SavePayeeResponse>(
    "PATCH",
    `budgets/${encodeURIComponent(params.budgetId)}/payees/${encodeURIComponent(params.payeeId)}`,
    { payee: params.payee },
  );
}
