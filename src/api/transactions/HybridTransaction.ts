import type { TransactionSummary } from "./TransactionSummary.js";

export interface HybridTransactionsResponse {
  data: {
    transactions: HybridTransaction[];
    server_knowledge?: number;
  };
}

export type HybridTransaction = TransactionSummary & {
  type: "transaction" | "subtransaction";
  parent_transaction_id?: string | null;
  account_name: string;
  payee_name?: string | null;
  category_name?: string;
};
