// src/assistant/ai/ai.routes.ts


import crypto from "node:crypto";


import { Router } from "express";


import { PlacesService } from "../../services/places/places.service";

import { LocationService } from "../../services/location/location.service";

import { AssistantService } from "../../services/assistant/assistant.service";


import { AiProvider, AiService } from "./ai.service";


import type { AiIntent } from "./ai.types";


import { GroqProvider } from "./groq.provider";

import { GeminiProvider } from "./gemini.provider";


import { mapAiIntentToAssistantQuery } from "./ai.mapper";


import { ConversationService } from "../context/conversation.service";

import { mergeConversationQuery } from "../context/conversation.merge";


import type { AssistantQuery } from "../../services/assistant/assistant.types";


const router = Router();


const apiKey = process.env.GOOGLE_MAPS_API_KEY;


if (!apiKey) {

  throw new Error("GOOGLE_MAPS_API_KEY is not configured");

}


/*

 * =========================================

 * EXISTING SERVICES

 * =========================================

 */


const placesService = new PlacesService(apiKey);


const locationService = new LocationService(apiKey);


const assistantService = new AssistantService(

  placesService,

  locationService,

);


/*

 * =========================================

 * CONVERSATION SERVICE

 * =========================================

 */


const conversationService = new ConversationService();


/*

 * =========================================

 * AI SERVICE

 * =========================================

 */


const aiService = new AiService(

  createAiProvider(),

);


/*

 * =========================================

 * AI PROVIDER

 * =========================================

 *

 * Supported:

 * - groq

 * - gemini

 *

 * Controlled using:

 *

 * AI_PROVIDER=groq

 * AI_PROVIDER=gemini

 *

 * =========================================

 */


function createAiProvider(): AiProvider {

  const provider =

    process.env.AI_PROVIDER?.trim().toLowerCase() ?? "groq";


  console.log(`AI provider: ${provider}`);


  switch (provider) {

    case "groq":

      return new GroqProvider();


    case "gemini":

      return new GeminiProvider();


    default:

      throw new Error(

        `Unsupported AI_PROVIDER: ${provider}. ` +

          `Supported providers are: groq, gemini`,

      );

  }

}


/*

 * =========================================

 * STEP 10.5

 *

 * CONVERSATIONAL REFINEMENT DETECTION

 * =========================================

 *

 * The AI extractor does not currently receive

 * the previous conversation context.

 *

 * Therefore phrases such as:

 *

 * "thoda sasta dikhao"

 * "aur paas wale"

 * "budget thoda badha do"

 *

 * can incorrectly be interpreted as a

 * brand-new LOCAL_SEARCH.

 *

 * These helpers make the conversational

 * refinement deterministic when a previous

 * search exists.

 */


/*

 * -----------------------------------------

 * Normalize user text

 * -----------------------------------------

 */


function normalizeQueryText(query: string) {

  return query

    .trim()

    .toLowerCase()

    .replace(/\s+/g, " ");

}


/**

 * Detect reference to a previous search result.

 *

 * Examples:

 * first one

 * second one

 * third one

 * 2nd one

 * option 2

 * second wala

 * दूसरा वाला

 */

function detectResultReference(

  query: string,

): number | undefined {

  const text = normalizeQueryText(query);


  const references: Array<{

    index: number;

    values: string[];

  }> = [

    {

      index: 0,

      values: [

        "first",

        "first one",

        "the first one",

        "1st",

        "1st one",

        "option 1",

        "option one",

        "number 1",

        "number one",

        "first wala",

        "first wali",

        "पहला",

        "पहला वाला",

        "पहली",

        "पहली वाली",

      ],

    },


    {

      index: 1,

      values: [

        "second",

        "second one",

        "the second one",

        "2nd",

        "2nd one",

        "option 2",

        "option two",

        "number 2",

        "number two",

        "second wala",

        "second wali",

        "दूसरा",

        "दूसरा वाला",

        "दूसरी",

        "दूसरी वाली",

      ],

    },


    {

      index: 2,

      values: [

        "third",

        "third one",

        "the third one",

        "3rd",

        "3rd one",

        "option 3",

        "option three",

        "number 3",

        "number three",

        "third wala",

        "third wali",

        "तीसरा",

        "तीसरा वाला",

        "तीसरी",

        "तीसरी वाली",

      ],

    },


    {

      index: 3,

      values: [

        "fourth",

        "fourth one",

        "the fourth one",

        "4th",

        "4th one",

        "option 4",

        "option four",

        "number 4",

        "number four",

        "fourth wala",

        "fourth wali",

        "चौथा",

        "चौथा वाला",

        "चौथी",

        "चौथी वाली",

      ],

    },


    {

      index: 4,

      values: [

        "fifth",

        "fifth one",

        "the fifth one",

        "5th",

        "5th one",

        "option 5",

        "option five",

        "number 5",

        "number five",

        "fifth wala",

        "fifth wali",

        "पाँचवाँ",

        "पाँचवाँ वाला",

        "पांचवां",

        "पांचवां वाला",

      ],

    },

  ];


  for (const reference of references) {

    if (reference.values.includes(text)) {

      return reference.index;

    }

  }


  return undefined;

}

