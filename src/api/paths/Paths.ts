import type { UserResponse } from "../user/index.js";
import type { ErrorResponse } from "../common/index.js";
import type {
  BudgetSummaryResponse,
  BudgetDetailResponse,
  BudgetSettingsResponse,
} from "../budgets/index.js";
import type {
  AccountResponse,
  AccountsResponse,
  PostAccountWrapper,
} from "../accounts/index.js";
import type {
  CategoriesResponse,
  CategoryResponse,
  PatchCategoryWrapper,
  SaveCategoryResponse,
  PatchMonthCategoryWrapper,
} from "../categories/index.js";
import type {
  PayeeResponse,
  PayeesResponse,
  PatchPayeeWrapper,
  SavePayeeResponse,
} from "../payees/index.js";
import type {
  PayeeLocationResponse,
  PayeeLocationsResponse,
} from "../payee-locations/index.js";
import type {
  MonthSummariesResponse,
  MonthDetailResponse,
} from "../months/index.js";
import type {
  TransactionsResponse,
  PostTransactionsWrapper,
  PatchTransactionsWrapper,
  SaveTransactionsResponse,
  TransactionsImportResponse,
  TransactionResponse,
  PutTransactionWrapper,
  HybridTransactionsResponse,
} from "../transactions/index.js";
import type {
  ScheduledTransactionsResponse,
  PostScheduledTransactionWrapper,
  PutScheduledTransactionWrapper,
  ScheduledTransactionResponse,
} from "../scheduled-transactions/index.js";

