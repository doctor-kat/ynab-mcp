import type { CategoryGroup } from "./CategoryGroup.js";
import type { Category } from "./Category.js";

export interface CategoriesResponse {
  data: {
    category_groups: CategoryGroupWithCategories[];
    server_knowledge: number;
  };
}

export type CategoryGroupWithCategories = CategoryGroup & {
  categories: Category[];
};