function isConversationalRefinement(

  query: string,

): boolean {

  const text = normalizeQueryText(query);


  const refinementPatterns: RegExp[] = [

    /*

     * Cheaper

     */

    /thoda\s+sasta/,

    /thodi\s+sasti/,

    /aur\s+sasta/,

    /saste\s+wale/,

    /sasta\s+dikhao/,

    /kam\s+budget/,

    /budget\s+friendly/,

    /cheaper/,

    /cheapest/,


    /*

     * Nearer

     */

    /aur\s+paas/,

    /thoda\s+paas/,

    /mere\s+paas/,

    /aas\s+paas/,

    /aur\s+paas/,

/thoda\s+paas/,

/mere\s+paas/,

/aas\s+paas/,


// Hindi proximity

/मेरे\s+पास/,

/पास\s+में/,

/मेरे\s+आसपास/,

/नज़दीक/,


/closer/,

/nearer/,

/nearest/,

/near\s+me/,

    /closer/,

    /nearer/,

    /nearest/,

    /near\s+me/,


    /*

     * Budget change

     */

    /budget\s+badha/,

    /budget\s+badh/,

    /budget\s+increase/,

    /budget\s+kam/,

    /budget\s+reduce/,

    /budget\s+thoda/,


    /*

     * People

     */

    /\d+\s*log/,

    /\d+\s*logo/,

    /\d+\s*people/,

    /\d+\s*persons/,

    /family\s+of\s+\d+/,


    /*

     * Explicit budget

     */

    /under\s+₹?\s*\d+/,

    /under\s+\d+/,

    /below\s+₹?\s*\d+/,

    /below\s+\d+/,

    /\d+\s+ke\s+andar/,

    /\d+\s+mein/,

    /\d+\s+tak/,


    /*

     * Per-person budget

     */

    /per\s+person/,

    /per\s+head/,

    /each\s+person/,

    /har\s+person/,

    /har\s+aadmi/,

    /prati\s+vyakti/,


    /*

     * Distance

     */

    /\d+(?:\.\d+)?\s*km/,

    /\d+(?:\.\d+)?\s*kilometer/,


    /*

     * Audience

     */

    /family\s+ke\s+liye/,

    /family\s+ke\s+saath/,

    /couple\s+ke\s+liye/,

    /friends\s+ke\s+liye/,


    /*

     * Sorting

     */

    /cheapest\s+wale/,

    /nearest\s+wale/,

    /closest\s+wale/,

    /best\s+value/,

    /budget\s+mein\s+best/,

  ];


  return refinementPatterns.some((pattern) =>

    pattern.test(text),

  );

}


/*

 * -----------------------------------------

 * Detect "thoda sasta"

 * -----------------------------------------

 */


function isCheaperRefinement(query: string): boolean {

  const text = normalizeQueryText(query);


  return (

    /thoda\s+sasta/.test(text) ||

    /thodi\s+sasti/.test(text) ||

    /aur\s+sasta/.test(text) ||

    /sasta\s+dikhao/.test(text) ||

    /saste\s+wale/.test(text) ||

    /cheaper/.test(text) ||

    /cheapest/.test(text)

  );

}


/*

 * -----------------------------------------

 * Detect "thoda budget badha"

 * -----------------------------------------

 */


function isHigherBudgetRefinement(

  query: string,

): boolean {

  const text = normalizeQueryText(query);


  return (

    /thoda\s+zyada/.test(text) ||

    /thoda\s+upar/.test(text) ||

    /budget\s+badha/.test(text) ||

    /budget\s+badh/.test(text) ||

    /budget\s+increase/.test(text) ||

    /budget\s+thoda\s+badha/.test(text)

  );

}


