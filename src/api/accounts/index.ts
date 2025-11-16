import type {
  AccountsResponse,
  AccountResponse,
} from "./Account.js";
import type { PostAccountWrapper } from "./SaveAccount.js";
import { makeRequest } from "../client.js";

export * from './Account.js';
export * from './AccountType.js';
export * from './LoanAccountPeriodicValue.js';
export * from './SaveAccount.js';

/**
 * Returns all accounts
 */
export async function getAccounts(params: {
  budgetId: string;
  lastKnowledgeOfServer?: number;
}): Promise<AccountsResponse> {
  const queryParams = new URLSearchParams();
  if (params.lastKnowledgeOfServer !== undefined) {
    queryParams.set(
      "last_knowledge_of_server",
      String(params.lastKnowledgeOfServer),
    );
  }

  const path = `/budgets/${encodeURIComponent(params.budgetId)}/accounts`;
  const url = queryParams.toString() ? `${path}?${queryParams}` : path;

  return makeRequest<AccountsResponse>("GET", url);
}

/**
 * Creates a new account
 */
export async function createAccount(params: {
  budgetId: string;
  account: PostAccountWrapper["account"];
}): Promise<AccountResponse> {
  return makeRequest<AccountResponse>(
    "POST",
    `/budgets/${encodeURIComponent(params.budgetId)}/accounts`,
    { account: params.account },
  );
}

/**
 * Returns a single account
 */
export async function getAccountById(params: {
  budgetId: string;
  accountId: string;
}): Promise<AccountResponse> {
  return makeRequest<AccountResponse>(
    "GET",
    `/budgets/${encodeURIComponent(params.budgetId)}/accounts/${encodeURIComponent(params.accountId)}`,
  );
}
