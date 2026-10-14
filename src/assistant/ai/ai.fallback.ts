// src/assistant/ai/ai.fallback.ts

import {
  AiIntent,
  SupportedLanguage,
} from "./ai.types";


/*
 * =========================================
 * MAIN FALLBACK
 * =========================================
 */

export function extractIntentFallback(
  query: string,
): AiIntent {
  const originalQuery =
    query.trim();

  const normalized =
    originalQuery.toLowerCase();


  const language =
    detectLanguage(
      normalized,
    );

  const category =
    detectCategory(
      normalized,
    );

  const budget =
    detectBudget(
      normalized,
    );

  const location =
    detectLocation(
      normalized,
    );

  const people =
    detectPeople(
      normalized,
    );

  const audience =
    detectAudience(
      normalized,
    );

  const preferences =
    detectPreferences(
      normalized,
    );

  const sort =
    detectSort(
      normalized,
    );


  /*
   * -----------------------------------------
   * UNKNOWN
   * -----------------------------------------
   *
   * Do not guess when we have no useful
   * information from the user's query.
   */

  if (
    !category &&
    !budget &&
    !location &&
    !people &&
    !audience &&
    preferences.length === 0 &&
    !sort
  ) {
    return {
      intent:
        "UNKNOWN",

      language,

      originalQuery,
    };
  }


  /*
   * -----------------------------------------
   * FALLBACK INTENT
   * -----------------------------------------
   */

  return {
    intent:
      "LOCAL_SEARCH",

    category,

    budget,

    location,

    people,

    audience,

    preferences:
      preferences.length > 0
        ? preferences
        : undefined,

    limit:
      5,

    sort:
      sort ?? "best",

    language,

    originalQuery,
  };
}


/*
 * =========================================
 * CATEGORY
 * =========================================
 */

function detectCategory(
  query: string,
): string | undefined {
  const categories: Record<
    string,
    string[]
  > = {
    restaurant: [
      "restaurant",
      "restaurants",
      "restro",
      "restraunt",
      "रेस्टोरेंट",
      "रेस्तरां",
      "रेस्टोरेंट्स",
    ],

    dhaba: [
      "dhaba",
      "ढाबा",
    ],

    cafe: [
      "cafe",
      "cafes",
      "coffee",
      "कैफे",
      "कॉफी",
    ],

    hotel: [
      "hotel",
      "hotels",
      "होटल",
    ],

    hospital: [
      "hospital",
      "hospitals",
      "अस्पताल",
    ],

    pharmacy: [
      "pharmacy",
      "pharmacies",
      "medical store",
      "medical shop",
      "medicine",
      "medicines",
      "मेडिकल",
      "मेडिकल स्टोर",
      "दवाई",
      "दवा",
    ],

    grocery: [
      "grocery",
      "groceries",
      "kirana",
      "किराना",
    ],

    electronics: [
      "electronics",
      "electronic shop",
      "इलेक्ट्रॉनिक्स",
    ],

    mobile_store: [
      "mobile store",
      "mobile shop",
      "मोबाइल स्टोर",
      "मोबाइल शॉप",
    ],

    clothing: [
      "clothing",
      "clothes",
      "garments",
      "kapde",
      "कपड़े",
      "गारमेंट्स",
    ],

    salon: [
      "salon",
      "parlour",
      "parlor",
      "hair salon",
      "सैलून",
      "पार्लर",
    ],

    bank: [
      "bank",
      "banks",
      "बैंक",
    ],

    atm: [
      "atm",
      "एटीएम",
    ],
  };


  for (
    const [
      category,
      keywords,
    ]
    of Object.entries(
      categories,
    )
  ) {
    if (
      keywords.some(
        (keyword) =>
          query.includes(
            keyword,
          ),
      )
    ) {
      return category;
    }
  }


  return undefined;
}


/*
 * =========================================
 * BUDGET
 * =========================================
 */

function detectBudget(
  query: string,
): AiIntent["budget"] {
  const patterns = [
    /*
     * under 500
     * below 500
     * within 500
     * less than 500
     */
    /(?:under|below|within|less than)\s*(?:₹|rs\.?|inr)?\s*(\d+)/i,

    /*
     * ₹500
     * Rs 500
     * INR 500
     */
    /(?:₹|rs\.?|inr)\s*(\d+)/i,

    /*
     * 500 rupees
     * 500 रुपये
     * 500 रुपए
     */
    /(\d+)\s*(?:rupees|रुपये|रुपए|रुपया|रूपये)/i,

    /*
     * 500 ke andar
     */
    /(\d+)\s*ke\s*andar/i,

    /*
     * 500 tak
     */
    /(\d+)\s*(?:tak|तक)/i,
  ];


  for (
    const pattern
    of patterns
  ) {
    const match =
      query.match(
        pattern,
      );

    if (
      match?.[1]
    ) {
      return {
        max:
          Number(
            match[1],
          ),

        currency:
          "INR",
      };
    }
  }


  return undefined;
}


