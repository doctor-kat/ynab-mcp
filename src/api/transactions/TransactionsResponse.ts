import type { TransactionDetail } from "./TransactionDetail.js";

export interface TransactionsResponse {
  data: {
    transactions: TransactionDetail[];
    server_knowledge: number;
  };
}
