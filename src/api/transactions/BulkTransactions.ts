import type { SaveTransactionWithOptionalFields } from "./SaveTransactionWithOptionalFields.js";

export interface TransactionsImportResponse {
  data: {
    transaction_ids: string[];
  };
}

export interface BulkResponse {
  data: {
    bulk: {
      transaction_ids: string[];
      duplicate_import_ids: string[];
    };
  };
}

export interface BulkTransactions {
  transactions: SaveTransactionWithOptionalFields[];
}