/*

 * -----------------------------------------

 * Detect "thoda budget kam"

 * -----------------------------------------

 */


function isLowerBudgetRefinement(

  query: string,

): boolean {

  const text = normalizeQueryText(query);


  return (

    /thoda\s+kam/.test(text) ||

    /budget\s+kam/.test(text) ||

    /budget\s+reduce/.test(text) ||

    /sasta\s+kar/.test(text)

  );

}


/*

 * -----------------------------------------

 * Detect nearer refinement

 * -----------------------------------------

 */


function isNearestRefinement(

  query: string,

): boolean {

  const text = normalizeQueryText(query);


  return (

    /near\s+me/.test(text) ||

    /nearby/.test(text) ||

    /aur\s+paas/.test(text) ||

    /thoda\s+paas/.test(text) ||

    /mere\s+paas/.test(text) ||

    /aas\s+paas/.test(text) ||


    // Hindi proximity

    /मेरे\s+पास/.test(text) ||

    /पास\s+में/.test(text) ||

    /मेरे\s+आसपास/.test(text) ||

    /नज़दीक/.test(text) ||


    /closer/.test(text) ||

    /nearer/.test(text) ||

    /nearest/.test(text)

  );

}

/*

 * -----------------------------------------

 * Apply deterministic conversational

 * refinement.

 * -----------------------------------------

 */


function applyConversationalRefinement(

  intent: AiIntent,

  query: string,

  previousQuery: AssistantQuery,

): AiIntent {

  const refinedIntent: AiIntent = {

    ...intent,

    intent: "REFINE_SEARCH",

  };


  /*

   * ---------------------------------------

   * "thoda sasta"

   *

   * Reduce previous numeric budget by 10%.

   *

   * Example:

   * 500 -> 450

   * ---------------------------------------

   */


  if (

    isCheaperRefinement(query) &&

    previousQuery.budget !== undefined

  ) {

    refinedIntent.budget = {

      max: Math.max(

        1,

        Math.round(previousQuery.budget * 0.9),

      ),


      currency: "INR",


      type:

        previousQuery.budgetType ??

        "total",

    };


    refinedIntent.sort = "cheapest";

  }


  /*

   * ---------------------------------------

   * "budget thoda badha do"

   *

   * Increase previous budget by 10%.

   *

   * Example:

   * 500 -> 550

   * ---------------------------------------

   */


  if (

    isHigherBudgetRefinement(query) &&

    previousQuery.budget !== undefined

  ) {

    refinedIntent.budget = {

      max: Math.round(

        previousQuery.budget * 1.1,

      ),


      currency: "INR",


      type:

        previousQuery.budgetType ??

        "total",

    };

  }


  /*

   * ---------------------------------------

   * "budget thoda kam karo"

   * ---------------------------------------

   */


  if (

    isLowerBudgetRefinement(query) &&

    previousQuery.budget !== undefined

  ) {

    refinedIntent.budget = {

      max: Math.max(

        1,

        Math.round(

          previousQuery.budget * 0.9,

        ),

      ),


      currency: "INR",


      type:

        previousQuery.budgetType ??

        "total",

    };

  }


  /*

   * ---------------------------------------

   * "aur paas wale"

   * ---------------------------------------

   */


  if (isNearestRefinement(query)) {

    refinedIntent.sort = "nearest";

  }


  return refinedIntent;

}


/*

 * =========================================

 * POST /ai-query

 * =========================================

 */


