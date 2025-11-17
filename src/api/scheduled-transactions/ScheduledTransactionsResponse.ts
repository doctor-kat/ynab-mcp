import type { ScheduledTransactionDetail } from "./ScheduledTransactionDetail.js";

export interface ScheduledTransactionsResponse {
  data: {
    scheduled_transactions: ScheduledTransactionDetail[];
    server_knowledge: number;
  };
}
