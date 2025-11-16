import type { DateFormat, CurrencyFormat } from "../common/index.js";

export interface BudgetSettingsResponse {
  data: {
    settings: BudgetSettings;
  };
}

export interface BudgetSettings {
  date_format: DateFormat;
  currency_format: CurrencyFormat;
}
