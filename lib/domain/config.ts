/**
 * Shared configuration constants for the Operations Engine (lib/domain/*).
 *
 * These are "Configuration Constants" per OPERATIONS_ENGINE_SPEC.md §3 —
 * company-wide policy assumptions that are not a fact about any specific
 * database row, and therefore need no schema field. Every tunable number
 * the domain layer uses lives in this one file so it's changed in one
 * place, not scattered across individual formula implementations.
 *
 * Later Operations Engine milestones append to this file rather than
 * creating a new constants module each time.
 */

/**
 * Service level factor (Z-score) used by the Safety Stock formula.
 * 1.65 corresponds to a ~95% service level (one-tailed).
 *
 * See OPERATIONS_ENGINE_SPEC.md §4.2.
 */
export const SERVICE_LEVEL_Z = 1.65;

/**
 * Default cost (₹) to place one purchase order, used by the EOQ formula.
 *
 * Schema Gap: no field anywhere represents this — it's a company-wide
 * process assumption, not a fact about any specific Product/Supplier row,
 * so it's a Configuration Constant rather than a proposed schema field.
 *
 * See OPERATIONS_ENGINE_SPEC.md §4.4.
 */
export const DEFAULT_ORDERING_COST = 500;

/**
 * Default annual holding cost, expressed as a fraction of a product's
 * unitCost, used by the EOQ formula (H = unitCost x DEFAULT_HOLDING_COST_RATE).
 *
 * Schema Gap: `Product.holdingCostRate` was proposed but not added (schema
 * frozen as of Milestone 2.3) — this constant is the fallback for every
 * product until/unless that field is ever introduced.
 *
 * See OPERATIONS_ENGINE_SPEC.md §4.4.
 */
export const DEFAULT_HOLDING_COST_RATE = 0.2;

/**
 * Minimum number of RECEIVED purchase orders required before a supplier's
 * Reliability Score is computed at all. Below this, the score stays `null`
 * ("not yet scored") rather than being derived from 1-2 data points that
 * could be wildly unrepresentative.
 *
 * See OPERATIONS_ENGINE_SPEC.md §4.8, Business Rules.
 */
export const MIN_ORDERS_FOR_RELIABILITY_SCORE = 3;

/**
 * Trailing window (in periods) used by the Moving Average forecaster.
 *
 * See OPERATIONS_ENGINE_SPEC.md §4.9.
 */
export const MOVING_AVERAGE_WINDOW = 4;

/**
 * Smoothing factor (alpha) used by the Exponential Smoothing forecaster.
 * Higher values weight recent periods more heavily.
 *
 * See OPERATIONS_ENGINE_SPEC.md §4.9.
 */
export const SMOOTHING_ALPHA = 0.3;

/**
 * How many of the most recent weekly periods to backtest (generate a
 * forecast for a period whose actual is already known, so accuracy can be
 * measured) when recalculating a product's forecasts. Matches the
 * Milestone 1.3 seed script's convention.
 *
 * See OPERATIONS_ENGINE_SPEC.md §4.9.
 */
export const FORECAST_BACKTEST_WEEKS = 12;

/**
 * Cumulative usage-value cutoffs for ABC Analysis. Products are ranked
 * descending by usage value; those making up the running cumulative total
 * up to `A` are Class A, up to `B` are Class B, and the remainder are
 * Class C — the standard 80/15/5 Pareto split.
 *
 * See OPERATIONS_ENGINE_SPEC.md §4.5.
 */
export const ABC_CUTOFFS = { A: 0.8, B: 0.95 };

/**
 * Target annual inventory turnover rate (turns/year), used to normalize
 * Inventory Turnover into a 0-100 "health" score for Operations Health
 * Score. Illustrative benchmark for a general FMCG catalog, not derived
 * from this dataset.
 *
 * See OPERATIONS_ENGINE_SPEC.md §4.10.
 */
export const TARGET_TURNOVER_RATE = 8;

/**
 * Warehouse utilization alert thresholds (percentages, matching
 * computeWarehouseUtilization's 0-100 scale).
 *
 * See OPERATIONS_ENGINE_SPEC.md §4.7, Business Rules.
 */
export const WAREHOUSE_UTILIZATION_THRESHOLDS = { warning: 85, critical: 95 };

/**
 * "Ideal" warehouse utilization band used by
 * computeWarehouseUtilizationHealth — below it, space is wasted; above it,
 * there's no room for incoming stock. Both incur a penalty, per the same
 * rationale as the alert thresholds above.
 *
 * See OPERATIONS_ENGINE_SPEC.md §4.10.
 */
export const WAREHOUSE_UTILIZATION_IDEAL_BAND = { min: 65, max: 85 };

/**
 * Operations Health Score component weights. Must sum to 1.0 when all five
 * components are present; computeOperationsHealthScore renormalizes
 * automatically when one or more components are unavailable (see
 * OPERATIONS_ENGINE_SPEC.md §4.10, Business Rules) — these are the nominal
 * weights, not a guarantee every recalculation uses all of them.
 *
 * Reflects a deliberate priority ordering, not a derived/"correct" answer:
 * immediate stockout/overstock risk (inventory) matters most day-to-day,
 * followed equally by supplier risk and forecast trust, with warehouse
 * balance and turnover weighted lowest as more lagging/strategic signals.
 */
export const OPERATIONS_HEALTH_WEIGHTS = {
  inventory: 0.35,
  supplier: 0.2,
  forecast: 0.2,
  warehouse: 0.15,
  turnover: 0.1,
};

/**
 * Below this Supplier Reliability Score, a supplier is flagged as an
 * at-risk/low-reliability recommendation candidate.
 *
 * This is a Recommendation Rule Engine threshold, not an Operations Engine
 * formula — it decides when an already-computed reliabilityScore
 * (Milestone 2.5) is worth surfacing to a user, and adds no new metric of
 * its own.
 */
export const LOW_RELIABILITY_THRESHOLD = 70;

/**
 * Minimum relative rise (%) in a product's forecasted demand — comparing
 * the earliest to the latest point in its recent forecast series — for the
 * Recommendation Rule Engine to flag it as a demand-increase candidate.
 */
export const DEMAND_INCREASE_THRESHOLD_PERCENT = 15;

/**
 * A demand-increase recommendation is only raised when the product's
 * aggregate MAPE (Milestone 2.7) is at or below this ceiling — an
 * inaccurate forecast is not trustworthy enough to act on. Matches the
 * threshold proposed in OPERATIONS_ENGINE_SPEC.md §4.9's discussion of
 * gating downstream recommendations by forecast trust.
 */
export const MAX_TRUSTED_FORECAST_MAPE = 30;