/*
 * =========================================
 * LOCATION
 * =========================================
 *
 * Important:
 *
 * We ONLY extract a location when the
 * user explicitly writes one.
 *
 * We NEVER default to Kanpur or any other
 * location.
 */

function detectLocation(
  query: string,
): AiIntent["location"] {
  /*
   * ---------------------------------------
   * NEAR ME
   * ---------------------------------------
   */

  const nearMePatterns = [
    "near me",
    "nearby",
    "mere paas",
    "mere pass",
    "mere najdik",
    "mere nazdeek",
    "पास में",
    "पास",
    "आस पास",
    "आसपास",
    "नजदीक",
    "नज़दीक",
    "मेरे पास",
  ];


  if (
    nearMePatterns.some(
      (value) =>
        query.includes(
          value,
        ),
    )
  ) {
    return {
      text:
        "near me",
    };
  }


  /*
   * ---------------------------------------
   * LOCATION AFTER "IN"
   * ---------------------------------------
   *
   * Examples:
   *
   * restaurant in Kanpur
   * restaurants in Kalyanpur
   * hotel in Civil Lines
   */

  const inPattern =
    query.match(
      /\b(?:in|at|inside)\s+([a-z][a-z\s-]{1,50}?)(?=\s+(?:under|below|within|less|for|with|near|around|budget|restaurant|restaurants|hotel|cafe|hospital|pharmacy|grocery|salon|bank|atm|please|batao|chahiye|dikhao)\b|$)/i,
    );


  if (
    inPattern?.[1]
  ) {
    const location =
      cleanLocation(
        inPattern[1],
      );

    if (location) {
      return {
        text:
          location,
      };
    }
  }


  /*
   * ---------------------------------------
   * HINGLISH "ME"
   * ---------------------------------------
   *
   * Examples:
   *
   * Kanpur me restaurant
   * Kalyanpur me cafe
   */

  const mePattern =
    query.match(
      /\b([a-z][a-z\s-]{1,50}?)\s+(?:me|mein|में)\s+(?=[a-z\u0900-\u097f])/i,
    );


  if (
    mePattern?.[1]
  ) {
    const location =
      cleanLocation(
        mePattern[1],
      );

    if (
      location &&
      !isObviouslyNotLocation(
        location,
      )
    ) {
      return {
        text:
          location,
      };
    }
  }


  /*
   * ---------------------------------------
   * HINDI "ME"
   * ---------------------------------------
   *
   * Examples:
   *
   * कानपुर में रेस्टोरेंट
   */

  const hindiMePattern =
    query.match(
      /^(.{2,40}?)\s+(?:में|मे)\s+(?:रेस्टोरेंट|रेस्तरां|होटल|कैफे|अस्पताल|मेडिकल|दुकान)/u,
    );


  if (
    hindiMePattern?.[1]
  ) {
    const location =
      cleanLocation(
        hindiMePattern[1],
      );

    if (location) {
      return {
        text:
          location,
      };
    }
  }


  /*
   * ---------------------------------------
   * "NEAR <LOCATION>"
   * ---------------------------------------
   *
   * Examples:
   *
   * near Kanpur
   * near Kalyanpur
   */

  const nearLocationPattern =
    query.match(
      /\bnear\s+([a-z][a-z\s-]{1,40}?)(?=\s+(?:under|below|within|for|with|restaurant|restaurants|hotel|cafe|hospital|pharmacy|grocery|salon|bank|atm)\b|$)/i,
    );


  if (
    nearLocationPattern?.[1]
  ) {
    const location =
      cleanLocation(
        nearLocationPattern[1],
      );

    if (location) {
      return {
        text:
          location,
      };
    }
  }


  /*
   * No explicit location found.
   */

  return undefined;
}


/*
 * =========================================
 * LOCATION CLEANER
 * =========================================
 */

function cleanLocation(
  value: string,
): string | undefined {
  const cleaned =
    value
      .trim()
      .replace(
        /\s+/g,
        " ",
      )
      .replace(
        /^[,\s-]+|[,\s-]+$/g,
        "",
      );


  if (
    !cleaned ||
    cleaned.length < 2
  ) {
    return undefined;
  }


  return cleaned;
}


/*
 * =========================================
 * LOCATION FALSE-POSITIVE CHECK
 * =========================================
 */

function isObviouslyNotLocation(
  value: string,
): boolean {
  const blocked = [
    "restaurant",
    "restaurants",
    "restro",
    "hotel",
    "hotels",
    "cafe",
    "cafes",
    "coffee",
    "hospital",
    "pharmacy",
    "grocery",
    "salon",
    "bank",
    "atm",
    "cheap",
    "sasta",
    "accha",
    "good",
    "family",
    "couple",
    "friends",
  ];


  return blocked.includes(
    value.trim().toLowerCase(),
  );
}


