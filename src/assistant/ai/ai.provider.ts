import { AiProvider } from "./ai.service";
import { GroqProvider } from "./groq.provider";
import { GeminiProvider } from "./gemini.provider";

export function createAiProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase();

  switch (provider) {
    case "groq":
      return new GroqProvider();

    case "gemini":
      return new GeminiProvider();

    default:
      throw new Error(
        `Unsupported AI_PROVIDER: ${provider}. Expected "groq" or "gemini".`,
      );
  }
}