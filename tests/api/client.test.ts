/**
 * Unit tests for the API client
 */

import { describe, it, beforeEach, afterEach, expect } from "vitest";
import { initializeClient, makeRequest, getClient } from "../../src/api/client.js";
import { YnabApiError } from "../../src/api/errors.js";
import { createMockFetch } from "../helpers/mock-fetch.js";
import { createTestEnv, setupTestEnv, cleanupTestEnv } from "../helpers/test-env.js";

describe("API Client", () => {
  beforeEach(() => {
    // Set up test environment variables
    setupTestEnv();
    // Reset global client state before each test
    initializeClient(createTestEnv());
  });

  afterEach(() => {
    // Clean up test environment
    cleanupTestEnv();
  });

  describe("initializeClient", () => {
    it("should initialize with provided config", () => {
      const config = initializeClient({
        baseUrl: "https://test.api.com",
        accessToken: "test-token",
      });

      expect(config.baseUrl).toBe("https://test.api.com");
      expect(config.accessToken).toBe("test-token");
    });

    it("should use default values from env when not provided", () => {
      const config = initializeClient();

      expect(config.baseUrl).toBeTruthy();
      expect(config.accessToken).toBeTruthy();
    });
  });

  describe("getClient", () => {
    it("should return initialized client", () => {
      const client = getClient();

      expect(client).toBeTruthy();
      expect(client.baseUrl).toBeTruthy();
      expect(client.accessToken).toBeTruthy();
    });

    it("should initialize client if not already initialized", () => {
      const client = getClient();

      expect(client).toBeTruthy();
    });
  });

  describe("makeRequest", () => {
    it("should make successful GET request", async () => {
      const mockData = { data: { id: "123", name: "Test" } };
      const { fetch: mockFetch, calls } = createMockFetch({
        defaultResponse: {
          status: 200,
          ok: true,
          data: mockData,
        },
      });

      const result = await makeRequest("GET", "/test", undefined, mockFetch);

      expect(result).toEqual(mockData);
      expect(calls.length).toBe(1);
      expect(calls[0].url).toContain("/test");
    });

    it("should make successful POST request with body", async () => {
      const mockData = { data: { success: true } };
      const requestBody = { name: "New Item" };

      const { fetch: mockFetch, calls } = createMockFetch({
        defaultResponse: {
          status: 201,
          ok: true,
          data: mockData,
        },
      });

      const result = await makeRequest("POST", "/items", requestBody, mockFetch);

      expect(result).toEqual(mockData);
      expect(calls.length).toBe(1);
      expect(calls[0].init?.method).toBe("POST");
      expect(calls[0].init?.body).toBe(JSON.stringify(requestBody));
    });

    it("should include authorization header", async () => {
      const { fetch: mockFetch, calls } = createMockFetch();

      initializeClient({ accessToken: "my-secret-token" });
      await makeRequest("GET", "/test", undefined, mockFetch);

      const authHeader = (calls[0].init?.headers as Record<string, string>)?.Authorization;
      expect(authHeader).toBe("Bearer my-secret-token");
    });

    it("should throw YnabApiError on failed request", async () => {
      const errorResponse = {
        error: {
          id: "401",
          name: "unauthorized",
          detail: "Invalid access token",
        },
      };

      const { fetch: mockFetch } = createMockFetch({
        defaultResponse: {
          status: 401,
          ok: false,
          data: errorResponse,
        },
      });

      await expect(
        makeRequest("GET", "/test", undefined, mockFetch)
      ).rejects.toThrow(YnabApiError);

      await expect(
        makeRequest("GET", "/test", undefined, mockFetch)
      ).rejects.toThrow("Invalid access token");
    });

    it("should handle network errors", async () => {
      const mockFetch = async () => {
        throw new Error("Network error");
      };

      await expect(
        makeRequest("GET", "/test", undefined, mockFetch as typeof fetch)
      ).rejects.toThrow("Network error");
    });

    it("should handle empty response body", async () => {
      const { fetch: mockFetch } = createMockFetch({
        defaultResponse: {
          status: 204,
          ok: true,
          data: undefined,
        },
      });

      // Override text() to return empty string
      const emptyFetch = async (url: string | URL | Request, init?: RequestInit) => {
        const response = await mockFetch(url, init);
        return {
          ...response,
          text: async () => "",
        };
      };

      const result = await makeRequest("DELETE", "/test", undefined, emptyFetch as typeof fetch);

      expect(result).toBeUndefined();
    });

    it("should handle non-JSON response", async () => {
      const textResponse = "Plain text response";

      const mockFetch = async (): Promise<Response> => {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          headers: new Headers(),
          text: async () => textResponse,
          json: async () => {
            throw new Error("Not JSON");
          },
        } as Response;
      };

      const result = await makeRequest("GET", "/test", undefined, mockFetch as typeof fetch);

      expect(result).toBe(textResponse);
    });

    it("should construct proper URL from base and path", async () => {
      const { fetch: mockFetch, calls } = createMockFetch();

      initializeClient({ baseUrl: "https://api.ynab.com/v1" });
      await makeRequest("GET", "/budgets", undefined, mockFetch);

      // Check that the URL contains the base URL and the path
      expect(calls[0].url).toContain("api.ynab.com");
      expect(calls[0].url).toContain("budgets");
    });
  });
});
