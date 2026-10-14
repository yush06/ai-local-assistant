import type {
  AffordabilityResult,
} from "./affordability.types";

export interface AffordabilityInput {
  priceLevel?: string;

  budget?: number;

  people?: number;
}

const PRICE_ESTIMATES: Record<
  string,
  number
> = {
  PRICE_LEVEL_FREE: 0,

  PRICE_LEVEL_INEXPENSIVE: 150,

  PRICE_LEVEL_MODERATE: 350,

  PRICE_LEVEL_EXPENSIVE: 700,

  PRICE_LEVEL_VERY_EXPENSIVE: 1200,
};

export function calculateAffordability(
  input: AffordabilityInput,
): AffordabilityResult {
 const {
  priceLevel,
  budget,
} = input;

const people =
  input.people ?? 1;

  if (
  budget === undefined ||
  budget <= 0
) {
    return {
      budgetFit: "UNKNOWN",

      affordabilityScore: 50,

      confidence: "LOW",

      explanation:
        "Budget or number of people was not provided.",
    };
  }

  const budgetPerPerson =
    budget / people;

  const estimatedCostPerPerson =
    priceLevel
      ? PRICE_ESTIMATES[
          priceLevel
        ]
      : undefined;

  if (
    estimatedCostPerPerson ===
    undefined
  ) {
    return {
      budgetFit: "UNKNOWN",

      budgetPerPerson:
        round(budgetPerPerson),

      affordabilityScore: 50,

      confidence: "LOW",

      explanation:
        "Price information is not available for this restaurant.",
    };
  }

  const estimatedTotalCost =
    estimatedCostPerPerson *
    people;

  const ratio =
    estimatedTotalCost /
    budget;

  if (ratio <= 0.8) {
    return {
      budgetFit:
        "WITHIN_BUDGET",

      estimatedCostPerPerson,

      estimatedTotalCost,

      budgetPerPerson:
        round(budgetPerPerson),

      affordabilityScore: 100,

      confidence: "MEDIUM",

      explanation:
        `Estimated cost is around ₹${estimatedTotalCost} for ${people} people, which appears to fit comfortably within your ₹${budget} budget.`,
    };
  }

  if (ratio <= 1) {
    return {
      budgetFit:
        "LIKELY_WITHIN_BUDGET",

      estimatedCostPerPerson,

      estimatedTotalCost,

      budgetPerPerson:
        round(budgetPerPerson),

      affordabilityScore: 85,

      confidence: "MEDIUM",

      explanation:
        `Estimated cost is around ₹${estimatedTotalCost} for ${people} people and may fit within your ₹${budget} budget.`,
    };
  }

  if (ratio <= 1.3) {
    return {
      budgetFit:
        "MAY_EXCEED_BUDGET",

      estimatedCostPerPerson,

      estimatedTotalCost,

      budgetPerPerson:
        round(budgetPerPerson),

      affordabilityScore: 40,

      confidence: "MEDIUM",

      explanation:
        `Estimated cost is around ₹${estimatedTotalCost} for ${people} people and may exceed your ₹${budget} budget.`,
    };
  }

  return {
    budgetFit:
      "MAY_EXCEED_BUDGET",

    estimatedCostPerPerson,

    estimatedTotalCost,

    budgetPerPerson:
      round(budgetPerPerson),

    affordabilityScore: 10,

    confidence: "MEDIUM",

    explanation:
      `This restaurant may be expensive for a ₹${budget} budget for ${people} people.`,
  };
}

function round(
  value: number,
): number {
  return (
    Math.round(value * 100) /
    100
  );
}