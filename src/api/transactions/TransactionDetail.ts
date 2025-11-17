import type { TransactionSummary } from "./TransactionSummary.js";
import type { SubTransaction } from "./SubTransaction.js";

export interface TransactionResponse {
  data: {
    transaction: TransactionDetail;
    server_knowledge: number;
  };
}

export type TransactionDetail = TransactionSummary & {
  account_name: string;
  payee_name?: string | null;
  category_name?: string | null;
  subtransactions: SubTransaction[];
};