router.post(

  "/ai-query",

  async (req, res) => {

    try {

      /*

       * =====================================

       * REQUEST BODY

       * =====================================

       */


     const body = req.body as {

  query?: string;

  sessionId?: string;

  currentLocation?: {

    latitude: number;

    longitude: number;

  };

};

      const query = body?.query?.trim();


      /*

       * =====================================

       * VALIDATION

       * =====================================

       */


      if (!query) {

        return res

          .status(400)

          .json({

            type: "VALIDATION_ERROR",

            message: "query is required",

          });

      }


const currentLocation = body.currentLocation;


if (currentLocation !== undefined) {

  const { latitude, longitude } = currentLocation;


  if (

    !Number.isFinite(latitude) ||

    !Number.isFinite(longitude) ||

    latitude < -90 ||

    latitude > 90 ||

    longitude < -180 ||

    longitude > 180

  ) {

    return res.status(400).json({

      type: "VALIDATION_ERROR",

      message: "Invalid currentLocation coordinates",

    });

  }

}


      /*

       * =====================================

       * SESSION

       * =====================================

       */


      const sessionId =

        body.sessionId ??

        crypto.randomUUID();


      /*

       * =====================================

       * GET PREVIOUS CONTEXT

       *

       * IMPORTANT STEP 10.5 CHANGE

       *

       * We retrieve conversation context

       * BEFORE deciding whether this is a

       * new search or refinement.

       * =====================================

       */


      const previousContext =

        conversationService.get(sessionId);


      /*

       * =====================================

       * AI INTENT

       * =====================================

       */

const directResultIndex =

  previousContext?.lastResults?.length

    ? detectResultReference(query)

    : undefined;


let intent =

  await aiService.extractIntent(query);

  if (directResultIndex !== undefined) {

  intent.resultIndex = directResultIndex;

  intent.resultReferenceType = "selected";

}


      /*

       * =====================================

       * STEP 10.5

       *

       * FORCE CONVERSATIONAL REFINEMENT

       *

       * If a previous search exists and

       * the query clearly looks like a

       * conversational refinement, do not

       * allow the LLM to accidentally turn

       * it into a new LOCAL_SEARCH.

       * =====================================

       */


     if (

  previousContext?.lastQuery &&

  isConversationalRefinement(query)

) {

  intent =

    applyConversationalRefinement(

      intent,

      query,

      previousContext.lastQuery,

    );


  /*

   * Preserve the previous search category

   * for location-only refinements such as:

   *

   * "near me"

   * "nearby"

   * "closest"

   */

  console.log(

  "[REFINEMENT DEBUG] query:",

  query,

);


console.log(

  "[REFINEMENT DEBUG] AI category:",

  intent.category,

);


console.log(

  "[REFINEMENT DEBUG] previous category:",

  previousContext.lastQuery.category,

);

  if (

    isNearestRefinement(query) &&

    intent.category === "general" &&

    previousContext.lastQuery

  ) {

    if (

  previousContext.lastQuery.category &&

  previousContext.lastQuery.category !== "general"

) {

  intent.category =

    previousContext.lastQuery.category;

}

  }

}

      /*

       * =====================================

       * UNKNOWN

       * =====================================

       */


     if (

  intent.intent === "UNKNOWN" &&

  directResultIndex === undefined

) {

        return res.json({

          sessionId,

          type: "CLARIFICATION",

          message:

            "Please tell me what you are looking for.",

          language: intent.language,

        });

      }


      /*

       * =====================================

       * GENERAL QUESTION

       * =====================================

       */


      if (

        intent.intent ===

        "GENERAL_QUESTION"

      ) {

        const response =

          await aiService.generateResponse(

            intent,

            [],

          );


        return res.json({

          sessionId,

          type: "GENERAL",

          ...response,

        });

      }


      /*

       * =====================================

       * STEP 10.3

       *

       * RESULT REFERENCE

       * =====================================

       */


      if (

        intent.resultIndex !== undefined ||

        intent.resultReferenceType ===

          "selected"

      ) {

        /*

         * -----------------------------------

         * GET PREVIOUS CONTEXT

         * -----------------------------------

         */


        const resultContext =

          conversationService.get(

            sessionId,

          );


        /*

         * -----------------------------------

         * NO PREVIOUS RESULTS

         * -----------------------------------

         */


        if (

          !resultContext?.lastResults?.length

        ) {

          return res

            .status(400)

            .json({

              sessionId,

              type: "CLARIFICATION",

              message:

                "Please start with a search first, then I can identify that option.",

              language: intent.language,

            });

        }


        /*

         * -----------------------------------

         * DETERMINE RESULT INDEX

         * -----------------------------------

         */


        let resultIndex =

          intent.resultIndex;


        /*

         * -----------------------------------

         * SELECTED RESULT

         * -----------------------------------

         */


        if (

          resultIndex === undefined &&

          intent.resultReferenceType ===

            "selected"

        ) {

          resultIndex =

            resultContext.selectedResultIndex;

        }


        /*

         * -----------------------------------

         * NO SELECTED RESULT

         * -----------------------------------

         */


        if (resultIndex === undefined) {

          return res

            .status(400)

            .json({

              sessionId,

              type: "CLARIFICATION",

              message:

                "Kaunsa wala? Please tell me the option number.",

              language: intent.language,

            });

        }


        /*

         * -----------------------------------

         * GET REFERENCED RESULT

         * -----------------------------------

         */


        const referencedResult =

          resultContext.lastResults[

            resultIndex

          ];


        /*

         * -----------------------------------

         * INVALID RESULT INDEX

         * -----------------------------------

         */


        if (referencedResult === undefined) {

          return res

            .status(400)

            .json({

              sessionId,

              type: "CLARIFICATION",

              message:

                "That option is not available in the previous results.",

              language: intent.language,

            });

        }


        /*

         * -----------------------------------

         * SAVE SELECTED RESULT

         * -----------------------------------

         */


        conversationService.selectResult(

          sessionId,

          resultIndex,

        );


        /*

         * -----------------------------------

         * GENERATE RESPONSE

         * -----------------------------------

         */


        const response =

          await aiService.generateResponse(

            intent,

            [referencedResult],

          );


        /*

         * -----------------------------------

         * RESULT REFERENCE RESPONSE

         * -----------------------------------

         */


        return res.json({

          sessionId,

          type: "RESULT_REFERENCE",

          resultIndex,

          result: referencedResult,

          ...response,

        });

      }


      /*

       * =====================================

       * ASSISTANT QUERY

       * =====================================

       */


      let assistantQuery: AssistantQuery;


      /*

       * =====================================

       * REFINE EXISTING SEARCH

       * =====================================

       */


      if (

        intent.intent ===

        "REFINE_SEARCH"

      ) {

        /*

         * -----------------------------------

         * GET PREVIOUS CONTEXT

         * -----------------------------------

         */


        const refineContext =

          conversationService.get(

            sessionId,

          );


        /*

         * -----------------------------------

         * NO PREVIOUS SEARCH

         * -----------------------------------

         */


        if (!refineContext?.lastQuery) {

          return res

            .status(400)

            .json({

              sessionId,

              type: "CLARIFICATION",

              message:

                "Please start with a search first, then I can refine the results.",

              language: intent.language,

            });

        }


        /*

         * -----------------------------------

         * MERGE REFINEMENT

         * -----------------------------------

         */


        assistantQuery =

          mergeConversationQuery(

            refineContext.lastQuery,

            intent,

          );

      }


      /*

       * =====================================

       * NEW SEARCH

       * =====================================

       */


      else {

        /*

         * -----------------------------------

         * LOCATION REQUIRED

         * -----------------------------------

         */


        if (!intent.location?.text) {

          return res

            .status(400)

            .json({

              sessionId,

              type: "CLARIFICATION",

              message:

                "Which city or area should I search in?",

              language: intent.language,

            });

        }


        /*

         * -----------------------------------

         * MAP AI INTENT

         * -----------------------------------

         */


        assistantQuery =

          mapAiIntentToAssistantQuery(

            intent,

          );

}


      /*

       * =====================================

       * EXECUTE EXISTING SEARCH

       * =====================================

       */


      // Preserve GPS coordinates for both new searches and refinements.
      if (currentLocation) {
        assistantQuery.currentLocation = currentLocation;
      }

      const searchResult =

        await assistantService.search(

          assistantQuery,

        );


      /*

       * =====================================

       * SAVE QUERY + RESULTS

       * =====================================

       */


      conversationService.save(

        sessionId,

        assistantQuery,

        searchResult.results,

      );


      /*

       * =====================================

       * GENERATE RESPONSE

       * =====================================

       */


      const response =

        await aiService.generateResponse(

          intent,

          searchResult.results,

        );


return res.json({

  sessionId,


  type:

    intent.intent === "REFINE_SEARCH"

      ? "REFINE_SEARCH"

      : "LOCAL_SEARCH",


  query: assistantQuery,


  location: searchResult.location,


  count: searchResult.count,


  results: searchResult.results,


  ...response,

});


    } catch (error) {

      console.error(

        "AI query failed:",

        error,

      );


      return res

        .status(500)

        .json({

          type: "INTERNAL_ERROR",

          message:

            "Something went wrong while processing your request.",

        });

    }

  },

);


export default router;
