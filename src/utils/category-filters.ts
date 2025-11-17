/**
 * Filtering and field selection utilities for category tools
 */

import type { Category, CategoryGroup, CategoryGroupWithCategories } from "../api/index.js";

export interface CategoryFilterOptions {
  includeHidden?: boolean;
  includeDeleted?: boolean;
  namePattern?: string;
}

export interface CategoryGroupFilterOptions {
  includeHidden?: boolean;
  includeDeleted?: boolean;
}

/**
 * Filter category groups based on hidden/deleted status
 */
export function filterCategoryGroups(
  groups: CategoryGroup[],
  options: CategoryGroupFilterOptions = {},
): CategoryGroup[] {
  const { includeHidden = false, includeDeleted = false } = options;

  return groups.filter((group) => {
    if (!includeHidden && group.hidden) return false;
    if (!includeDeleted && group.deleted) return false;
    return true;
  });
}

/**
 * Filter categories based on hidden/deleted status and name pattern
 */
export function filterCategories(
  categories: Category[],
  options: CategoryFilterOptions = {},
): Category[] {
  const { includeHidden = false, includeDeleted = false, namePattern } = options;

  return categories.filter((category) => {
    if (!includeHidden && category.hidden) return false;
    if (!includeDeleted && category.deleted) return false;
    if (namePattern) {
      const normalizedPattern = namePattern.toLowerCase().trim();
      const normalizedName = category.name.toLowerCase();
      if (!normalizedName.includes(normalizedPattern)) return false;
    }
    return true;
  });
}

/**
 * Select minimal or full fields for a category
 */
export function selectCategoryFields(category: Category, full: boolean = false): Partial<Category> {
  if (full) {
    // Return all fields
    return category;
  }

  // Return minimal fields only
  return {
    id: category.id,
    name: category.name,
    category_group_id: category.category_group_id,
    category_group_name: category.category_group_name,
    hidden: category.hidden,
    deleted: category.deleted,
  };
}

/**
 * Select minimal fields for a category group (no nested categories)
 */
export function selectCategoryGroupFields(group: CategoryGroup): Partial<CategoryGroup> {
  return {
    id: group.id,
    name: group.name,
    hidden: group.hidden,
    deleted: group.deleted,
  };
}

/**
 * Filter and transform category groups with their categories
 */
export function filterCategoryGroupsWithCategories(
  groups: CategoryGroupWithCategories[],
  groupOptions: CategoryGroupFilterOptions = {},
  categoryOptions: CategoryFilterOptions = {},
  full: boolean = false,
): any[] {
  const filteredGroups = filterCategoryGroups(groups, groupOptions) as CategoryGroupWithCategories[];

  return filteredGroups.map((group) => {
    const filteredCategories = filterCategories(group.categories, categoryOptions);
    const selectedCategories = filteredCategories.map((cat) =>
      selectCategoryFields(cat, full),
    );

    if (full) {
      return {
        ...group,
        categories: selectedCategories,
      };
    } else {
      return {
        id: group.id,
        name: group.name,
        hidden: group.hidden,
        deleted: group.deleted,
        categories: selectedCategories,
      };
    }
  });
}
