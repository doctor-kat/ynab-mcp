import { randomUUID } from "crypto";
import { createStore } from "zustand/vanilla";
import type { StagedChange } from "./types.js";

/**
 * Staging state
 */
export interface StagingState {
  /** Session identifier */
  sessionId: string;

  /** Map of staged changes: changeId -> StagedChange */
  stagedChanges: Map<string, StagedChange>;
}

/**
 * Staging actions
 */
export interface StagingActions {
  /**
   * Get the current session ID
   */
  getSessionId: () => string;

  /**
   * Stage a new change
   */
  stageChange: (change: Omit<StagedChange, "id" | "timestamp">) => StagedChange;

  /**
   * Get all staged changes
   */
  getStagedChanges: () => StagedChange[];

  /**
   * Get a specific staged change by ID
   */
  getStagedChange: (id: string) => StagedChange | undefined;

  /**
   * Get staged changes for a specific transaction
   */
  getStagedChangesForTransaction: (
    budgetId: string,
    transactionId: string
  ) => StagedChange[];

  /**
   * Clear all staged changes
   */
  clearStagedChanges: () => number;

  /**
   * Clear a specific staged change
   */
  clearStagedChange: (id: string) => boolean;

  /**
   * Get statistics about current state
   */
  getStats: () => {
    sessionId: string;
    stagedCount: number;
  };

  /**
   * Reset the entire session (for testing or cleanup)
   */
  reset: () => void;
}

/**
 * Zustand vanilla store for staged changes
 *
 * Manages transaction modifications before applying them to YNAB.
 * - Stage-review-apply workflow prevents accidental changes
 * - In-memory state (persists during server session)
 * - Session-scoped isolation
 */
export const stagingStore = createStore<StagingState & StagingActions>()((set, get) => ({
  // Initial state
  sessionId: randomUUID(),
  stagedChanges: new Map(),

  // Actions
  getSessionId() {
    return get().sessionId;
  },

  stageChange(change: Omit<StagedChange, "id" | "timestamp">) {
    const stagedChange: StagedChange = {
      ...change,
      id: randomUUID(),
      timestamp: new Date(),
    };

    // Create new Map with added change (immutable update)
    set((state) => ({
      stagedChanges: new Map(state.stagedChanges).set(
        stagedChange.id,
        stagedChange
      ),
    }));

    return stagedChange;
  },

  getStagedChanges() {
    return Array.from(get().stagedChanges.values());
  },

  getStagedChange(id: string) {
    return get().stagedChanges.get(id);
  },

  getStagedChangesForTransaction(budgetId: string, transactionId: string) {
    return get()
      .getStagedChanges()
      .filter(
        (change) =>
          change.budgetId === budgetId && change.transactionId === transactionId
      );
  },

  clearStagedChanges() {
    const count = get().stagedChanges.size;
    set({ stagedChanges: new Map() });
    return count;
  },

  clearStagedChange(id: string) {
    const currentChanges = get().stagedChanges;
    if (!currentChanges.has(id)) {
      return false;
    }

    // Create new Map without the deleted change (immutable update)
    const newChanges = new Map(currentChanges);
    newChanges.delete(id);
    set({ stagedChanges: newChanges });
    return true;
  },

  getStats() {
    const state = get();
    return {
      sessionId: state.sessionId,
      stagedCount: state.stagedChanges.size,
    };
  },

  reset() {
    set({
      sessionId: randomUUID(),
      stagedChanges: new Map(),
    });
  },
}));
