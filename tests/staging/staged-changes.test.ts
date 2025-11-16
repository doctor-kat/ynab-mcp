/**
 * Tests for change tracker functionality
 */

import { describe, it, beforeEach, expect } from "vitest";
import { stagedChanges } from "../../src/staging/staged-changes.js";
import { ChangeType } from "../../src/staging/types.js";

describe("StagedChanges", () => {
  beforeEach(() => {
    stagedChanges.reset();
  });

  it("should reset tracker state", () => {
    const stats = stagedChanges.getStats();
    expect(stats.stagedCount).toBe(0);
  });

  it("should stage a categorization change", () => {
    const stagedChange = stagedChanges.stageChange({
      type: ChangeType.CATEGORIZATION,
      budgetId: "budget-123",
      transactionId: "txn-456",
      description: "Test categorization",
      originalTransaction: {
        category_id: "old-cat",
      },
      proposedChanges: {
        category_id: "new-cat",
      },
    });

    expect(stagedChange.id).toBeTruthy();
    expect(stagedChange.type).toBe(ChangeType.CATEGORIZATION);
    expect(stagedChange.budgetId).toBe("budget-123");
    expect(stagedChange.transactionId).toBe("txn-456");

    const stats = stagedChanges.getStats();
    expect(stats.stagedCount).toBe(1);
  });

  it("should stage a split change", () => {
    const stagedChange = stagedChanges.stageChange({
      type: ChangeType.SPLIT,
      budgetId: "budget-123",
      transactionId: "txn-789",
      description: "Split into 2 parts",
      originalTransaction: {
        category_id: "cat-1",
      },
      proposedChanges: {
        subtransactions: [
          { amount: -5000, category_id: "cat-2" },
          { amount: -5000, category_id: "cat-3" },
        ],
      },
    });

    expect(stagedChange.id).toBeTruthy();
    expect(stagedChange.type).toBe(ChangeType.SPLIT);
    expect(stagedChange.proposedChanges.subtransactions?.length).toBe(2);

    const stats = stagedChanges.getStats();
    expect(stats.stagedCount).toBe(1);
  });

  it("should retrieve staged changes", () => {
    stagedChanges.stageChange({
      type: ChangeType.CATEGORIZATION,
      budgetId: "budget-123",
      transactionId: "txn-1",
      description: "Change 1",
      originalTransaction: {},
      proposedChanges: {},
    });

    stagedChanges.stageChange({
      type: ChangeType.CATEGORIZATION,
      budgetId: "budget-123",
      transactionId: "txn-2",
      description: "Change 2",
      originalTransaction: {},
      proposedChanges: {},
    });

    const changes = stagedChanges.getStagedChanges();
    expect(changes.length).toBe(2);
  });

  it("should filter staged changes by transaction", () => {
    stagedChanges.stageChange({
      type: ChangeType.CATEGORIZATION,
      budgetId: "budget-123",
      transactionId: "txn-1",
      description: "Change 1",
      originalTransaction: {},
      proposedChanges: {},
    });

    stagedChanges.stageChange({
      type: ChangeType.CATEGORIZATION,
      budgetId: "budget-123",
      transactionId: "txn-2",
      description: "Change 2",
      originalTransaction: {},
      proposedChanges: {},
    });

    const filtered = stagedChanges.getStagedChangesForTransaction(
      "budget-123",
      "txn-1"
    );
    expect(filtered.length).toBe(1);
    expect(filtered[0].transactionId).toBe("txn-1");
  });

  it("should clear all staged changes", () => {
    stagedChanges.stageChange({
      type: ChangeType.CATEGORIZATION,
      budgetId: "budget-123",
      transactionId: "txn-1",
      description: "Change 1",
      originalTransaction: {},
      proposedChanges: {},
    });

    stagedChanges.stageChange({
      type: ChangeType.CATEGORIZATION,
      budgetId: "budget-123",
      transactionId: "txn-2",
      description: "Change 2",
      originalTransaction: {},
      proposedChanges: {},
    });

    const count = stagedChanges.clearStagedChanges();
    expect(count).toBe(2);

    const stats = stagedChanges.getStats();
    expect(stats.stagedCount).toBe(0);
  });

  it("should clear specific staged change", () => {
    const staged1 = stagedChanges.stageChange({
      type: ChangeType.CATEGORIZATION,
      budgetId: "budget-123",
      transactionId: "txn-1",
      description: "Change 1",
      originalTransaction: {},
      proposedChanges: {},
    });

    const staged2 = stagedChanges.stageChange({
      type: ChangeType.CATEGORIZATION,
      budgetId: "budget-123",
      transactionId: "txn-2",
      description: "Change 2",
      originalTransaction: {},
      proposedChanges: {},
    });

    const cleared = stagedChanges.clearStagedChange(staged1.id);
    expect(cleared).toBe(true);

    const stats = stagedChanges.getStats();
    expect(stats.stagedCount).toBe(1);

    // staged2 should still exist
    const remaining = stagedChanges.getStagedChange(staged2.id);
    expect(remaining).toBeTruthy();
  });

  it("should have unique session ID after reset", () => {
    const sessionId1 = stagedChanges.getSessionId();

    stagedChanges.reset();
    const sessionId2 = stagedChanges.getSessionId();

    expect(sessionId1).not.toBe(sessionId2);
  });
});
