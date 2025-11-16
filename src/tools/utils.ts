import { YnabApiError } from "../api/errors.js";

export function successResult(title: string, data: unknown): any {
  return {
    content: [
      {
        type: "text",
        text: `${title}\n\n${formatJson(data)}`,
      },
    ],
    data,
  };
}

export function errorResult(error: unknown): any {
  if (error instanceof YnabApiError) {
    return {
      content: [
        {
          type: "text",
          text: `❌ YNAB API error (${error.status}): ${error.message}`,
        },
      ],
      data: error.details,
      isError: true,
    };
  }

  const message =
    error instanceof Error ? error.message : JSON.stringify(error, null, 2);

  return {
    content: [
      {
        type: "text",
        text: `❌ ${message}`,
      },
    ],
    data:
      error instanceof Error
        ? {
            name: error.name,
            stack: error.stack,
          }
        : error,
    isError: true,
  };
}

export function formatJson(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}