/*
 * =========================================
 * PEOPLE
 * =========================================
 */

function detectPeople(
  query: string,
): number | undefined {
  const patterns = [
    /(\d+)\s*(?:people|person|persons|log|logon|logon ke liye|logo ke liye)\b/i,

    /(\d+)\s*(?:members|member)\b/i,

    /(?:for|with)\s*(\d+)\s*(?:people|person|persons)\b/i,

    /(\d+)\s*(?:लोग|लोगों|व्यक्ति|व्यक्तियों)/u,
  ];


  for (
    const pattern
    of patterns
  ) {
    const match =
      query.match(
        pattern,
      );

    if (
      match?.[1]
    ) {
      const count =
        Number(
          match[1],
        );

      if (
        count > 0 &&
        count <= 50
      ) {
        return count;
      }
    }
  }


  return undefined;
}


/*
 * =========================================
 * AUDIENCE
 * =========================================
 */

function detectAudience(
  query: string,
): AiIntent["audience"] {
  if (
    query.includes(
      "family",
    ) ||
    query.includes(
      "परिवार",
    ) ||
    query.includes(
      "परिवार के साथ",
    )
  ) {
    return "family";
  }


  if (
    query.includes(
      "couple",
    ) ||
    query.includes(
      "couples",
    ) ||
    query.includes(
      "दो लोगों",
    ) ||
    query.includes(
      "कपल",
    )
  ) {
    return "couple";
  }


  if (
    query.includes(
      "friends",
    ) ||
    query.includes(
      "friend",
    ) ||
    query.includes(
      "दोस्त",
    ) ||
    query.includes(
      "दोस्तों",
    )
  ) {
    return "friends";
  }


  return undefined;
}


/*
 * =========================================
 * PREFERENCES
 * =========================================
 */

function detectPreferences(
  query: string,
): string[] {
  const preferences: string[] = [];


  if (
    query.includes(
      "family",
    ) ||
    query.includes(
      "परिवार",
    )
  ) {
    preferences.push(
      "family",
    );
  }


  if (
    query.includes(
      "veg",
    ) ||
    query.includes(
      "vegetarian",
    ) ||
    query.includes(
      "शाकाहारी",
    )
  ) {
    preferences.push(
      "vegetarian",
    );
  }


  if (
    query.includes(
      "cheap",
    ) ||
    query.includes(
      "sasta",
    ) ||
    query.includes(
      "सस्ता",
    ) ||
    query.includes(
      "budget",
    )
  ) {
    preferences.push(
      "budget",
    );
  }


  if (
    query.includes(
      "good",
    ) ||
    query.includes(
      "accha",
    ) ||
    query.includes(
      "अच्छा",
    ) ||
    query.includes(
      "best",
    )
  ) {
    preferences.push(
      "good",
    );
  }


  return preferences;
}


/*
 * =========================================
 * SORT
 * =========================================
 */

function detectSort(
  query: string,
): AiIntent["sort"] {
  if (
    query.includes(
      "nearest",
    ) ||
    query.includes(
      "nearer",
    ) ||
    query.includes(
      "closest",
    ) ||
    query.includes(
      "closest one",
    ) ||
    query.includes(
      "सबसे पास",
    ) ||
    query.includes(
      "नजदीकी",
    ) ||
    query.includes(
      "नज़दीकी",
    )
  ) {
    return "nearest";
  }


  if (
    query.includes(
      "cheapest",
    ) ||
    query.includes(
      "cheaper",
    ) ||
    query.includes(
      "cheapest one",
    ) ||
    query.includes(
      "sasta",
    ) ||
    query.includes(
      "सस्ता",
    )
  ) {
    return "cheapest";
  }


  if (
    query.includes(
      "best value",
    ) ||
    query.includes(
      "value for money",
    ) ||
    query.includes(
      "paisa vasool",
    ) ||
    query.includes(
      "पैसा वसूल",
    )
  ) {
    return "best_value";
  }


  return undefined;
}


/*
 * =========================================
 * LANGUAGE
 * =========================================
 */

function detectLanguage(
  query: string,
): SupportedLanguage {
  /*
   * Hindi / Devanagari
   */

  const hindiCharacters =
    /[\u0900-\u097F]/;


  if (
    hindiCharacters.test(
      query,
    )
  ) {
    return "hi";
  }


  /*
   * Common Hinglish words
   */

  const hinglishWords = [
    "bhaiya",
    "batao",
    "andar",
    "paas",
    "pass",
    "accha",
    "achha",
    "sasta",
    "koi",
    "chahiye",
    "dikhao",
    "wale",
    "wala",
    "me",
    "mein",
    "ke liye",
    "kitna",
    "kitne",
  ];


  if (
    hinglishWords.some(
      (word) =>
        query.includes(
          word,
        ),
    )
  ) {
    return "hinglish";
  }


  return "en";
}