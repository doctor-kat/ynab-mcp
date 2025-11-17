import type { ScheduledTransactionSummary } from "./ScheduledTransactionSummary.js";
import type { ScheduledSubTransaction } from "./ScheduledSubTransaction.js";

export interface ScheduledTransactionResponse {
  data: {
    scheduled_transaction: ScheduledTransactionDetail;
  };
}

export type ScheduledTransactionDetail = ScheduledTransactionSummary & {
  account_name: string;
  payee_name?: string | null;
  category_name?: string | null;
  subtransactions: ScheduledSubTransaction[];
};
