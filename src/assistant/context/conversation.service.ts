// src/assistant/context/conversation.service.ts

import type {
  AssistantQuery,
} from "../../services/assistant/assistant.types";

import type {
  ConversationContext,
} from "./conversation.types";


/*
 * =========================================
 * CONFIGURATION
 * =========================================
 */

const CONTEXT_TTL_MS =
  30 * 60 * 1000;

const MAX_STORED_RESULTS =
  10;


/*
 * =========================================
 * CONVERSATION SERVICE
 * =========================================
 */

export class ConversationService {
  private readonly contexts =
    new Map<
      string,
      ConversationContext
    >();


  /*
   * =======================================
   * GET CONTEXT
   * =======================================
   */

  get(
    sessionId: string,
  ):
    | ConversationContext
    | undefined {

    const context =
      this.contexts.get(
        sessionId,
      );

    if (!context) {
      return undefined;
    }


    /*
     * ---------------------------------------
     * TTL CHECK
     * ---------------------------------------
     */

    if (
      Date.now() -
        context.updatedAt >
      CONTEXT_TTL_MS
    ) {
      this.contexts.delete(
        sessionId,
      );

      return undefined;
    }


    return context;
  }


  /*
   * =======================================
   * SAVE CONTEXT
   * =======================================
   *
   * Stores:
   *
   * - latest query
   * - latest search results
   * - timestamp
   *
   * The results are required for Step 10.3
   * result references.
   */

  save(
    sessionId: string,
    query: AssistantQuery,
    results: unknown[] = [],
  ): void {

    this.contexts.set(
      sessionId,
      {
        sessionId,

        lastQuery:
          query,

        lastResults:
          results.slice(
            0,
            MAX_STORED_RESULTS,
          ),

        updatedAt:
          Date.now(),
      },
    );
  }


  /*
   * =======================================
   * SELECT RESULT
   * =======================================
   *
   * Example:
   *
   * resultIndex = 1
   *
   * means the second result.
   */

  selectResult(
    sessionId: string,
    resultIndex: number,
  ): boolean {

    const context =
      this.get(
        sessionId,
      );

    if (!context) {
      return false;
    }


    /*
     * Validate result index.
     */

    if (
      resultIndex < 0 ||
      resultIndex >=
        (context.lastResults?.length ?? 0)
    ) {
      return false;
    }


    /*
     * Store selected result.
     */

    context.selectedResultIndex =
      resultIndex;

    context.updatedAt =
      Date.now();


    /*
     * Save updated context.
     */

    this.contexts.set(
      sessionId,
      context,
    );

    return true;
  }


  /*
   * =======================================
   * GET SELECTED RESULT
   * =======================================
   */

  getSelectedResult(
    sessionId: string,
  ): unknown | undefined {

    const context =
      this.get(
        sessionId,
      );

    if (!context) {
      return undefined;
    }


    const index =
      context.selectedResultIndex;

    if (
      index === undefined
    ) {
      return undefined;
    }


    return context.lastResults?.[
      index
    ];
  }


  /*
   * =======================================
   * CLEAR SESSION
   * =======================================
   */

  clear(
    sessionId: string,
  ): void {

    this.contexts.delete(
      sessionId,
    );
  }
}