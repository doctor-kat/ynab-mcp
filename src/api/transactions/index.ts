import type { TransactionsResponse } from "./TransactionsResponse.js";
import type { HybridTransactionsResponse } from "./HybridTransaction.js";
import type { TransactionResponse } from "./TransactionDetail.js";
import type { SaveTransactionsResponse } from "./SaveTransactionsResponse.js";
import type { TransactionsImportResponse } from "./BulkTransactions.js";
import type { PostTransactionsWrapper } from "./NewTransaction.js";
import type { PutTransactionWrapper } from "./SaveTransaction.js";
import type { PatchTransactionsWrapper } from "./PatchTransactions.js";
import { makeRequest } from "../client.js";

export * from "./TransactionSummary.js";
export * from "./TransactionDetail.js";
export * from "./TransactionsResponse.js";
export * from "./HybridTransaction.js";
export * from "./SaveTransaction.js";
export * from "./NewTransaction.js";
export * from "./PatchTransactions.js";
export * from "./SaveTransactionWithOptionalFields.js";
export * from "./SaveTransactionsResponse.js";
export * from "./SubTransaction.js";
export * from "./SaveSubTransaction.js";
export * from "./TransactionEnums.js";
export * from "./BulkTransactions.js";

/**
 * Returns budget transactions, excluding any pending transactions
 */
export async function getTransactions(params: {
  budgetId: string;
  sinceDate?: string;
  type?: "uncategorized" | "unapproved";
  lastKnowledgeOfServer?: number;
}): Promise<TransactionsResponse> {
  const queryParams = new URLSearchParams();
  if (params.sinceDate) queryParams.set("since_date", params.sinceDate);
  if (params.type) queryParams.set("type", params.type);
  if (params.lastKnowledgeOfServer !== undefined) {
    queryParams.set(
      "last_knowledge_of_server",
      String(params.lastKnowledgeOfServer),
    );
  }

  const path = `budgets/${encodeURIComponent(params.budgetId)}/transactions`;
  const url = queryParams.toString() ? `${path}?${queryParams}` : path;

  return makeRequest<TransactionsResponse>("GET", url);
}

/**
 * Creates a single transaction or multiple transactions. If you provide a
 * body containing a `transaction` object, a single transaction will be
 * created and if you provide a body containing a `transactions` array,
 * multiple transactions will be created. Scheduled transactions (transactions with a future date)
 * cannot be created on this endpoint.
 */
export async function createTransaction(params: {
  budgetId: string;
  data: PostTransactionsWrapper;
}): Promise<SaveTransactionsResponse> {
  return makeRequest<SaveTransactionsResponse>(
    "POST",
    `budgets/${encodeURIComponent(params.budgetId)}/transactions`,
    params.data,
  );
}

/**
 * Updates multiple transactions, by `id` or `import_id`.
 */
export async function updateTransactions(params: {
  budgetId: string;
  transactions: PatchTransactionsWrapper["transactions"];
}): Promise<SaveTransactionsResponse> {
  return makeRequest<SaveTransactionsResponse>(
    "PATCH",
    `budgets/${encodeURIComponent(params.budgetId)}/transactions`,
    { transactions: params.transactions },
  );
}

/**
 * Imports available transactions on all linked accounts for the given budget.
 * Linked accounts allow transactions to be imported directly from a specified financial institution and this endpoint initiates that
 * import. Sending a request to this endpoint is the equivalent of
 * clicking "Import" on each account in the web application or tapping the
 * "New Transactions" banner in the mobile applications. The response for
 * this endpoint contains the transaction ids that have been imported.
 */
export async function importTransactions(params: {
  budgetId: string;
}): Promise<TransactionsImportResponse> {
  return makeRequest<TransactionsImportResponse>(
    "POST",
    `budgets/${encodeURIComponent(params.budgetId)}/transactions/import`,
  );
}

/**
 * Returns a single transaction
 */
export async function getTransactionById(params: {
  budgetId: string;
  transactionId: string;
}): Promise<TransactionResponse> {
  return makeRequest<TransactionResponse>(
    "GET",
    `budgets/${encodeURIComponent(params.budgetId)}/transactions/${encodeURIComponent(params.transactionId)}`,
  );
}

/**
 * Updates a single transaction
 */
