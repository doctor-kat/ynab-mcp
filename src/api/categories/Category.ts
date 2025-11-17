export interface CategoryResponse {
  data: {
    category: Category;
  };
}

export interface Category {
  id: string;
  category_group_id: string;
  category_group_name?: string;
  name: string;
  hidden: boolean;
  original_category_group_id?: string | null;
  note?: string | null;
  budgeted: number;
  activity: number;
  balance: number;
  goal_type?: ("TB" | "TBD" | "MF" | "NEED" | "DEBT" | null);
  goal_needs_whole_amount?: boolean | null;
  goal_day?: number | null;
  goal_cadence?: number | null;
  goal_cadence_frequency?: number | null;
  goal_creation_month?: string | null;
  goal_target?: number | null;
  goal_target_month?: string | null;
  goal_percentage_complete?: number | null;
  goal_months_to_budget?: number | null;
  goal_under_funded?: number | null;
  goal_overall_funded?: number | null;
  goal_overall_left?: number | null;
  goal_snoozed_at?: string | null;
  deleted: boolean;
}
