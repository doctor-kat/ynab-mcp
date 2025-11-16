import type {
  TransactionFlagColor,
  TransactionFlagName,
} from "../transactions/index.js";

export interface ScheduledTransactionSummary {
  id: string;
  date_first: string;
  date_next: string;
  frequency:
    | "never"
    | "daily"
    | "weekly"
    | "everyOtherWeek"
    | "twiceAMonth"
    | "every4Weeks"
    | "monthly"
    | "everyOtherMonth"
    | "every3Months"
    | "every4Months"
    | "twiceAYear"
    | "yearly"
    | "everyOtherYear";
  amount: number;
  memo?: string | null;
  flag_color?: TransactionFlagColor;
  flag_name?: TransactionFlagName;
  account_id: string;
  payee_id?: string | null;
  category_id?: string | null;
  transfer_account_id?: string | null;
  deleted: boolean;
}
