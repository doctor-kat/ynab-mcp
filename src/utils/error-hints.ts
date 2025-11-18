import type { CurrencyFormat } from "../api/common/CurrencyFormat.js";
import { formatMilliunits } from "./currency-formatter.js";

/**
 * Context for generating helpful error hints
 */
export interface ErrorContext {
  /** HTTP status code (e.g., 400, 404, 409) */
  status?: number;
  /** Error message from the API or exception */
  message: string;
  /** Operation being performed (e.g., "creating transaction", "updating category") */
  operation?: string;
  /** Entity type involved (e.g., "transaction", "category", "payee") */
  entityType?: string;
  /** Entity ID involved (if applicable) */
  entityId?: string;
  /** Additional context data */
  data?: unknown;
}

/**
 * Split validation error context
 */
export interface SplitValidationContext {
  expectedMilliunits: number;
  actualMilliunits: number;
  currencyFormat?: CurrencyFormat;
}

/**
 * Generate actionable hints based on HTTP status code
 */
export function getErrorHint(context: ErrorContext): string {
  const { status, message, operation, entityType, entityId } = context;

  // Handle specific status codes with actionable hints
  if (status) {
    switch (status) {
      case 400:
        return getBadRequestHint(context);
      case 401:
        return "Authentication failed. Check that your YNAB_ACCESS_TOKEN is valid and not expired. Generate a new token at https://app.ynab.com/settings/developer";
      case 403:
        return "Permission denied. This operation is not allowed with your current access token permissions.";
      case 404:
        return getNotFoundHint(context);
      case 409:
        return getConflictHint(context);
      case 429:
        return "Rate limit exceeded. YNAB API limits: 200 requests per hour. Wait before retrying or reduce request frequency.";
      case 500:
      case 502:
      case 503:
        return "YNAB API server error. This is a temporary issue with YNAB's servers. Wait a moment and retry.";
      default:
        if (status >= 500) {
          return "YNAB API server error. This is a temporary issue with YNAB's servers. Wait a moment and retry.";
        }
    }
  }

  // Handle validation errors (typically client-side)
  if (message.includes("milliunit") || message.includes("sum")) {
    return "Split transaction validation failed. Subtransactions must sum exactly to the parent transaction amount (in milliunits).";
  }

  // Handle resolution errors (entity not found)
  if (message.includes("not found") || message.includes("could not be resolved")) {
    return getNotFoundHint(context);
  }

  // Handle budget context errors
  if (message.includes("No active budget") || message.includes("No budgets found")) {
    return "Budget context error. Use ynab.getAvailableBudgets to see available budgets, then ynab.setActiveBudget to select one.";
  }

  // Generic hint
  return "Review the error message above for details. Check parameter values and try again.";
}

/**
 * Generate hints for 400 Bad Request errors
 */
function getBadRequestHint(context: ErrorContext): string {
  const { message, entityType } = context;

  // Transaction-specific bad request hints
  if (entityType === "transaction") {
    if (message.includes("account")) {
      return "Invalid account. Use ynab.getAccounts to get valid account IDs, or provide account_name instead of account_id.";
    }
    if (message.includes("category")) {
      return "Invalid category. Use ynab.getCategories to get valid category IDs, or provide category_name instead of category_id.";
    }
    if (message.includes("payee")) {
      return "Invalid payee. Use ynab.getPayees to get valid payee IDs, or provide payee_name to create a new payee.";
    }
    if (message.includes("date")) {
      return "Invalid date format. Use ISO format YYYY-MM-DD (e.g., '2025-01-15'). Dates cannot be in the future for regular transactions.";
    }
    if (message.includes("amount")) {
      return "Invalid amount. Amounts must be integers in milliunits (e.g., -50000 for -$50.00). Use negative for expenses, positive for income.";
    }
    if (message.includes("subtransactions") || message.includes("split")) {
      return "Invalid split. Subtransactions must sum exactly to parent amount. Set to true when using includeMilliunits=true to see exact amounts.";
    }
  }

  // Category-specific bad request hints
  if (entityType === "category") {
    if (message.includes("budgeted") || message.includes("amount")) {
      return "Invalid budget amount. Amounts must be integers in milliunits (e.g., 50000 for $50.00). Use positive values.";
    }
    if (message.includes("hidden") || message.includes("deleted")) {
      return "Cannot modify hidden or deleted categories. Check category status with ynab.getCategory first.";
    }
  }

  // Month/budget-specific hints
  if (message.includes("month")) {
    return "Invalid month format. Use ISO format YYYY-MM-DD for the first day of the month (e.g., '2025-01-01', not '2025-01-15').";
  }

  // Generic bad request
  return "Invalid request parameters. Review the error message for specific validation failures and check the parameter format.";
}

