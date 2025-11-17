import type { SaveTransactionWithOptionalFields } from "./SaveTransactionWithOptionalFields.js";

export interface PutTransactionWrapper {
  transaction: ExistingTransaction;
}

export type ExistingTransaction = {} & SaveTransactionWithOptionalFields;
