import type { ScheduledTransactionResponse } from "./ScheduledTransactionDetail.js";
import type { ScheduledTransactionsResponse } from "./ScheduledTransactionsResponse.js";
import type {
  SaveScheduledTransaction,
  UpdateScheduledTransaction,
} from "./SaveScheduledTransaction.js";
import { makeRequest } from "../client.js";

export * from "./ScheduledTransactionSummary.js";
export * from "./ScheduledTransactionDetail.js";
export * from "./ScheduledTransactionsResponse.js";
export * from "./ScheduledTransactionFrequency.js";
export * from "./SaveScheduledTransaction.js";
export * from "./ScheduledSubTransaction.js";

/**
 * Returns all scheduled transactions
 */
export async function getScheduledTransactions(params: {
  budgetId: string;
  lastKnowledgeOfServer?: number;
}): Promise<ScheduledTransactionsResponse> {
  const queryParams = new URLSearchParams();
  if (params.lastKnowledgeOfServer !== undefined) {
    queryParams.set(
      "last_knowledge_of_server",
      String(params.lastKnowledgeOfServer),
    );
  }

  const path = `budgets/${encodeURIComponent(params.budgetId)}/scheduled_transactions`;
  const url = queryParams.toString() ? `${path}?${queryParams}` : path;

  return makeRequest<ScheduledTransactionsResponse>("GET", url);
}

/**
 * Creates a single scheduled transaction (a transaction with a future date).
 */
export async function createScheduledTransaction(params: {
  budgetId: string;
  scheduledTransaction: SaveScheduledTransaction;
}): Promise<ScheduledTransactionResponse> {
  return makeRequest<ScheduledTransactionResponse>(
    "POST",
    `budgets/${encodeURIComponent(params.budgetId)}/scheduled_transactions`,
    { scheduled_transaction: params.scheduledTransaction },
  );
}

/**
 * Returns a single scheduled transaction
 */
export async function getScheduledTransactionById(params: {
  budgetId: string;
  scheduledTransactionId: string;
}): Promise<ScheduledTransactionResponse> {
  return makeRequest<ScheduledTransactionResponse>(
    "GET",
    `budgets/${encodeURIComponent(params.budgetId)}/scheduled_transactions/${encodeURIComponent(params.scheduledTransactionId)}`,
  );
}

/**
 * Updates a single scheduled transaction
 */
export async function updateScheduledTransaction(params: {
  budgetId: string;
  scheduledTransactionId: string;
  scheduledTransaction: UpdateScheduledTransaction;
}): Promise<ScheduledTransactionResponse> {
  return makeRequest<ScheduledTransactionResponse>(
    "PUT",
    `budgets/${encodeURIComponent(params.budgetId)}/scheduled_transactions/${encodeURIComponent(params.scheduledTransactionId)}`,
    { scheduled_transaction: params.scheduledTransaction },
  );
}

/**
 * Deletes a scheduled transaction
 */
export async function deleteScheduledTransaction(params: {
  budgetId: string;
  scheduledTransactionId: string;
}): Promise<ScheduledTransactionResponse> {
  return makeRequest<ScheduledTransactionResponse>(
    "DELETE",
    `budgets/${encodeURIComponent(params.budgetId)}/scheduled_transactions/${encodeURIComponent(params.scheduledTransactionId)}`,
  );
}
