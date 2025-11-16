/**
 * Tests for change tracker functionality
 */

import { describe, it, beforeEach, expect } from "vitest";
import { stagingStore, ChangeType } from "../../src/staging/index.js";

describe("StagedChanges", () => {
  beforeEach(() => {
    stagingStore.getState().reset();
  });

  it("should reset tracker state", () => {
    const stats = stagingStore.getState().getStats();
    expect(stats.stagedCount).toBe(0);
  });

  it("should stage a categorization change", () => {
    const stagedChange = stagingStore.getState().stageChange({
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

    const stats = stagingStore.getState().getStats();
    expect(stats.stagedCount).toBe(1);
  });

  it("should stage a split change", () => {
    const stagedChange = stagingStore.getState().stageChange({
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

    const stats = stagingStore.getState().getStats();
    expect(stats.stagedCount).toBe(1);
  });

  it("should retrieve staged changes", () => {
    stagingStore.getState().stageChange({
      type: ChangeType.CATEGORIZATION,
      budgetId: "budget-123",
      transactionId: "txn-1",
      description: "Change 1",
      originalTransaction: {},
      proposedChanges: {},
    });

    stagingStore.getState().stageChange({
      type: ChangeType.CATEGORIZATION,
      budgetId: "budget-123",
      transactionId: "txn-2",
      description: "Change 2",
      originalTransaction: {},
      proposedChanges: {},
    });

    const changes = stagingStore.getState().getStagedChanges();
    expect(changes.length).toBe(2);
  });

  it("should filter staged changes by transaction", () => {
    stagingStore.getState().stageChange({
      type: ChangeType.CATEGORIZATION,
      budgetId: "budget-123",
      transactionId: "txn-1",
      description: "Change 1",
      originalTransaction: {},
      proposedChanges: {},
    });

    stagingStore.getState().stageChange({
      type: ChangeType.CATEGORIZATION,
      budgetId: "budget-123",
      transactionId: "txn-2",
      description: "Change 2",
      originalTransaction: {},
      proposedChanges: {},
    });

    const filtered = stagingStore.getState().getStagedChangesForTransaction(
      "budget-123",
      "txn-1"
    );
    expect(filtered.length).toBe(1);
    expect(filtered[0].transactionId).toBe("txn-1");
  });

  it("should clear all staged changes", () => {
    stagingStore.getState().stageChange({
      type: ChangeType.CATEGORIZATION,
      budgetId: "budget-123",
      transactionId: "txn-1",
      description: "Change 1",
      originalTransaction: {},
      proposedChanges: {},
    });

    stagingStore.getState().stageChange({
      type: ChangeType.CATEGORIZATION,
      budgetId: "budget-123",
      transactionId: "txn-2",
      description: "Change 2",
      originalTransaction: {},
      proposedChanges: {},
    });

    const count = stagingStore.getState().clearStagedChanges();
    expect(count).toBe(2);

    const stats = stagingStore.getState().getStats();
    expect(stats.stagedCount).toBe(0);
  });

  it("should clear specific staged change", () => {
    const staged1 = stagingStore.getState().stageChange({
      type: ChangeType.CATEGORIZATION,
      budgetId: "budget-123",
      transactionId: "txn-1",
      description: "Change 1",
      originalTransaction: {},
      proposedChanges: {},
    });

    const staged2 = stagingStore.getState().stageChange({
      type: ChangeType.CATEGORIZATION,
      budgetId: "budget-123",
      transactionId: "txn-2",
      description: "Change 2",
      originalTransaction: {},
      proposedChanges: {},
    });

    const cleared = stagingStore.getState().clearStagedChange(staged1.id);
    expect(cleared).toBe(true);

    const stats = stagingStore.getState().getStats();
    expect(stats.stagedCount).toBe(1);

    // staged2 should still exist
    const remaining = stagingStore.getState().getStagedChange(staged2.id);
    expect(remaining).toBeTruthy();
  });

  it("should have unique session ID after reset", () => {
    const sessionId1 = stagingStore.getState().getSessionId();

    stagingStore.getState().reset();
    const sessionId2 = stagingStore.getState().getSessionId();

    expect(sessionId1).not.toBe(sessionId2);
  });
});
