/**
 * Name-to-ID resolvers for YNAB entities
 * Enables name-based lookups using cached data
 */

import { accountStore, categoryStore, payeeStore } from "../cache/index.js";

/**
 * Resolve an account name to an account ID
 * Uses case-insensitive matching
 *
 * @param budgetId - The budget ID
 * @param accountName - The account name to resolve
 * @returns The account ID if found, null otherwise
 */
export async function resolveAccountId(
  budgetId: string,
  accountName: string,
): Promise<string | null> {
  const accounts = await accountStore.getState().getAccounts(budgetId);
  const normalizedName = accountName.toLowerCase().trim();

  // Try exact match first
  const exactMatch = accounts.find(
    (account) => account.name.toLowerCase() === normalizedName,
  );
  if (exactMatch) {
    return exactMatch.id;
  }

  // Try partial match (account name contains search term)
  const partialMatch = accounts.find((account) =>
    account.name.toLowerCase().includes(normalizedName),
  );
  if (partialMatch) {
    return partialMatch.id;
  }

  return null;
}

/**
 * Resolve a category name to a category ID
 * Searches across all category groups
 * Uses case-insensitive matching
 *
 * @param budgetId - The budget ID
 * @param categoryName - The category name to resolve
 * @returns The category ID if found, null otherwise
 */
export async function resolveCategoryId(
  budgetId: string,
  categoryName: string,
): Promise<string | null> {
  const categoryGroups = await categoryStore.getState().getCategories(budgetId);
  const normalizedName = categoryName.toLowerCase().trim();

  // Search all category groups for exact match
  for (const group of categoryGroups) {
    const exactMatch = group.categories.find(
      (category) => category.name.toLowerCase() === normalizedName,
    );
    if (exactMatch) {
      return exactMatch.id;
    }
  }

  // Search for partial match
  for (const group of categoryGroups) {
    const partialMatch = group.categories.find((category) =>
      category.name.toLowerCase().includes(normalizedName),
    );
    if (partialMatch) {
      return partialMatch.id;
    }
  }

  return null;
}

/**
 * Resolve a category group name to a category group ID
 * Uses case-insensitive matching
 *
 * @param budgetId - The budget ID
 * @param categoryGroupName - The category group name to resolve
 * @returns The category group ID if found, null otherwise
 */
export async function resolveCategoryGroupId(
  budgetId: string,
  categoryGroupName: string,
): Promise<string | null> {
  const categoryGroups = await categoryStore.getState().getCategories(budgetId);
  const normalizedName = categoryGroupName.toLowerCase().trim();

  // Try exact match first
  const exactMatch = categoryGroups.find(
    (group) => group.name.toLowerCase() === normalizedName,
  );
  if (exactMatch) {
    return exactMatch.id;
  }

  // Try partial match (category group name contains search term)
  const partialMatch = categoryGroups.find((group) =>
    group.name.toLowerCase().includes(normalizedName),
  );
  if (partialMatch) {
    return partialMatch.id;
  }

  return null;
}

/**
 * Resolve a payee name to a payee ID
 * Uses case-insensitive matching
 *
 * @param budgetId - The budget ID
 * @param payeeName - The payee name to resolve
 * @returns The payee ID if found, null otherwise
 */
export async function resolvePayeeId(
  budgetId: string,
  payeeName: string,
): Promise<string | null> {
  const payees = await payeeStore.getState().getPayees(budgetId);
  const normalizedName = payeeName.toLowerCase().trim();

  // Try exact match first
  const exactMatch = payees.find(
    (payee) => payee.name.toLowerCase() === normalizedName,
  );
  if (exactMatch) {
    return exactMatch.id;
  }

  // Try partial match (payee name contains search term)
  const partialMatch = payees.find((payee) =>
    payee.name.toLowerCase().includes(normalizedName),
  );
  if (partialMatch) {
    return partialMatch.id;
  }

  return null;
}
