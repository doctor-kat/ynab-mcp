/**
 * Mock fetch implementation for testing
 * Provides utilities to mock HTTP responses without making real network calls
 */

export interface MockResponse {
  status?: number;
  ok?: boolean;
  data?: unknown;
  headers?: Record<string, string>;
}

export interface MockFetchOptions {
  defaultResponse?: MockResponse;
  responses?: Map<string, MockResponse>;
}

/**
 * Creates a mock fetch function that returns predefined responses
 */
export function createMockFetch(options: MockFetchOptions = {}) {
  const {
    defaultResponse = { status: 200, ok: true, data: {} },
    responses = new Map(),
  } = options;

  const calls: Array<{ url: string; init?: RequestInit }> = [];

  const mockFetch = async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = typeof input === "string" ? input : input.toString();

    // Record the call
    calls.push({ url, init });

    // Find matching response
    let response = defaultResponse;
    for (const [pattern, mockResponse] of responses.entries()) {
      if (url.includes(pattern)) {
        response = mockResponse;
        break;
      }
    }

    const { status = 200, ok = true, data = {} } = response;

    // Create mock Response object
    return {
      ok,
      status,
      statusText: ok ? "OK" : "Error",
      headers: new Headers(response.headers || {}),
      text: async () => JSON.stringify(data),
      json: async () => data,
      blob: async () => new Blob([JSON.stringify(data)]),
      arrayBuffer: async () => new ArrayBuffer(0),
      formData: async () => new FormData(),
      clone: function () {
        return this;
      },
      body: null,
      bodyUsed: false,
      url,
      redirected: false,
      type: "basic",
    } as Response;
  };

  return {
    fetch: mockFetch as typeof fetch,
    calls,
    reset: () => {
      calls.length = 0;
    },
  };
}

/**
 * Common YNAB API mock responses
 */
export const mockYnabResponses = {
  budgets: {
    data: {
      budgets: [
        {
          id: "budget-123",
          name: "Test Budget",
          last_modified_on: "2025-01-01T00:00:00.000Z",
          first_month: "2024-01-01",
          last_month: "2025-12-31",
          currency_format: {
            iso_code: "USD",
            example_format: "$123.45",
            decimal_digits: 2,
            decimal_separator: ".",
            symbol_first: true,
            group_separator: ",",
            currency_symbol: "$",
            display_symbol: true,
          },
        },
      ],
      default_budget: {
        id: "budget-123",
        name: "Test Budget",
      },
    },
  },

  budgetDetail: {
    data: {
      budget: {
        id: "budget-123",
        name: "Test Budget",
        last_modified_on: "2025-01-01T00:00:00.000Z",
        first_month: "2024-01-01",
        last_month: "2025-12-31",
        accounts: [],
        payees: [],
        payee_locations: [],
        category_groups: [],
        categories: [],
        months: [],
        transactions: [],
        subtransactions: [],
        scheduled_transactions: [],
        scheduled_subtransactions: [],
      },
      server_knowledge: 100,
    },
  },

  transactions: {
    data: {
      transactions: [
        {
          id: "tx-123",
          date: "2025-01-15",
          amount: -50000,
          memo: "Test transaction",
          cleared: "cleared",
          approved: true,
          flag_color: null,
          account_id: "account-123",
          payee_id: "payee-123",
          category_id: null,
          transfer_account_id: null,
          transfer_transaction_id: null,
          matched_transaction_id: null,
          import_id: null,
          import_payee_name: null,
          import_payee_name_original: null,
          debt_transaction_type: null,
          deleted: false,
        },
      ],
      server_knowledge: 50,
    },
  },

  accounts: {
    data: {
      accounts: [
        {
          id: "account-123",
          name: "Checking",
          type: "checking",
          on_budget: true,
          closed: false,
          balance: 1000000,
          cleared_balance: 950000,
          uncleared_balance: 50000,
          transfer_payee_id: "payee-transfer-123",
          direct_import_linked: false,
          direct_import_in_error: false,
          deleted: false,
        },
      ],
      server_knowledge: 25,
    },
  },

  categories: {
    data: {
      category_groups: [
        {
          id: "group-123",
          name: "Monthly Bills",
          hidden: false,
          deleted: false,
          categories: [
            {
              id: "cat-123",
              category_group_id: "group-123",
              category_group_name: "Monthly Bills",
              name: "Groceries",
              hidden: false,
              budgeted: 500000,
              activity: -350000,
              balance: 150000,
              goal_type: null,
              goal_day: null,
              goal_cadence: null,
              goal_cadence_frequency: null,
              goal_creation_month: null,
              goal_target: 0,
              goal_target_month: null,
              goal_percentage_complete: null,
              goal_months_to_budget: null,
              goal_under_funded: null,
              goal_overall_funded: null,
              goal_overall_left: null,
              deleted: false,
            },
          ],
        },
      ],
    },
  },

  error: {
    error: {
      id: "401",
      name: "unauthorized",
      detail: "Unauthorized",
    },
  },
};