export async function updateTransaction(params: {
  budgetId: string;
  transactionId: string;
  transaction: PutTransactionWrapper["transaction"];
}): Promise<TransactionResponse> {
  return makeRequest<TransactionResponse>(
    "PUT",
    `budgets/${encodeURIComponent(params.budgetId)}/transactions/${encodeURIComponent(params.transactionId)}`,
    { transaction: params.transaction },
  );
}

/**
 * Deletes a transaction
 */
export async function deleteTransaction(params: {
  budgetId: string;
  transactionId: string;
}): Promise<TransactionResponse> {
  return makeRequest<TransactionResponse>(
    "DELETE",
    `budgets/${encodeURIComponent(params.budgetId)}/transactions/${encodeURIComponent(params.transactionId)}`,
  );
}

/**
 * Returns all transactions for a specified account, excluding any pending transactions
 */
export async function getTransactionsByAccount(params: {
  budgetId: string;
  accountId: string;
  sinceDate?: string;
  type?: "uncategorized" | "unapproved";
  lastKnowledgeOfServer?: number;
}): Promise<TransactionsResponse> {
  const queryParams = new URLSearchParams();
  if (params.sinceDate) queryParams.set("since_date", params.sinceDate);
  if (params.type) queryParams.set("type", params.type);
  if (params.lastKnowledgeOfServer !== undefined) {
    queryParams.set(
      "last_knowledge_of_server",
      String(params.lastKnowledgeOfServer),
    );
  }

  const path = `budgets/${encodeURIComponent(params.budgetId)}/accounts/${encodeURIComponent(params.accountId)}/transactions`;
  const url = queryParams.toString() ? `${path}?${queryParams}` : path;

  return makeRequest<TransactionsResponse>("GET", url);
}

/**
 * Returns all transactions for a specified category
 */
export async function getTransactionsByCategory(params: {
  budgetId: string;
  categoryId: string;
  sinceDate?: string;
  type?: "uncategorized" | "unapproved";
  lastKnowledgeOfServer?: number;
}): Promise<HybridTransactionsResponse> {
  const queryParams = new URLSearchParams();
  if (params.sinceDate) queryParams.set("since_date", params.sinceDate);
  if (params.type) queryParams.set("type", params.type);
  if (params.lastKnowledgeOfServer !== undefined) {
    queryParams.set(
      "last_knowledge_of_server",
      String(params.lastKnowledgeOfServer),
    );
  }

  const path = `budgets/${encodeURIComponent(params.budgetId)}/categories/${encodeURIComponent(params.categoryId)}/transactions`;
  const url = queryParams.toString() ? `${path}?${queryParams}` : path;

  return makeRequest<HybridTransactionsResponse>("GET", url);
}

/**
 * Returns all transactions for a specified payee
 */
export async function getTransactionsByPayee(params: {
  budgetId: string;
  payeeId: string;
  sinceDate?: string;
  type?: "uncategorized" | "unapproved";
  lastKnowledgeOfServer?: number;
}): Promise<HybridTransactionsResponse> {
  const queryParams = new URLSearchParams();
  if (params.sinceDate) queryParams.set("since_date", params.sinceDate);
  if (params.type) queryParams.set("type", params.type);
  if (params.lastKnowledgeOfServer !== undefined) {
    queryParams.set(
      "last_knowledge_of_server",
      String(params.lastKnowledgeOfServer),
    );
  }

  const path = `budgets/${encodeURIComponent(params.budgetId)}/payees/${encodeURIComponent(params.payeeId)}/transactions`;
  const url = queryParams.toString() ? `${path}?${queryParams}` : path;

  return makeRequest<HybridTransactionsResponse>("GET", url);
}

/**
 * Returns all transactions for a specified month
 */
export async function getTransactionsByMonth(params: {
  budgetId: string;
  month: string;
  sinceDate?: string;
  type?: "uncategorized" | "unapproved";
}): Promise<HybridTransactionsResponse> {
  const queryParams = new URLSearchParams();
  if (params.sinceDate) queryParams.set("since_date", params.sinceDate);
  if (params.type) queryParams.set("type", params.type);

  const path = `budgets/${encodeURIComponent(params.budgetId)}/months/${encodeURIComponent(params.month)}/transactions`;
  const url = queryParams.toString() ? `${path}?${queryParams}` : path;

  return makeRequest<HybridTransactionsResponse>("GET", url);
}