export interface Paths {
  "/user": {
    get: {
      responses: {
        200: UserResponse;
        default: ErrorResponse;
      };
    };
  };
  "/budgets": {
    get: {
      parameters: {
        query: {
          include_accounts?: boolean;
        };
      };
      responses: {
        200: BudgetSummaryResponse;
        404: ErrorResponse;
        default: ErrorResponse;
      };
    };
  };
  "/budgets/{budget_id}": {
    get: {
      parameters: {
        path: {
          budget_id: string;
        };
        query: {
          last_knowledge_of_server?: number;
        };
      };
      responses: {
        200: BudgetDetailResponse;
        404: ErrorResponse;
        default: ErrorResponse;
      };
    };
  };
  "/budgets/{budget_id}/settings": {
    get: {
      parameters: {
        path: {
          budget_id: string;
        };
      };
      responses: {
        200: BudgetSettingsResponse;
        404: ErrorResponse;
        default: ErrorResponse;
      };
    };
  };
  "/budgets/{budget_id}/accounts": {
    get: {
      parameters: {
        path: {
          budget_id: string;
        };
        query: {
          last_knowledge_of_server?: number;
        };
      };
      responses: {
        200: AccountsResponse;
        404: ErrorResponse;
        default: ErrorResponse;
      };
    };
    post: {
      parameters: {
        path: {
          budget_id: string;
        };
      };
      requestBody: {
        content: {
          "application/json": PostAccountWrapper;
        };
      };
      responses: {
        201: AccountResponse;
        400: ErrorResponse;
      };
    };
  };
  "/budgets/{budget_id}/accounts/{account_id}": {
    get: {
      parameters: {
        path: {
          budget_id: string;
          account_id: string;
        };
      };
      responses: {
        200: AccountResponse;
        404: ErrorResponse;
        default: ErrorResponse;
      };
    };
  };
  "/budgets/{budget_id}/categories": {
    get: {
      parameters: {
        path: {
          budget_id: string;
        };
        query: {
          last_knowledge_of_server?: number;
        };
      };
      responses: {
        200: CategoriesResponse;
        404: ErrorResponse;
        default: ErrorResponse;
      };
    };
  };
  "/budgets/{budget_id}/categories/{category_id}": {
    get: {
      parameters: {
        path: {
          budget_id: string;
          category_id: string;
        };
      };
      responses: {
        200: CategoryResponse;
        404: ErrorResponse;
        default: ErrorResponse;
      };
    };
    patch: {
      parameters: {
        path: {
          budget_id: string;
          category_id: string;
        };
      };
      requestBody: {
        content: {
          "application/json": PatchCategoryWrapper;
        };
      };
      responses: {
        200: SaveCategoryResponse;
        400: ErrorResponse;
      };
    };
  };
  "/budgets/{budget_id}/months/{month}/categories/{category_id}": {
    get: {
      parameters: {
        path: {
          budget_id: string;
          month: string;
          category_id: string;
        };
      };
      responses: {
        200: CategoryResponse;
        404: ErrorResponse;
        default: ErrorResponse;
      };
    };
    patch: {
      parameters: {
        path: {
          budget_id: string;
          month: string;
          category_id: string;
        };
      };
      requestBody: {
        content: {
          "application/json": PatchMonthCategoryWrapper;
        };
      };
      responses: {
        200: SaveCategoryResponse;
        400: ErrorResponse;
      };
    };
  };
  "/budgets/{budget_id}/payees": {
    get: {
      parameters: {
        path: {
          budget_id: string;
        };
        query: {
          last_knowledge_of_server?: number;
        };
      };
      responses: {
        200: PayeesResponse;
        404: ErrorResponse;
        default: ErrorResponse;
      };
    };
  };
  "/budgets/{budget_id}/payees/{payee_id}": {
    get: {
      parameters: {
        path: {
          budget_id: string;
          payee_id: string;
        };
      };
      responses: {
        200: PayeeResponse;
        404: ErrorResponse;
        default: ErrorResponse;
      };
    };
    patch: {
      parameters: {
        path: {
          budget_id: string;
          payee_id: string;
        };
      };
      requestBody: {
        content: {
          "application/json": PatchPayeeWrapper;
        };
      };
      responses: {
        200: SavePayeeResponse;
        400: ErrorResponse;
      };
    };
  };
  "/budgets/{budget_id}/payee_locations": {
    get: {
      parameters: {
        path: {
          budget_id: string;
        };
      };
      responses: {
        200: PayeeLocationsResponse;
        404: ErrorResponse;
        default: ErrorResponse;
      };
    };
  };
  "/budgets/{budget_id}/payee_locations/{payee_location_id}": {
    get: {
      parameters: {
        path: {
          budget_id: string;
          payee_location_id: string;
        };
      };
      responses: {
        200: PayeeLocationResponse;
        404: ErrorResponse;
        default: ErrorResponse;
      };
    };
  };
  "/budgets/{budget_id}/payees/{payee_id}/payee_locations": {
    get: {
      parameters: {
        path: {
          budget_id: string;
          payee_id: string;
        };
      };
      responses: {
        200: PayeeLocationsResponse;
        404: ErrorResponse;
        default: ErrorResponse;
      };
    };
  };
  "/budgets/{budget_id}/months": {
    get: {
      parameters: {
        path: {
          budget_id: string;
        };
        query: {
          last_knowledge_of_server?: number;
        };
      };
      responses: {
        200: MonthSummariesResponse;
        404: ErrorResponse;
        default: ErrorResponse;
      };
    };
  };
  "/budgets/{budget_id}/months/{month}": {
    get: {
      parameters: {
        path: {
          budget_id: string;
          month: string;
        };
      };
      responses: {
        200: MonthDetailResponse;
        404: ErrorResponse;
        default: ErrorResponse;
      };
    };
  };
  "/budgets/{budget_id}/transactions": {
    get: {
      parameters: {
        path: {
          budget_id: string;
        };
        query: {
          since_date?: string;
          type?: "uncategorized" | "unapproved";
          last_knowledge_of_server?: number;
        };
      };
      responses: {
        200: TransactionsResponse;
        400: ErrorResponse;
        404: ErrorResponse;
      };
    };
    post: {
      parameters: {
        path: {
          budget_id: string;
        };
      };
      requestBody: {
        content: {
          "application/json": PostTransactionsWrapper;
        };
      };
      responses: {
        201: SaveTransactionsResponse;
        400: ErrorResponse;
        409: ErrorResponse;
      };
    };
    patch: {
      parameters: {
        path: {
          budget_id: string;
        };
      };
      requestBody: {
        content: {
          "application/json": PatchTransactionsWrapper;
        };
      };
      responses: {
        209: SaveTransactionsResponse;
        400: ErrorResponse;
      };
    };
  };
  "/budgets/{budget_id}/transactions/import": {
    post: {
      parameters: {
        path: {
          budget_id: string;
        };
      };
      responses: {
        200: TransactionsImportResponse;
        201: TransactionsImportResponse;
        400: ErrorResponse;
      };
    };
  };
  "/budgets/{budget_id}/transactions/{transaction_id}": {
    get: {
      parameters: {
        path: {
          budget_id: string;
          transaction_id: string;
        };
      };
      responses: {
        200: TransactionResponse;
        404: ErrorResponse;
        default: ErrorResponse;
      };
    };
    put: {
      parameters: {
        path: {
          budget_id: string;
          transaction_id: string;
        };
      };
      requestBody: {
        content: {
          "application/json": PutTransactionWrapper;
        };
      };
      responses: {
        200: TransactionResponse;
        400: ErrorResponse;
      };
    };
    delete: {
      parameters: {
        path: {
          budget_id: string;
          transaction_id: string;
        };
      };
      responses: {
        200: TransactionResponse;
        404: ErrorResponse;
      };
    };
  };
  "/budgets/{budget_id}/accounts/{account_id}/transactions": {
    get: {
      parameters: {
        path: {
          budget_id: string;
          account_id: string;
        };
        query: {
          since_date?: string;
          type?: "uncategorized" | "unapproved";
          last_knowledge_of_server?: number;
        };
      };
      responses: {
        200: TransactionsResponse;
        404: ErrorResponse;
        default: ErrorResponse;
      };
    };
  };
  "/budgets/{budget_id}/categories/{category_id}/transactions": {
    get: {
      parameters: {
        path: {
          budget_id: string;
          category_id: string;
        };
        query: {
          since_date?: string;
          type?: "uncategorized" | "unapproved";
          last_knowledge_of_server?: number;
        };
      };
      responses: {
        200: HybridTransactionsResponse;
        404: ErrorResponse;
        default: ErrorResponse;
      };
    };
  };
  "/budgets/{budget_id}/payees/{payee_id}/transactions": {
    get: {
      parameters: {
        path: {
          budget_id: string;
          payee_id: string;
        };
        query: {
          since_date?: string;
          type?: "uncategorized" | "unapproved";
          last_knowledge_of_server?: number;
        };
      };
      responses: {
        200: HybridTransactionsResponse;
        404: ErrorResponse;
        default: ErrorResponse;
      };
    };
  };
  "/budgets/{budget_id}/months/{month}/transactions": {
    get: {
      parameters: {
        path: {
          budget_id: string;
          month: string;
        };
        query: {
          since_date?: string;
          type?: "uncategorized" | "unapproved";
          last_knowledge_of_server?: number;
        };
      };
      responses: {
        200: TransactionsResponse;
        404: ErrorResponse;
        default: ErrorResponse;
      };
    };
  };
  "/budgets/{budget_id}/scheduled_transactions": {
    get: {
      parameters: {
        path: {
          budget_id: string;
        };
        query: {
          last_knowledge_of_server?: number;
        };
      };
      responses: {
        200: ScheduledTransactionsResponse;
        404: ErrorResponse;
        default: ErrorResponse;
      };
    };
    post: {
      parameters: {
        path: {
          budget_id: string;
        };
      };
      requestBody: {
        content: {
          "application/json": PostScheduledTransactionWrapper;
        };
      };
      responses: {
        201: ScheduledTransactionResponse;
        400: ErrorResponse;
      };
    };
  };
  "/budgets/{budget_id}/scheduled_transactions/{scheduled_transaction_id}": {
    get: {
      parameters: {
        path: {
          budget_id: string;
          scheduled_transaction_id: string;
        };
      };
      responses: {
        200: ScheduledTransactionResponse;
        404: ErrorResponse;
        default: ErrorResponse;
      };
    };
    put: {
      parameters: {
        path: {
          budget_id: string;
          scheduled_transaction_id: string;
        };
      };
      requestBody: {
        content: {
          "application/json": PutScheduledTransactionWrapper;
        };
      };
      responses: {
        200: ScheduledTransactionResponse;
        400: ErrorResponse;
      };
    };
    delete: {
      parameters: {
        path: {
          budget_id: string;
          scheduled_transaction_id: string;
        };
      };
      responses: {
        200: ScheduledTransactionResponse;
        404: ErrorResponse;
      };
    };
  };
}

