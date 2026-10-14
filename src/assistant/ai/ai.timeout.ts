// src/assistant/ai/ai.timeout.ts

import { AiTimeoutError } from "./ai.errors";

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new AiTimeoutError(
          `AI provider timed out after ${timeoutMs}ms`,
        ),
      );
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}