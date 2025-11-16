import type { TransactionFlagColor } from "../transactions/index.js";
import type { ScheduledTransactionFrequency } from "./ScheduledTransactionFrequency.js";

export interface PutScheduledTransactionWrapper {
  scheduled_transaction: UpdateScheduledTransaction;
}

export interface PostScheduledTransactionWrapper {
  scheduled_transaction: SaveScheduledTransaction;
}

export interface SaveScheduledTransaction {
  account_id: string;
  date_first: string;
  date_next: string;
  frequency: ScheduledTransactionFrequency;
  amount: number;
  payee_id?: string | null;
  payee_name?: string | null;
  category_id?: string | null;
  memo?: string | null;
  flag_color?: TransactionFlagColor;
}

export interface UpdateScheduledTransaction {
  account_id?: string;
  date_first?: string;
  date_next?: string;
  frequency?: ScheduledTransactionFrequency;
  amount?: number;
  payee_id?: string | null;
  payee_name?: string | null;
  category_id?: string | null;
  memo?: string | null;
  flag_color?: TransactionFlagColor;
}
