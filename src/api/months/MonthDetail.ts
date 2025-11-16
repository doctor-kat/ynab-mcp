import type { MonthSummary } from "./MonthSummary.js";
import type { Category } from "../categories/index.js";

export interface MonthDetailResponse {
  data: {
    month: MonthDetail;
  };
}

export type MonthDetail = MonthSummary & {
  categories: Category[];
};
