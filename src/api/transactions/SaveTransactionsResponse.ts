import type { TransactionDetail } from "./TransactionDetail.js";

export interface SaveTransactionsResponse {
  data: {
    transaction_ids: string[];
    transaction?: TransactionDetail;
    transactions?: TransactionDetail[];
    duplicate_import_ids?: string[];
    server_knowledge: number;
  };
}
