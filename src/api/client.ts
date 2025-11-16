import { loadEnv } from "../env.js";
import { YnabApiError } from "./errors.js";

type FetchLike = typeof fetch;

export interface ClientConfig {
  baseUrl: string;
  accessToken: string;
  fetchImpl?: FetchLike;
}

let globalConfig: ClientConfig | null = null;

export function initializeClient(config?: Partial<ClientConfig>): ClientConfig {
  const env = loadEnv();
  globalConfig = {
    baseUrl: config?.baseUrl ?? env.YNAB_BASE_URL,
    accessToken: config?.accessToken ?? env.YNAB_ACCESS_TOKEN!,
    fetchImpl: config?.fetchImpl ?? fetch,
  };
  return globalConfig;
}

export function getClient(): ClientConfig {
  if (!globalConfig) {
    return initializeClient();
  }
  return globalConfig;
}

export async function makeRequest<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  customFetch?: FetchLike,
): Promise<T> {
  const config = getClient();
  const fetchImpl = customFetch ?? config.fetchImpl ?? fetch;

  const url = new URL(path, config.baseUrl).toString();

  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${config.accessToken}`,
  };

  const init: RequestInit = {
    method,
    headers,
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  const response = await fetchImpl(url, init);
  const responseContent = await parseResponse(response);

  if (!response.ok) {
    throw new YnabApiError(
      (responseContent as any)?.error?.detail ??
        `Request failed with status ${response.status}`,
      response.status,
      responseContent,
      Object.fromEntries(response.headers.entries()),
    );
  }

  return responseContent as T;
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