/**
 * Generate hints for 404 Not Found errors
 */
function getNotFoundHint(context: ErrorContext): string {
  const { entityType, entityId, operation } = context;

  const hints = {
    transaction: "Transaction not found. It may have been deleted or the ID is incorrect. Use ynab.getTransactions to find valid transaction IDs.",
    category: "Category not found. It may have been deleted or the ID/name is incorrect. Use ynab.getCategories to find valid categories.",
    account: "Account not found. It may have been closed or the ID/name is incorrect. Use ynab.getAccounts to find valid accounts.",
    payee: "Payee not found. It may have been deleted or the ID is incorrect. Use ynab.getPayees to find valid payees.",
    budget: "Budget not found. Use ynab.getAvailableBudgets to see available budgets.",
    month: "Month not found. Ensure the month exists in the budget and use YYYY-MM-DD format for the first day of the month.",
  };

  if (entityType && hints[entityType as keyof typeof hints]) {
    return hints[entityType as keyof typeof hints];
  }

  // Generic not found with ID context
  if (entityId) {
    return `${entityType || "Entity"} with ID '${entityId}' not found. Verify the ID is correct and the entity hasn't been deleted.`;
  }

  // Generic not found
  return "Resource not found. Verify the ID/name is correct and the resource hasn't been deleted. Use the appropriate 'get' tool to discover valid IDs.";
}

/**
 * Generate hints for 409 Conflict errors
 */
function getConflictHint(context: ErrorContext): string {
  const { message, entityType } = context;

  // Import ID conflicts
  if (message.includes("import_id") || message.includes("duplicate")) {
    return "Duplicate transaction detected (same import_id). This transaction may have already been imported. Use a unique import_id or omit it to allow duplicates.";
  }

  // Optimistic locking conflicts
  if (message.includes("knowledge") || message.includes("version")) {
    return "Data conflict: The entity was modified by another client. Fetch the latest data and retry your operation.";
  }

  // Category/account conflicts
  if (entityType === "category" && message.includes("goal")) {
    return "Category goal conflict. Check goal_type and goal_target for valid combinations. Some goal types don't support target amounts.";
  }

  // Generic conflict
  return "Conflict detected. The operation conflicts with the current state of the resource. Refresh the data and retry.";
}

/**
 * Generate hint for split transaction validation errors with formatted amounts
 */
export function getSplitValidationHint(context: SplitValidationContext): string {
  const { expectedMilliunits, actualMilliunits, currencyFormat } = context;

  const expectedFormatted = formatMilliunits(expectedMilliunits, currencyFormat);
  const actualFormatted = formatMilliunits(actualMilliunits, currencyFormat);
  const differenceMilliunits = actualMilliunits - expectedMilliunits;
  const differenceFormatted = formatMilliunits(
    Math.abs(differenceMilliunits),
    currencyFormat,
  );

  const direction =
    differenceMilliunits > 0
      ? `over by ${differenceFormatted}`
      : `under by ${differenceFormatted}`;

  return [
    `Split transaction validation failed:`,
    `• Expected subtransactions to sum to: ${expectedFormatted} (${expectedMilliunits} milliunits)`,
    `• Actual subtransactions sum to: ${actualFormatted} (${actualMilliunits} milliunits)`,
    `• Difference: ${direction}`,
    ``,
    `Fix: Adjust subtransaction amounts so they sum exactly to ${expectedFormatted}.`,
    `Remember: 1000 milliunits = 1 currency unit (e.g., $1.00 = 1000 milliunits).`,
  ].join("\n");
}

/**
 * Get common next steps after an error
 */
export function getNextSteps(context: ErrorContext): string[] {
  const { status, entityType } = context;

  const steps: string[] = [];

  // Status-specific next steps
  if (status === 404 && entityType) {
    steps.push(`1. Use ynab.get${capitalize(entityType)}s to list all available ${entityType}s`);
    steps.push(`2. Verify the ${entityType} ID/name is correct`);
    steps.push(`3. Retry the operation with a valid ${entityType} ID`);
  } else if (status === 400) {
    steps.push("1. Review the error message for specific validation failures");
    steps.push("2. Check parameter formats (dates: YYYY-MM-DD, amounts: milliunits)");
    steps.push("3. Use includeMilliunits=true to see exact amounts for splits");
    steps.push("4. Retry with corrected parameters");
  } else if (status === 409) {
    steps.push("1. Fetch the latest data for the entity");
    steps.push("2. Resolve any conflicts manually");
    steps.push("3. Retry the operation");
  } else if (status === 429) {
    steps.push("1. Wait 60 seconds before retrying");
    steps.push("2. Reduce request frequency if this error persists");
  }

  return steps;
}

/**
 * Capitalize first letter of a string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
