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

/**
 * Calculate a date N days ago in ISO format (YYYY-MM-DD)
 */
export function getDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
}

/**
 * Limit array results and return metadata about truncation
 */
export function limitResults<T>(
  items: T[],
  limit?: number,
): { items: T[]; truncated: boolean; originalCount: number } {
  if (!limit || limit <= 0 || items.length <= limit) {
    return { items, truncated: false, originalCount: items.length };
  }
  return {
    items: items.slice(0, limit),
    truncated: true,
    originalCount: items.length,
  };
}

/**
 * Generate a warning message for large result sets
 */
export function getResultSizeWarning(
  count: number,
  truncated: boolean,
  truncatedFrom?: number,
): string {
  if (truncated && truncatedFrom) {
    return `⚠️ Results limited to ${count} of ${truncatedFrom} transactions. Use filters (sinceDate, type, limit) to reduce the dataset.`;
  }
  if (count > 1000) {
    return `⚠️ Large result set (${count} transactions). Consider using filters (sinceDate, type, limit) to reduce payload size for better performance.`;
  }
  if (count > 500) {
    return `💡 Tip: ${count} transactions returned. For better performance with local LLMs, consider using filters to reduce results.`;
  }
  return "";
}
