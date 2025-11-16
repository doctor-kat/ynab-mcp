import { describe, test, beforeAll } from "vitest";
import { initializeClient } from "../../src/api/client.js";
import { getBudgets } from "../../src/api/budgets/index.js";
import { loadEnv } from "../../src/env.js";

/**
 * Debug test suite for investigating 404 errors with getBudgets endpoint
 *
 * This test makes REAL API calls and logs detailed information.
 * Run with: pnpm test tests/debug/budgets-debug.test.ts
 *
 * To enable, change test.skip to test
 */
describe("getBudgets Debug Test", () => {
  beforeAll(() => {
    // Load environment and initialize client
    const env = loadEnv();
    console.log("\n=== Environment Configuration ===");
    console.log("YNAB_BASE_URL:", env.YNAB_BASE_URL);
    console.log(
      "YNAB_ACCESS_TOKEN:",
      env.YNAB_ACCESS_TOKEN
        ? `${env.YNAB_ACCESS_TOKEN.substring(0, 10)}...`
        : "NOT SET",
    );
    console.log("MCP_SERVER_NAME:", env.MCP_SERVER_NAME);
    console.log("READ_ONLY:", env.READ_ONLY);
    console.log("=================================\n");

    initializeClient();
  });

  test("should call getBudgets and log detailed response", async () => {
    console.log("\n=== Starting getBudgets API Call ===");

    try {
      // Make the API call
      console.log("Calling getBudgets()...");
      const startTime = Date.now();

      const response = await getBudgets({ includeAccounts: false });

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log("\n=== SUCCESS ===");
      console.log("Request Duration:", `${duration}ms`);
      console.log("Response Type:", typeof response);
      console.log("\nFull Response:");
      console.log(JSON.stringify(response, null, 2));

      if (response.data?.budgets) {
        console.log("\nBudgets Found:", response.data.budgets.length);
        console.log(
          "Budget Names:",
          response.data.budgets.map((b) => b.name).join(", "),
        );
      }
    } catch (error: any) {
      console.log("\n=== ERROR ===");
      console.log("Error Type:", error.constructor.name);
      console.log("Error Message:", error.message);

      // Log YnabApiError details if available
      if (error.status) {
        console.log("HTTP Status:", error.status);
      }
      if (error.url) {
        console.log("Request URL:", error.url);
      }
      if (error.response) {
        console.log("Response Body:", JSON.stringify(error.response, null, 2));
      }

      // Log full error object
      console.log("\nFull Error Object:");
      console.log(JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

      // Re-throw to fail the test
      throw error;
    }
  });

  // Test with includeAccounts parameter
  test("should call getBudgets with includeAccounts and log response", async () => {
    console.log(
      "\n=== Starting getBudgets API Call (with includeAccounts) ===",
    );

    try {
      const response = await getBudgets({ includeAccounts: true });

      console.log("\n=== SUCCESS ===");
      console.log("Full Response:");
      console.log(JSON.stringify(response, null, 2));

      if (response.data?.budgets) {
        console.log("\nBudgets Found:", response.data.budgets.length);
        response.data.budgets.forEach((budget) => {
          console.log(`\nBudget: ${budget.name}`);
          if (budget.accounts) {
            console.log(`  Accounts: ${budget.accounts.length}`);
            budget.accounts.forEach((account) => {
              console.log(`    - ${account.name} (${account.type})`);
            });
          }
        });
      }
    } catch (error: any) {
      console.log("\n=== ERROR ===");
      console.log("Error Message:", error.message);
      console.log("HTTP Status:", error.status);
      console.log("Request URL:", error.url);
      console.log("Response:", JSON.stringify(error.response, null, 2));

      throw error;
    }
  });

  // Test URL construction directly
  test("should log the exact URL being constructed", async () => {
    const env = loadEnv();
    const baseUrl = env.YNAB_BASE_URL;
    const path = "budgets";

    console.log("\n=== URL Construction Test ===");
    console.log("Base URL:", baseUrl);
    console.log("Path:", path);

    const constructedUrl = new URL(path, baseUrl);
    console.log("Constructed URL:", constructedUrl.toString());
    console.log("URL Protocol:", constructedUrl.protocol);
    console.log("URL Host:", constructedUrl.host);
    console.log("URL Pathname:", constructedUrl.pathname);
    console.log("URL Full:", constructedUrl.href);

    console.log("\nExpected URL: https://api.ynab.com/v1/budgets");
    console.log(
      "Match:",
      constructedUrl.href === "https://api.ynab.com/v1/budgets" ? "✓" : "✗",
    );
  });
});
