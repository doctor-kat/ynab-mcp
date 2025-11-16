import type { DateFormat, CurrencyFormat } from "../common/index.js";
import type { Account } from "../accounts/index.js";

export interface BudgetSummaryResponse {
  data: {
    budgets: BudgetSummary[];
    default_budget?: BudgetSummary;
  };
}

export interface BudgetSummary {
  id: string;
  name: string;
  last_modified_on?: string;
  first_month?: string;
  last_month?: string;
  date_format?: DateFormat;
  currency_format?: CurrencyFormat;
  accounts?: Account[];
}
