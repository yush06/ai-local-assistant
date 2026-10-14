export type BudgetFit =
  | "WITHIN_BUDGET"
  | "LIKELY_WITHIN_BUDGET"
  | "MAY_EXCEED_BUDGET"
  | "UNKNOWN";

export interface AffordabilityResult {
  budgetFit: BudgetFit;

  estimatedCostPerPerson?: number;

  estimatedTotalCost?: number;

  budgetPerPerson?: number;

  affordabilityScore: number;

  confidence:
    | "HIGH"
    | "MEDIUM"
    | "LOW";

  explanation: string;
}