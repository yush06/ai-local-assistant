// src/assistant/context/conversation.types.ts

import type {
  AssistantQuery,
} from "../../services/assistant/assistant.types";

export interface ConversationContext {
  sessionId: string;

  lastQuery?: AssistantQuery;

  lastResults?: unknown[];

  selectedResultIndex?: number;

  updatedAt: number;
}