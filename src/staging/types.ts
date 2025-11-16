/**
 * Types for staged change management and rollback functionality
 */

import type { SaveTransactionWithOptionalFields } from "../api/transactions/SaveTransactionWithOptionalFields.js";
import type { SaveSubTransaction } from "../api/transactions/SaveSubTransaction.js";

/**
 * Status of a change in the system
 */
export enum ChangeStatus {
  STAGED = "staged",
}

/**
 * Type of change operation
 */
export enum ChangeType {
  CATEGORIZATION = "categorization",
  SPLIT = "split",
  UPDATE = "update",
}

/**
 * Represents a staged change that hasn't been applied yet
 */
export interface StagedChange {
  id: string;
  type: ChangeType;
  budgetId: string;
  transactionId: string;
  description: string;
  timestamp: Date;

  // Original transaction state (for rollback)
  originalTransaction?: {
    category_id?: string | null;
    payee_id?: string | null;
    memo?: string | null;
    subtransactions?: SaveSubTransaction[];
  };

  // Proposed changes
  proposedChanges: {
    category_id?: string | null;
    payee_id?: string | null;
    memo?: string | null;
    subtransactions?: SaveSubTransaction[];
    cleared?: SaveTransactionWithOptionalFields["cleared"];
    approved?: boolean;
    flag_color?: SaveTransactionWithOptionalFields["flag_color"];
    flag_name?: string | null;
  };
}

/**
 * Session state for tracking changes
 */
export interface SessionState {
  sessionId: string;
  stagedChanges: Map<string, StagedChange>;
}
