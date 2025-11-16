/**
 * Staging tools for transaction categorization and splitting
 */

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { stagedChanges } from "../staging/staged-changes.js";
import { ChangeType } from "../staging/types.js";
import { getTransactionById, updateTransactions } from "../api/index.js";
import {
  errorResult,
  isReadOnly,
  readOnlyResult,
  successResult,
} from "./utils.js";
import type { SaveSubTransaction } from "../api/index.js";

/**
 * Stage a categorization change without applying it
 */
export function registerStageCategorizationTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The budget ID"),
    transactionId: z.string().min(1).describe("The transaction ID"),
    categoryId: z.string().describe("The category ID to assign"),
    memo: z.string().optional().describe("Optional memo to update"),
    description: z
      .string()
      .optional()
      .describe("Human-readable description of this change"),
  });

  server.registerTool(
    "ynab.stageCategorization",
    {
      title: "Stage transaction categorization",
      description:
        "Stage a category change for review without immediately applying it to YNAB. Use ynab.reviewChanges to inspect and ynab.applyChanges to commit. Requires budgetId (use ynab.getBudgetContext to get your budgetId), transactionId (use ynab.getTransactions if needed), and categoryId (use ynab.getCategories if needed).",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        // Fetch current transaction state
        const currentTx = await getTransactionById({
          budgetId: args.budgetId,
          transactionId: args.transactionId,
        });

        const transaction = currentTx.data.transaction;

        // Stage the change
        const stagedChange = stagedChanges.stageChange({
          type: ChangeType.CATEGORIZATION,
          budgetId: args.budgetId,
          transactionId: args.transactionId,
          description:
            args.description ||
            `Categorize transaction to category ${args.categoryId}`,
          originalTransaction: {
            category_id: transaction.category_id,
            memo: transaction.memo,
          },
          proposedChanges: {
            category_id: args.categoryId,
            memo: args.memo,
          },
        });

        return successResult(
          `✅ Staged categorization for transaction ${args.transactionId} (change ID: ${stagedChange.id})`,
          {
            changeId: stagedChange.id,
            transactionId: args.transactionId,
            changes: {
              category_id: {
                from: transaction.category_id,
                to: args.categoryId,
              },
              memo: args.memo
                ? { from: transaction.memo, to: args.memo }
                : undefined,
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
    budgetId: z.string().min(1).describe("The budget ID"),
    transactionId: z.string().min(1).describe("The transaction ID"),
    subtransactions: z
      .array(
        z.object({
          amount: z
            .number()
            .int()
            .describe("Amount in milliunits (e.g., -12340 for -$12.34)"),
          payee_id: z.string().optional().describe("Payee ID"),
          payee_name: z.string().optional().describe("Payee name"),
          category_id: z.string().optional().describe("Category ID"),
          memo: z.string().optional().describe("Memo"),
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
        "Stage a transaction split into multiple subtransactions for review without immediately applying it. Subtransactions must sum to the total transaction amount. Use ynab.reviewChanges to inspect and ynab.applyChanges to commit. Requires budgetId (use ynab.getBudgetContext to get your budgetId) and transactionId (use ynab.getTransactions if needed). For category_id and payee_id values in subtransactions, use ynab.getCategories or ynab.getPayees.",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        // Fetch current transaction state
        const currentTx = await getTransactionById({
          budgetId: args.budgetId,
          transactionId: args.transactionId,
        });

        const transaction = currentTx.data.transaction;

        // Validate subtransactions sum
        const total = args.subtransactions.reduce(
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
        const stagedChange = stagedChanges.stageChange({
          type: ChangeType.SPLIT,
          budgetId: args.budgetId,
          transactionId: args.transactionId,
          description:
            args.description ||
            `Split transaction into ${args.subtransactions.length} parts`,
          originalTransaction: {
            category_id: transaction.category_id,
            subtransactions:
              transaction.subtransactions as SaveSubTransaction[],
          },
          proposedChanges: {
            subtransactions: args.subtransactions,
          },
        });

        return successResult(
          `✅ Staged split for transaction ${args.transactionId} into ${args.subtransactions.length} parts (change ID: ${stagedChange.id})`,
          {
            changeId: stagedChange.id,
            transactionId: args.transactionId,
            totalAmount: transaction.amount,
            subtransactionCount: args.subtransactions.length,
            subtransactions: args.subtransactions,
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
        let changes = stagedChanges.getStagedChanges();

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

        return successResult(
          `📋 ${changes.length} staged change(s):\n\n${summary}\n\nUse ynab.applyChanges to commit these changes to YNAB.`,
          {
            count: changes.length,
            changes: changeDetails,
          },
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
        let changesToApply = stagedChanges.getStagedChanges();

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
                stagedChanges.clearStagedChange(change.id);
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
          const count = stagedChanges.clearStagedChanges();
          return successResult(`🗑️ Cleared ${count} staged change(s)`, {
            clearedCount: count,
          });
        } else {
          // Clear specific changes
          let clearedCount = 0;
          for (const id of args.changeIds) {
            if (stagedChanges.clearStagedChange(id)) {
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
