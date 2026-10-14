// src/assistant/ai/ai.retry.ts

export interface RetryOptions {
  retries: number;
  delayMs: number;
}

export async function retry<T>(
  operation: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  let lastError: unknown;

  for (
    let attempt = 0;
    attempt <= options.retries;
    attempt++
  ) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === options.retries) {
        break;
      }

      await delay(
        options.delayMs * Math.pow(2, attempt),
      );
    }
  }

  throw lastError;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, ms),
  );
}