import type { BudgetSummary } from "./BudgetSummary.js";
import type { Account } from "../accounts/index.js";
import type { Payee } from "../payees/index.js";
import type { PayeeLocation } from "../payee-locations/index.js";
import type { CategoryGroup, Category } from "../categories/index.js";
import type { MonthDetail } from "../months/index.js";
import type {
  TransactionSummary,
  SubTransaction,
} from "../transactions/index.js";
import type {
  ScheduledTransactionSummary,
  ScheduledSubTransaction,
} from "../scheduled-transactions/index.js";

export interface BudgetDetailResponse {
  data: {
    budget: BudgetDetail;
    server_knowledge: number;
  };
}

export type BudgetDetail = BudgetSummary & {
  accounts?: Account[];
  payees?: Payee[];
  payee_locations?: PayeeLocation[];
  category_groups?: CategoryGroup[];
  categories?: Category[];
  months?: MonthDetail[];
  transactions?: TransactionSummary[];
  subtransactions?: SubTransaction[];
  scheduled_transactions?: ScheduledTransactionSummary[];
  scheduled_subtransactions?: ScheduledSubTransaction[];
};
