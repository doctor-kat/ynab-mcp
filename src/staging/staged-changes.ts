/**
 * Staged changes tracker for managing transaction modifications before applying
 */

import { randomUUID } from "crypto";
import type { SessionState, StagedChange } from "./types.js";

/**
 * Singleton staged changes tracker
 */
class StagedChangesTracker {
  private state: SessionState;

  constructor() {
    this.state = {
      sessionId: randomUUID(),
      stagedChanges: new Map(),
    };
  }

  /**
   * Get the current session ID
   */
  getSessionId(): string {
    return this.state.sessionId;
  }

  /**
   * Stage a new change
   */
  stageChange(change: Omit<StagedChange, "id" | "timestamp">): StagedChange {
    const stagedChange: StagedChange = {
      ...change,
      id: randomUUID(),
      timestamp: new Date(),
    };

    this.state.stagedChanges.set(stagedChange.id, stagedChange);
    return stagedChange;
  }

  /**
   * Get all staged changes
   */
  getStagedChanges(): StagedChange[] {
    return Array.from(this.state.stagedChanges.values());
  }

  /**
   * Get a specific staged change by ID
   */
  getStagedChange(id: string): StagedChange | undefined {
    return this.state.stagedChanges.get(id);
  }

  /**
   * Get staged changes for a specific transaction
   */
  getStagedChangesForTransaction(
    budgetId: string,
    transactionId: string,
  ): StagedChange[] {
    return this.getStagedChanges().filter(
      (change) =>
        change.budgetId === budgetId && change.transactionId === transactionId,
    );
  }

  /**
   * Clear all staged changes
   */
  clearStagedChanges(): number {
    const count = this.state.stagedChanges.size;
    this.state.stagedChanges.clear();
    return count;
  }

  /**
   * Clear a specific staged change
   */
  clearStagedChange(id: string): boolean {
    return this.state.stagedChanges.delete(id);
  }

  /**
   * Get statistics about current state
   */
  getStats(): {
    sessionId: string;
    stagedCount: number;
  } {
    return {
      sessionId: this.state.sessionId,
      stagedCount: this.state.stagedChanges.size,
    };
  }

  /**
   * Reset the entire session (for testing or cleanup)
   */
  reset(): void {
    this.state = {
      sessionId: randomUUID(),
      stagedChanges: new Map(),
    };
  }
}

/**
 * Global singleton instance
 */
export const stagedChanges = new StagedChangesTracker();
