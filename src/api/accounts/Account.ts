import type { AccountType } from "./AccountType.js";
import type { LoanAccountPeriodicValue } from "./LoanAccountPeriodicValue.js";

export interface AccountsResponse {
  data: {
    accounts: Account[];
    server_knowledge: number;
  };
}

export interface AccountResponse {
  data: {
    account: Account;
  };
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  on_budget: boolean;
  closed: boolean;
  note?: string | null;
  balance: number;
  cleared_balance: number;
  uncleared_balance: number;
  transfer_payee_id: string | null;
  direct_import_linked?: boolean;
  direct_import_in_error?: boolean;
  last_reconciled_at?: string | null;
  debt_original_balance?: number | null;
  debt_interest_rates?: LoanAccountPeriodicValue;
  debt_minimum_payments?: LoanAccountPeriodicValue;
  debt_escrow_amounts?: LoanAccountPeriodicValue;
  deleted: boolean;
}
