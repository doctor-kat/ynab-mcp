/**
 * Staging tools for transaction categorization and splitting
 */

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { stagingStore, ChangeType } from "../staging/index.js";
import { getTransactionById, updateTransactions } from "../api/index.js";
import {
  errorResult,
  getActiveBudgetIdOrError,
  getCurrencyFormat,
  isReadOnly,
  readOnlyResult,
  successResult,
} from "./utils.js";
import type { SaveSubTransaction } from "../api/index.js";
import { addFormattedAmounts } from "../utils/response-transformer.js";
import { categoryStore, payeeStore } from "../cache/index.js";
import { formatMilliunits } from "../utils/currency-formatter.js";
import { resolveCategoryId } from "./resolvers.js";

/**
 * Stage a categorization change without applying it
 */
export function registerStageCategorizationTool(server: McpServer): void {
  const schemaBase = z.object({
    transactionId: z.string().min(1).describe("The transaction ID (use ynab.getTransactions to discover)"),
    categoryId: z.string().optional().describe("The category ID to assign (use ynab.getCategories to discover)"),
    categoryName: z.string().optional().describe("The category name to assign (alternative to categoryId)"),
    memo: z.string().optional().describe("Optional memo to update"),
    description: z
      .string()
      .optional()
      .describe("Human-readable description of this change"),
  });

  const schema = schemaBase
    .refine((data) => data.categoryId || data.categoryName, {
      message: "Either categoryId or categoryName must be provided",
    })
    .refine((data) => !(data.categoryId && data.categoryName), {
      message: "Cannot provide both categoryId and categoryName",
    });

  type SchemaType = z.infer<typeof schemaBase>;

  server.registerTool(
    "ynab.stageCategorization",
    {
      title: "Stage transaction categorization",
      description:
        "Stage a category change for review without immediately applying it to YNAB for the active budget. Use ynab.reviewChanges to inspect and ynab.applyChanges to commit.",
      inputSchema: schemaBase.shape,
    },
    async (args: SchemaType) => {
      try {
        const budgetId = getActiveBudgetIdOrError();

        // Resolve category name to ID if provided
        let categoryId = args.categoryId;
        if (args.categoryName) {
          const resolvedId = await resolveCategoryId(budgetId, args.categoryName);
          if (!resolvedId) {
            return errorResult(new Error(`Category not found: ${args.categoryName}`));
          }
          categoryId = resolvedId;
        }

        // Fetch current transaction state
        const currentTx = await getTransactionById({
          budgetId,
          transactionId: args.transactionId,
        });

        const transaction = currentTx.data.transaction;

        // Stage the change
        const stagedChange = stagingStore.getState().stageChange({
          type: ChangeType.CATEGORIZATION,
          budgetId,
          transactionId: args.transactionId,
          description:
            args.description ||
            `Categorize transaction to category ${categoryId}`,
          originalTransaction: {
            category_id: transaction.category_id,
            memo: transaction.memo,
          },
          proposedChanges: {
            category_id: categoryId,
            memo: args.memo,
          },
        });

        // Enrich response with context
        const currencyFormat = await getCurrencyFormat();
        const categories = await categoryStore.getState().getCategories(budgetId);
        const payees = await payeeStore.getState().getPayees(budgetId);

        // Resolve category names
        const findCategoryName = (categoryId: string | null | undefined): string => {
          if (!categoryId) return "Uncategorized";
          for (const group of categories) {
            const category = group.categories.find(c => c.id === categoryId);
            if (category) return category.name;
          }
          return categoryId; // Fallback to ID if not found
        };

        // Resolve payee name
        const payeeName = transaction.payee_name ||
          payees.find(p => p.id === transaction.payee_id)?.name ||
          "Unknown";

        // Build human-readable summary
        const formattedAmount = formatMilliunits(transaction.amount, currencyFormat);
        const fromCategory = findCategoryName(transaction.category_id);
        const toCategory = findCategoryName(categoryId);

        const summary = `Staged: ${payeeName} (${formattedAmount}) - Category: ${fromCategory} → ${toCategory}`;

        return successResult(
          `✅ ${summary}\n\nChange ID: ${stagedChange.id}`,
          {
            changeId: stagedChange.id,
            transaction: {
              id: transaction.id,
              date: transaction.date,
              amount: transaction.amount,
              formattedAmount,
              payee_name: payeeName,
              memo: transaction.memo,
            },
            originalState: {
              category_id: transaction.category_id,
              category_name: fromCategory,
              memo: transaction.memo,
            },
            proposedState: {
              category_id: categoryId,
              category_name: toCategory,
              memo: args.memo || transaction.memo,
            },
          },
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

/**
 * Stage a transaction split without applying it
 */
export function registerStageSplitTool(server: McpServer): void {
  const schema = z.object({
    transactionId: z.string().min(1).describe("The transaction ID (use ynab.getTransactions to discover)"),
    subtransactions: z
      .array(
        z
          .object({
            amount: z
              .number()
              .int()
              .describe("Amount in milliunits (e.g., -12340 for -$12.34)"),
            payee_id: z.string().optional().describe("Payee ID (use ynab.getPayees to discover)"),
            payee_name: z.string().optional().describe("Payee name"),
            category_id: z.string().optional().describe("Category ID (use ynab.getCategories to discover)"),
            category_name: z.string().optional().describe("Category name (alternative to category_id)"),
            memo: z.string().optional().describe("Memo"),
          })
          .refine((data) => !(data.category_id && data.category_name), {
            message: "Cannot provide both category_id and category_name",
          }),
      )
      .min(2)
      .describe("Array of subtransactions (must sum to total amount)"),
    description: z
      .string()
      .optional()
      .describe("Human-readable description of this split"),
  });

  server.registerTool(
    "ynab.stageSplit",
    {
      title: "Stage transaction split",
      description:
        "Stage a transaction split into multiple subtransactions for review without immediately applying it for the active budget. Subtransactions must sum to the total transaction amount. Use ynab.reviewChanges to inspect and ynab.applyChanges to commit.",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const budgetId = getActiveBudgetIdOrError();

        // Fetch current transaction state
        const currentTx = await getTransactionById({
          budgetId,
          transactionId: args.transactionId,
        });

        const transaction = currentTx.data.transaction;

        // Resolve category names in subtransactions
        const resolvedSubtransactions = await Promise.all(
          args.subtransactions.map(async (sub) => {
            const resolved = { ...sub };
            if (sub.category_name) {
              const categoryId = await resolveCategoryId(budgetId, sub.category_name);
              if (!categoryId) {
                throw new Error(`Category not found: ${sub.category_name}`);
              }
              resolved.category_id = categoryId;
              delete resolved.category_name;
            }
            return resolved;
          }),
        );

        // Validate subtransactions sum
        const total = resolvedSubtransactions.reduce(
          (sum, sub) => sum + sub.amount,
          0,
        );
        if (total !== transaction.amount) {
          return errorResult(
            new Error(
              `Subtransactions sum (${total}) must equal transaction amount (${transaction.amount})`,
            ),
          );
        }

        // Stage the change
        const stagedChange = stagingStore.getState().stageChange({
          type: ChangeType.SPLIT,
          budgetId,
          transactionId: args.transactionId,
          description:
            args.description ||
            `Split transaction into ${resolvedSubtransactions.length} parts`,
          originalTransaction: {
            category_id: transaction.category_id,
            subtransactions:
              transaction.subtransactions as SaveSubTransaction[],
          },
          proposedChanges: {
            subtransactions: resolvedSubtransactions,
          },
        });

        // Enrich response with context
        const currencyFormat = await getCurrencyFormat();
        const categories = await categoryStore.getState().getCategories(budgetId);
        const payees = await payeeStore.getState().getPayees(budgetId);

        // Helper functions
        const findCategoryName = (categoryId: string | null | undefined): string => {
          if (!categoryId) return "Uncategorized";
          for (const group of categories) {
            const category = group.categories.find(c => c.id === categoryId);
            if (category) return category.name;
          }
          return categoryId;
        };

        const findPayeeName = (payeeId: string | null | undefined, payeeName: string | null | undefined): string => {
          if (payeeName) return payeeName;
          if (!payeeId) return "Unknown";
          return payees.find(p => p.id === payeeId)?.name || payeeId;
        };

        // Format transaction details
        const formattedAmount = formatMilliunits(transaction.amount, currencyFormat);
        const transactionPayeeName = findPayeeName(transaction.payee_id, transaction.payee_name);

        // Format subtransactions with enriched data
        const enrichedSubtransactions = resolvedSubtransactions.map(sub => ({
          amount: sub.amount,
          formattedAmount: formatMilliunits(sub.amount, currencyFormat),
          category_id: sub.category_id,
          category_name: findCategoryName(sub.category_id),
          payee_id: sub.payee_id,
          payee_name: findPayeeName(sub.payee_id, sub.payee_name),
          memo: sub.memo,
        }));

        // Build human-readable summary
        const splitSummary = enrichedSubtransactions
          .map(sub => `  - ${sub.formattedAmount} → ${sub.category_name}`)
          .join("\n");

        const summary = `Staged split: ${transactionPayeeName} (${formattedAmount}) → ${resolvedSubtransactions.length} parts\n${splitSummary}`;

        return successResult(
          `✅ ${summary}\n\nChange ID: ${stagedChange.id}`,
          {
            changeId: stagedChange.id,
            transaction: {
              id: transaction.id,
              date: transaction.date,
              amount: transaction.amount,
              formattedAmount,
              payee_name: transactionPayeeName,
              memo: transaction.memo,
            },
            subtransactions: enrichedSubtransactions,
            subtransactionCount: args.subtransactions.length,
          },
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

/**
 * Review all staged changes
 */
export function registerReviewChangesTool(server: McpServer): void {
  const schema = z.object({
    transactionId: z
      .string()
      .optional()
      .describe("Optional: filter by specific transaction ID"),
  });

  server.registerTool(
    "ynab.reviewChanges",
    {
      title: "Review staged changes",
      description:
        "List all staged changes awaiting approval. Shows what will happen when ynab.applyChanges is called.",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        let changes = stagingStore.getState().getStagedChanges();

        // Filter by transaction if specified
        if (args.transactionId) {
          changes = changes.filter(
            (c) => c.transactionId === args.transactionId,
          );
        }

        if (changes.length === 0) {
          return successResult("No staged changes to review.", {
            count: 0,
            changes: [],
          });
        }

        const changeDetails = changes.map((change) => ({
          changeId: change.id,
          type: change.type,
          description: change.description,
          budgetId: change.budgetId,
          transactionId: change.transactionId,
          stagedAt: change.timestamp.toISOString(),
          originalState: change.originalTransaction,
          proposedChanges: change.proposedChanges,
        }));

        const summary = changes
          .map(
            (c, i) =>
              `${i + 1}. [${c.type}] ${c.description} (change ID: ${c.id})`,
          )
          .join("\n");

        // Add formatted currency amounts to change details
        const currencyFormat = await getCurrencyFormat();
        const formattedData = addFormattedAmounts(
          {
            count: changes.length,
            changes: changeDetails,
          },
          currencyFormat,
        );

        return successResult(
          `📋 ${changes.length} staged change(s):\n\n${summary}\n\nUse ynab.applyChanges to commit these changes to YNAB.`,
          formattedData,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

/**
 * Apply all staged changes to YNAB
 */
export function registerApplyChangesTool(server: McpServer): void {
  const schema = z.object({
    changeIds: z
      .array(z.string())
      .optional()
      .describe(
        "Optional: specific change IDs to apply (if omitted, applies all staged changes)",
      ),
  });

  server.registerTool(
    "ynab.applyChanges",
    {
      title: "Apply staged changes",
      description:
        "Commit staged changes to YNAB API. This makes the changes permanent.",
      inputSchema: schema.shape,
    },
    async (args) => {
      if (isReadOnly()) {
        return readOnlyResult();
      }

      try {
        let changesToApply = stagingStore.getState().getStagedChanges();

        // Filter by specific IDs if provided
        if (args.changeIds && args.changeIds.length > 0) {
          changesToApply = changesToApply.filter((c) =>
            args.changeIds!.includes(c.id),
          );
        }

        if (changesToApply.length === 0) {
          return successResult("No staged changes to apply.", {
            appliedCount: 0,
          });
        }

        // Group changes by budget ID for batch processing
        const changesByBudget = new Map<string, typeof changesToApply>();
        for (const change of changesToApply) {
          const existing = changesByBudget.get(change.budgetId) || [];
          existing.push(change);
          changesByBudget.set(change.budgetId, existing);
        }

        const results = [];
        let successCount = 0;
        let failureCount = 0;

        // Apply changes per budget using batch endpoint
        for (const [budgetId, budgetChanges] of changesByBudget) {
          try {
            // Map to batch update format
            const transactions = budgetChanges.map((change) => ({
              id: change.transactionId,
              ...change.proposedChanges,
            }));

            const response = await updateTransactions({
              budgetId,
              transactions,
            });

            // Verify response contains transaction_ids
            if (!response.data.transaction_ids || response.data.transaction_ids.length === 0) {
              throw new Error("Update response did not contain any transaction_ids");
            }

            // Create set of successfully updated transaction IDs for fast lookup
            const updatedIds = new Set(response.data.transaction_ids);

            // Log duplicate import IDs if present (informational only)
            if (response.data.duplicate_import_ids && response.data.duplicate_import_ids.length > 0) {
              console.warn(`⚠️  Duplicate import IDs detected: ${response.data.duplicate_import_ids.join(", ")}`);
            }

            // Process each change based on whether its transaction was updated
            for (const change of budgetChanges) {
              if (updatedIds.has(change.transactionId)) {
                // Transaction was successfully updated
                stagingStore.getState().clearStagedChange(change.id);
                results.push({
                  changeId: change.id,
                  transactionId: change.transactionId,
                  status: "success",
                });
                successCount++;
              } else {
                // Transaction was not in the response
                results.push({
                  changeId: change.id,
                  transactionId: change.transactionId,
                  status: "failed",
                  error: "Transaction ID not found in update response",
                });
                failureCount++;
              }
            }
          } catch (error) {
            // Batch failed - mark all in this batch as failed
            for (const change of budgetChanges) {
              results.push({
                changeId: change.id,
                transactionId: change.transactionId,
                status: "failed",
                error: error instanceof Error ? error.message : String(error),
              });
              failureCount++;
            }
          }
        }

        const summary = `✅ Applied ${successCount} change(s) in ${changesByBudget.size} batch(es)${failureCount > 0 ? `, ${failureCount} failed` : ""}`;

        return successResult(summary, {
          appliedCount: successCount,
          failedCount: failureCount,
          batchCount: changesByBudget.size,
          results,
        });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

/**
 * Clear staged changes
 */
export function registerClearChangesTool(server: McpServer): void {
  const schema = z.object({
    changeIds: z
      .array(z.string())
      .optional()
      .describe(
        "Optional: specific change IDs to clear (if omitted, clears all staged changes)",
      ),
  });

  server.registerTool(
    "ynab.clearChanges",
    {
      title: "Clear staged changes",
      description:
        "Discard staged changes without applying them. This cannot be undone.",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        if (!args.changeIds || args.changeIds.length === 0) {
          // Clear all
          const count = stagingStore.getState().clearStagedChanges();
          return successResult(`🗑️ Cleared ${count} staged change(s)`, {
            clearedCount: count,
          });
        } else {
          // Clear specific changes
          let clearedCount = 0;
          for (const id of args.changeIds) {
            if (stagingStore.getState().clearStagedChange(id)) {
              clearedCount++;
            }
          }
          return successResult(`🗑️ Cleared ${clearedCount} staged change(s)`, {
            clearedCount,
          });
        }
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
