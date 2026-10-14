// src/assistant/ai/ai.errors.ts

export class AiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AiError";
  }
}

export class AiTimeoutError extends AiError {
  constructor(message = "AI provider timeout") {
    super(message, "AI_TIMEOUT");
    this.name = "AiTimeoutError";
  }
}

export class AiProviderError extends AiError {
  constructor(
    message = "AI provider unavailable",
    cause?: unknown,
  ) {
    super(message, "AI_PROVIDER_ERROR", cause);
    this.name = "AiProviderError";
  }
}

export class AiValidationError extends AiError {
  constructor(message = "Invalid AI response") {
    super(message, "AI_VALIDATION_ERROR");
    this.name = "AiValidationError";
  }
}