export const EndpointMetadata = {
  "/user": ["get"],
  "/budgets": ["get"],
  "/budgets/{budget_id}": ["get"],
  "/budgets/{budget_id}/settings": ["get"],
  "/budgets/{budget_id}/accounts": ["get", "post"],
  "/budgets/{budget_id}/accounts/{account_id}": ["get"],
  "/budgets/{budget_id}/categories": ["get"],
  "/budgets/{budget_id}/categories/{category_id}": ["get", "patch"],
  "/budgets/{budget_id}/months/{month}/categories/{category_id}": [
    "get",
    "patch",
  ],
  "/budgets/{budget_id}/payees": ["get"],
  "/budgets/{budget_id}/payees/{payee_id}": ["get", "patch"],
  "/budgets/{budget_id}/payee_locations": ["get"],
  "/budgets/{budget_id}/payee_locations/{payee_location_id}": ["get"],
  "/budgets/{budget_id}/payees/{payee_id}/payee_locations": ["get"],
  "/budgets/{budget_id}/months": ["get"],
  "/budgets/{budget_id}/months/{month}": ["get"],
  "/budgets/{budget_id}/transactions": ["get", "post", "patch"],
  "/budgets/{budget_id}/transactions/import": ["post"],
  "/budgets/{budget_id}/transactions/{transaction_id}": [
    "get",
    "put",
    "delete",
  ],
  "/budgets/{budget_id}/accounts/{account_id}/transactions": ["get"],
  "/budgets/{budget_id}/categories/{category_id}/transactions": ["get"],
  "/budgets/{budget_id}/payees/{payee_id}/transactions": ["get"],
  "/budgets/{budget_id}/months/{month}/transactions": ["get"],
  "/budgets/{budget_id}/scheduled_transactions": ["get", "post"],
  "/budgets/{budget_id}/scheduled_transactions/{scheduled_transaction_id}": [
    "get",
    "put",
    "delete",
  ],
} as const;
