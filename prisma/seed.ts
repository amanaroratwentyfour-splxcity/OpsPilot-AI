import "dotenv/config";
import { randomUUID } from "node:crypto";
import {
  PrismaClient,
  ProductCategory,
  StockStatus,
  PurchaseOrderStatus,
  ForecastMethod,
  RecommendationCategory,
  RecommendationSeverity,
  RecommendationStatus,
  TransactionType,
} from "../lib/generated/prisma/client";

const prisma = new PrismaClient();

/* =============================================================================
 * OpsPilot AI — NovaFoods Pvt. Ltd. synthetic dataset (Milestone 1.3)
 *
 * WHAT THIS FILE DOES
 * This script builds one internally-consistent, realistic FMCG operations
 * dataset entirely in memory, then writes it to the database in dependency
 * order. Nothing here is meaningless filler: every table is either
 * hand-curated fact (warehouse locations, supplier names/terms, product
 * catalog) or the output of an explicit, documented formula grounded in
 * that hand-curated data (demand seasonality, safety stock, reorder points,
 * purchase order timing, forecasts, recommendations).
 *
 * NO RANDOM NUMBER GENERATOR IS USED ANYWHERE IN THIS FILE.
 * The only exception is `randomUUID()` for opaque primary keys, which has no
 * bearing on any business value — everything a chart, KPI, or recommendation
 * would surface is either a fixed constant or produced by the deterministic
 * helpers below (`frac`, `rangeValue`, `wiggle`), which are fixed
 * trigonometric hashes: the same inputs always produce the same output.
 * Re-running this script twice on the same day produces byte-identical
 * business data.
 *
 * TIME WINDOW
 * The 18-month demand history window ends at the most recent Monday
 * relative to whenever this script is actually run (see `CURRENT_WEEK_START`
 * below), so the dataset always reads as "current" for a live demo. This is
 * a deliberate choice, not a source of randomness: it depends only on the
 * system clock, not on chance.
 *
 * WHERE THE "BUSINESS CALCULATIONS" LINE IS DRAWN
 * Milestone 1.3 explicitly excludes building the reusable OM calculation
 * engine (lib/domain/*) — that's a later milestone. Safety stock and reorder
 * point ARE computed here, using the exact formulas documented in
 * PRODUCT_REQUIREMENTS_DOCUMENT.md, because the brief requires believable
 * Critical/Low/Healthy/Overstocked inventory profiles, which are impossible
 * to construct without a real reorder point to compare against. This is
 * one-off generation math local to this file, not a shared/importable
 * domain module — the real engine (built later) will supersede it.
 * ABC classification and Supplier.reliabilityScore are deliberately NOT
 * computed here (reliabilityScore is a hand-set "current value" per
 * supplier); both are real algorithms with no bearing on the profiles this
 * milestone needs, so they're left for the domain engine milestone rather
 * than duplicated here.
 * ========================================================================= */

// ---------------------------------------------------------------------------
// Deterministic helpers — NO Math.random() / RNG state anywhere below.
// ---------------------------------------------------------------------------

function round(n: number, decimals = 0): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

/** Deterministic pseudo-random value in [0, 1). Classic trig-hash technique:
 *  a fixed function of (a, b), not a random number generator — same inputs
 *  always produce the same output. Used only to add realistic-looking
 *  variation to otherwise-uniform formulas (e.g. spreading purchase order
 *  dates), never to decide anything that should be "fair" or unpredictable. */
function frac(a: number, b: number): number {
  const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Deterministic value in [min, max), derived from `frac`. */
function rangeValue(min: number, max: number, a: number, b: number): number {
  return min + (max - min) * frac(a, b);
}

/** Deterministic multiplier in [1-amplitude, 1+amplitude], derived from `frac`. */
function wiggle(a: number, b: number, amplitude: number): number {
  return 1 + rangeValue(-amplitude, amplitude, a, b);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

function mostRecentMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sun .. 6 = Sat
  const diff = (day + 6) % 7; // days since the most recent Monday
  d.setDate(d.getDate() - diff);
  return d;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/** Pulls the trailing "<number><unit>" token out of a product name, e.g.
 *  "NovaFresh Toned Milk 500ml" -> "ml", "NovaBake Burger Buns 4pc" -> "pc".
 *  Derived from the name instead of duplicated as a separate field. */
function extractUnit(name: string): string {
  const match = name.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s*$/);
  return match ? match[2].toLowerCase() : "unit";
}

// ---------------------------------------------------------------------------
// Time window: 18 months (78 weeks) of history ending at the most recent
// Monday relative to "now".
// ---------------------------------------------------------------------------

const TODAY = new Date();
const HISTORY_WEEKS = 78;
const CURRENT_WEEK_START = mostRecentMonday(TODAY);
const FIRST_WEEK_START = addWeeks(CURRENT_WEEK_START, -(HISTORY_WEEKS - 1));
const SERVICE_LEVEL_Z = 1.65; // 95% service level — matches PRODUCT_REQUIREMENTS_DOCUMENT.md

// ---------------------------------------------------------------------------
// Seasonality model
//
// Each product is tagged with a "seasonal key" describing which of the
// brief's named real-world seasonal patterns it follows. Multipliers are
// indexed Jan (0) .. Dec (11) and are hand-derived from the patterns named
// in the brief: summer beverage/water spikes, stable tea & coffee, Diwali
// chocolate spikes (modeled in November), cricket-season (IPL, Apr-May)
// salty-snack spikes, and summer ice-cream demand.
// ---------------------------------------------------------------------------

type Subtype = "COLD" | "HOT" | "SALTY" | "CHOCOLATE" | "NONE";

type SeasonalKey =
  | "COLD_BEVERAGE"
  | "HOT_BEVERAGE"
  | "CHOCOLATE"
  | "SALTY_SNACK"
  | "DAIRY"
  | "BAKERY"
  | "PERSONAL_CARE"
  | "HOUSEHOLD"
  | "FROZEN_FOODS";

const SEASONAL_MULTIPLIERS: Record<SeasonalKey, number[]> = {
  // Cold drinks / water: peak Apr-Jun (Indian summer), lowest in winter.
  COLD_BEVERAGE: [0.75, 0.8, 1.0, 1.35, 1.5, 1.4, 1.15, 1.1, 1.0, 0.9, 0.8, 0.75],
  // Tea & coffee: relatively stable, mild winter uptick.
  HOT_BEVERAGE: [1.1, 1.05, 1.0, 0.95, 0.9, 0.9, 0.9, 0.9, 0.95, 1.0, 1.05, 1.15],
  // Chocolates: sharp Diwali spike (modeled in Nov), elevated Dec (gifting/New Year).
  CHOCOLATE: [1.0, 1.15, 0.95, 0.9, 0.9, 0.9, 0.9, 0.9, 1.0, 1.6, 2.2, 1.3],
  // Salty snacks: cricket season (IPL, Apr-May) spike, mild festive bump.
  SALTY_SNACK: [0.95, 0.95, 1.0, 1.35, 1.3, 1.05, 1.0, 1.0, 1.0, 1.15, 1.2, 1.1],
  // Dairy: stable, mild winter uptick.
  DAIRY: [1.05, 1.05, 1.0, 0.95, 0.9, 0.9, 0.95, 0.95, 1.0, 1.05, 1.05, 1.1],
  // Bakery: stable, Dec/Jan cake season and mild Diwali bump.
  BAKERY: [1.0, 0.95, 0.95, 0.95, 0.9, 0.9, 0.95, 0.95, 1.0, 1.1, 1.15, 1.3],
  // Personal care: mild summer bump (sunscreen/deodorant-type items).
  PERSONAL_CARE: [0.9, 0.95, 1.05, 1.2, 1.25, 1.15, 1.05, 1.0, 0.95, 0.95, 0.9, 0.9],
  // Household: Diwali cleaning bump (Oct/Nov) and New Year.
  HOUSEHOLD: [0.95, 0.9, 0.9, 0.9, 0.9, 0.95, 0.95, 0.95, 1.0, 1.3, 1.4, 1.15],
  // Frozen foods: summer ice-cream bump, monsoon/winter dip.
  FROZEN_FOODS: [0.85, 0.9, 1.1, 1.35, 1.5, 1.3, 1.05, 1.0, 0.95, 0.95, 0.9, 0.85],
};

function seasonalKeyFor(category: ProductCategory, subtype: Subtype): SeasonalKey {
  if (category === ProductCategory.BEVERAGES)
    return subtype === "HOT" ? "HOT_BEVERAGE" : "COLD_BEVERAGE";
  if (category === ProductCategory.SNACKS)
    return subtype === "CHOCOLATE" ? "CHOCOLATE" : "SALTY_SNACK";
  if (category === ProductCategory.DAIRY) return "DAIRY";
  if (category === ProductCategory.BAKERY) return "BAKERY";
  if (category === ProductCategory.PERSONAL_CARE) return "PERSONAL_CARE";
  if (category === ProductCategory.HOUSEHOLD) return "HOUSEHOLD";
  return "FROZEN_FOODS";
}

/** Which supplier pool a product should be sourced from. Beverages and
 *  snacks split into sub-pools (cold/hot, salty/chocolate) since NovaFoods'
 *  suppliers specialize that way; every other category maps 1:1 to itself. */
function supplierTagForItem(category: ProductCategory, subtype: Subtype): string {
  if (category === ProductCategory.BEVERAGES)
    return subtype === "HOT" ? "BEVERAGES_HOT" : "BEVERAGES_COLD";
  if (category === ProductCategory.SNACKS)
    return subtype === "CHOCOLATE" ? "SNACKS_CHOCOLATE" : "SNACKS_SALTY";
  return category;
}

// ---------------------------------------------------------------------------
// 1. WAREHOUSES — 4 Indian distribution centers with different utilization
//    characters. `capacityUnits` is deliberately left unset here: it's
//    calibrated after inventory is generated (see `calibrateWarehouseCapacities`)
//    so `targetUtilization` is an exact, guaranteed outcome rather than a guess.
// ---------------------------------------------------------------------------

interface WarehousePlan {
  id: string;
  name: string;
  location: string;
  targetUtilization: number;
  profileWeights: { CRITICAL: number; LOW: number; HEALTHY: number; OVERSTOCKED: number };
  capacityUnits: number;
}

function buildWarehousePlans(): WarehousePlan[] {
  const seeds: Omit<WarehousePlan, "id" | "capacityUnits">[] = [
    {
      name: "NovaFoods Delhi Distribution Center",
      location: "Delhi, India",
      targetUtilization: 0.78,
      profileWeights: { CRITICAL: 0.07, LOW: 0.18, HEALTHY: 0.6, OVERSTOCKED: 0.15 },
    },
    {
      name: "NovaFoods Mumbai Distribution Center",
      location: "Mumbai, India",
      targetUtilization: 0.91,
      profileWeights: { CRITICAL: 0.14, LOW: 0.27, HEALTHY: 0.51, OVERSTOCKED: 0.08 },
    },
    {
      name: "NovaFoods Bengaluru Distribution Center",
      location: "Bengaluru, India",
      targetUtilization: 0.63,
      profileWeights: { CRITICAL: 0.05, LOW: 0.14, HEALTHY: 0.66, OVERSTOCKED: 0.15 },
    },
    {
      name: "NovaFoods Kolkata Distribution Center",
      location: "Kolkata, India",
      targetUtilization: 0.46,
      profileWeights: { CRITICAL: 0.03, LOW: 0.09, HEALTHY: 0.54, OVERSTOCKED: 0.34 },
    },
  ];
  return seeds.map((s) => ({ ...s, id: randomUUID(), capacityUnits: 0 }));
}

// ---------------------------------------------------------------------------
// 2. SUPPLIERS — 20 hand-curated Indian FMCG vendors with distinct
//    performance characteristics. `serves` tags map to the product-side
//    `supplierTagForItem` output so every product draws from a coherent
//    pool of capable suppliers.
// ---------------------------------------------------------------------------

interface SupplierSeed {
  name: string;
  city: string;
  contractedLeadTimeDays: number;
  reliabilityScore: number;
  paymentTerms: string;
  serves: string[];
  /** Scenario flag (Milestone 1.3 business scenarios, item 1): this
   *  supplier's on-time delivery gets steadily worse as orders get more
   *  recent, instead of a flat delay probability. `reliabilityScore` above
   *  reflects its *current* (already-declined) state. */
  decliningReliability?: boolean;
}

const SUPPLIER_SEEDS: SupplierSeed[] = [
  {
    name: "Amrit Agro Foods Pvt. Ltd.",
    city: "Ludhiana",
    contractedLeadTimeDays: 4,
    reliabilityScore: 94,
    paymentTerms: "Net 30",
    serves: ["DAIRY"],
  },
  {
    name: "Silver Leaf Dairy Suppliers",
    city: "Anand",
    contractedLeadTimeDays: 5,
    reliabilityScore: 88,
    paymentTerms: "Net 30",
    serves: ["DAIRY"],
  },
  {
    name: "Himalayan Spring Beverages Ltd.",
    city: "Solan",
    contractedLeadTimeDays: 6,
    reliabilityScore: 91,
    paymentTerms: "Net 45",
    serves: ["BEVERAGES_COLD"],
  },
  {
    name: "Ganges Refreshments Co.",
    city: "Kanpur",
    contractedLeadTimeDays: 7,
    reliabilityScore: 68,
    paymentTerms: "Net 30",
    serves: ["BEVERAGES_COLD"],
    decliningReliability: true,
  },
  {
    name: "Nilgiri Tea & Coffee Traders",
    city: "Coonoor",
    contractedLeadTimeDays: 10,
    reliabilityScore: 90,
    paymentTerms: "Net 45",
    serves: ["BEVERAGES_HOT"],
  },
  {
    name: "Malabar Coffee Estates Pvt. Ltd.",
    city: "Wayanad",
    contractedLeadTimeDays: 12,
    reliabilityScore: 85,
    paymentTerms: "Net 45",
    serves: ["BEVERAGES_HOT"],
  },
  {
    name: "Golden Harvest Snacks Pvt. Ltd.",
    city: "Pune",
    contractedLeadTimeDays: 6,
    reliabilityScore: 82,
    paymentTerms: "Net 30",
    serves: ["SNACKS_SALTY"],
  },
  {
    name: "Deccan Namkeen Industries",
    city: "Hyderabad",
    contractedLeadTimeDays: 8,
    reliabilityScore: 74,
    paymentTerms: "Net 30",
    serves: ["SNACKS_SALTY"],
  },
  {
    name: "Cocoa Bliss Confectionery Ltd.",
    city: "Mumbai",
    contractedLeadTimeDays: 9,
    reliabilityScore: 93,
    paymentTerms: "Net 45",
    serves: ["SNACKS_CHOCOLATE"],
  },
  {
    name: "Continental Cocoa Imports Pvt. Ltd.",
    city: "Chennai",
    contractedLeadTimeDays: 21,
    reliabilityScore: 71,
    paymentTerms: "Net 60",
    serves: ["SNACKS_CHOCOLATE"],
  },
  {
    name: "Sunrise Bakers Supply Co.",
    city: "Delhi",
    contractedLeadTimeDays: 3,
    reliabilityScore: 89,
    paymentTerms: "Net 15",
    serves: ["BAKERY"],
  },
  {
    name: "Wheatfield Bakery Ingredients Ltd.",
    city: "Ludhiana",
    contractedLeadTimeDays: 5,
    reliabilityScore: 83,
    paymentTerms: "Net 30",
    serves: ["BAKERY"],
  },
  {
    name: "PureGlow Personal Care Manufacturing",
    city: "Ahmedabad",
    contractedLeadTimeDays: 8,
    reliabilityScore: 92,
    paymentTerms: "Net 45",
    serves: ["PERSONAL_CARE"],
  },
  {
    name: "Radiance Cosmetics & Wellness Pvt. Ltd.",
    city: "Baddi",
    contractedLeadTimeDays: 9,
    reliabilityScore: 80,
    paymentTerms: "Net 30",
    serves: ["PERSONAL_CARE"],
  },
  {
    name: "Sparkle Home Chemicals Pvt. Ltd.",
    city: "Vapi",
    contractedLeadTimeDays: 7,
    reliabilityScore: 86,
    paymentTerms: "Net 30",
    serves: ["HOUSEHOLD"],
  },
  {
    name: "Clean & Bright Industries",
    city: "Kanpur",
    contractedLeadTimeDays: 11,
    reliabilityScore: 64,
    paymentTerms: "Net 30",
    serves: ["HOUSEHOLD"],
  },
  {
    name: "ColdChain Frozen Foods Pvt. Ltd.",
    city: "Gurugram",
    contractedLeadTimeDays: 6,
    reliabilityScore: 87,
    paymentTerms: "Net 30",
    serves: ["FROZEN_FOODS"],
  },
  {
    name: "Arctic Exports Frozen Solutions",
    city: "Mundra",
    contractedLeadTimeDays: 18,
    reliabilityScore: 68,
    paymentTerms: "Net 60",
    serves: ["FROZEN_FOODS"],
  },
  {
    name: "East India Packaging & Trading Co.",
    city: "Kolkata",
    contractedLeadTimeDays: 14,
    reliabilityScore: 62,
    paymentTerms: "Net 45",
    serves: ["SNACKS_SALTY", "HOUSEHOLD"],
  },
  {
    name: "National FMCG Distributors Ltd.",
    city: "Delhi",
    contractedLeadTimeDays: 10,
    reliabilityScore: 76,
    paymentTerms: "Net 30",
    serves: ["DAIRY", "BEVERAGES_COLD", "BAKERY", "PERSONAL_CARE"],
  },
];

interface SupplierPlan extends SupplierSeed {
  id: string;
  contactEmail: string;
  contactPhone: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/pvt\.?|ltd\.?|co\.?|&/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);
}

function buildSupplierPlans(): SupplierPlan[] {
  return SUPPLIER_SEEDS.map((seed, index) => {
    const slug = slugify(seed.name);
    return {
      ...seed,
      id: randomUUID(),
      contactEmail: `procurement@${slug}.in`,
      contactPhone: `+91-9${String(800000000 + index * 10007).padStart(9, "0")}`,
    };
  });
}

// ---------------------------------------------------------------------------
// 3. PRODUCTS — ~203 SKUs across 7 categories, hand-curated names (no
//    generic/gibberish generation). Each category is a "block": a cost/
//    margin/demand range plus an ordered item list. Ordering matters —
//    earlier items in a block get higher `baseWeeklyDemand` (Pareto-style
//    decay), which naturally produces a realistic hero/mid/tail SKU mix.
// ---------------------------------------------------------------------------

interface ProductSeedItem {
  name: string;
  subtype?: Subtype;
}

interface CategoryBlock {
  category: ProductCategory;
  skuPrefix: string;
  perishable: boolean;
  costRange: [number, number];
  marginRange: [number, number];
  peakWeeklyDemand: number;
  demandDecay: number;
  items: ProductSeedItem[];
}

const CATEGORY_BLOCKS: CategoryBlock[] = [
  {
    category: ProductCategory.DAIRY,
    skuPrefix: "DAI",
    perishable: true,
    costRange: [15, 95],
    marginRange: [1.22, 1.35],
    peakWeeklyDemand: 900,
    demandDecay: 0.93,
    items: [
      { name: "NovaFresh Toned Milk 500ml" },
      { name: "NovaFresh Toned Milk 1L" },
      { name: "NovaFresh Full Cream Milk 500ml" },
      { name: "NovaFresh Full Cream Milk 1L" },
      { name: "NovaFresh Skimmed Milk 1L" },
      { name: "NovaFresh Curd 200g" },
      { name: "NovaFresh Curd 500g" },
      { name: "NovaFresh Greek Yogurt 100g" },
      { name: "NovaFresh Greek Yogurt 400g" },
      { name: "NovaFresh Paneer 200g" },
      { name: "NovaFresh Paneer 500g" },
      { name: "NovaFresh Butter 100g" },
      { name: "NovaFresh Butter 500g" },
      { name: "NovaFresh Salted Butter 200g" },
      { name: "NovaFresh Cheese Slices 200g" },
      { name: "NovaFresh Processed Cheese Block 400g" },
      { name: "NovaFresh Mozzarella Cheese 200g" },
      { name: "NovaFresh Ghee 500ml" },
      { name: "NovaFresh Ghee 1L" },
      { name: "NovaFresh Buttermilk 200ml" },
      { name: "NovaFresh Buttermilk 1L" },
      { name: "NovaFresh Fresh Cream 200ml" },
      { name: "NovaFresh Flavoured Milk Chocolate 200ml" },
      { name: "NovaFresh Flavoured Milk Strawberry 200ml" },
      { name: "NovaFresh Probiotic Lassi Sweet 200ml" },
      { name: "NovaFresh Probiotic Lassi Mango 200ml" },
      { name: "NovaFresh Condensed Milk 400g" },
      { name: "NovaFresh Milk Powder 500g" },
      { name: "NovaFresh Cheese Cubes 200g" },
      { name: "NovaFresh Whipped Cream 200ml" },
      { name: "NovaFresh Low Fat Curd 400g" },
    ],
  },
  {
    category: ProductCategory.BEVERAGES,
    skuPrefix: "BEV",
    perishable: false,
    costRange: [8, 160],
    marginRange: [1.35, 1.7],
    peakWeeklyDemand: 1200,
    demandDecay: 0.93,
    items: [
      // Cold beverages (subtype COLD) first — these are the category's
      // hero/high-volume SKUs (see COLD_BEVERAGE seasonality above).
      { name: "NovaFizz Cola 250ml", subtype: "COLD" },
      { name: "NovaFizz Cola 750ml", subtype: "COLD" },
      { name: "NovaFizz Cola 1.25L", subtype: "COLD" },
      { name: "NovaSpring Mineral Water 500ml", subtype: "COLD" },
      { name: "NovaSpring Mineral Water 1L", subtype: "COLD" },
      { name: "NovaSpring Mineral Water 2L", subtype: "COLD" },
      { name: "NovaFizz Lemon Soda 250ml", subtype: "COLD" },
      { name: "NovaFizz Orange Crush 250ml", subtype: "COLD" },
      { name: "NovaFizz Orange Crush 750ml", subtype: "COLD" },
      { name: "NovaFizz Mango Juice 200ml", subtype: "COLD" },
      { name: "NovaFizz Mixed Fruit Juice 1L", subtype: "COLD" },
      { name: "NovaFizz Apple Juice 1L", subtype: "COLD" },
      { name: "NovaFizz Grape Juice 1L", subtype: "COLD" },
      { name: "NovaFizz Electrolyte Sports Drink 500ml", subtype: "COLD" },
      { name: "NovaFizz Iced Lemon Tea 250ml", subtype: "COLD" },
      { name: "NovaFizz Iced Peach Tea 250ml", subtype: "COLD" },
      { name: "NovaChill Energy Drink 250ml", subtype: "COLD" },
      { name: "NovaFizz Coconut Water 200ml", subtype: "COLD" },
      { name: "NovaFizz Tender Coconut Water 500ml", subtype: "COLD" },
      { name: "NovaFizz Soda Water 750ml", subtype: "COLD" },
      { name: "NovaBrew Cold Coffee Premix 200g", subtype: "COLD" },
      // Hot beverages (subtype HOT) — stable, lower-volume tail.
      { name: "NovaBrew Assam Tea 250g", subtype: "HOT" },
      { name: "NovaBrew Assam Tea 500g", subtype: "HOT" },
      { name: "NovaBrew Masala Chai 250g", subtype: "HOT" },
      { name: "NovaBrew Green Tea 100g", subtype: "HOT" },
      { name: "NovaBrew Darjeeling Tea 250g", subtype: "HOT" },
      { name: "NovaBrew Ginger Tea 250g", subtype: "HOT" },
      { name: "NovaBrew Instant Coffee 100g", subtype: "HOT" },
      { name: "NovaBrew Instant Coffee 200g", subtype: "HOT" },
      { name: "NovaBrew Filter Coffee Powder 500g", subtype: "HOT" },
      { name: "NovaBrew Hot Chocolate Mix 200g", subtype: "HOT" },
    ],
  },
  {
    category: ProductCategory.SNACKS,
    skuPrefix: "SNK",
    perishable: false,
    costRange: [8, 130],
    marginRange: [1.4, 1.75],
    peakWeeklyDemand: 850,
    demandDecay: 0.92,
    items: [
      // Salty/savory snacks (subtype SALTY) — cricket-season (IPL) spikes.
      { name: "CrispKing Salted Potato Chips 52g", subtype: "SALTY" },
      { name: "CrispKing Salted Potato Chips 130g", subtype: "SALTY" },
      { name: "CrispKing Masala Potato Chips 52g", subtype: "SALTY" },
      { name: "CrispKing Cream & Onion Chips 130g", subtype: "SALTY" },
      { name: "CrispKing Banana Chips 150g", subtype: "SALTY" },
      { name: "CrispKing Nachos Cheese 100g", subtype: "SALTY" },
      { name: "CrispKing Extruded Rings Masala 60g", subtype: "SALTY" },
      { name: "CrispKing Puffed Corn Cheese Balls 70g", subtype: "SALTY" },
      { name: "CrispKing Roasted Peanuts Masala 200g", subtype: "SALTY" },
      { name: "CrispKing Mixture Namkeen 200g", subtype: "SALTY" },
      { name: "CrispKing Bhujia Sev 200g", subtype: "SALTY" },
      { name: "CrispKing Popcorn Butter 80g", subtype: "SALTY" },
      { name: "CrispKing Popcorn Caramel 80g", subtype: "SALTY" },
      { name: "CrispKing Multigrain Chips 90g", subtype: "SALTY" },
      { name: "CrispKing Trail Mix Nuts & Raisins 150g", subtype: "SALTY" },
      { name: "CrispKing Wafer Sticks Cheese 100g", subtype: "SALTY" },
      { name: "CrispKing Roasted Makhana 100g", subtype: "SALTY" },
      { name: "CrispKing Rice Crackers 100g", subtype: "SALTY" },
      // Chocolates / confectionery (subtype CHOCOLATE) — Diwali spike.
      { name: "SweetNova Milk Chocolate Bar 40g", subtype: "CHOCOLATE" },
      { name: "SweetNova Dark Chocolate Bar 40g", subtype: "CHOCOLATE" },
      { name: "SweetNova Chocolate Gift Box 200g", subtype: "CHOCOLATE" },
      { name: "SweetNova Assorted Toffees 250g", subtype: "CHOCOLATE" },
      { name: "SweetNova Fruit Candy Pouch 150g", subtype: "CHOCOLATE" },
      { name: "SweetNova Chocolate Eclairs 200g", subtype: "CHOCOLATE" },
      { name: "SweetNova Wafer Chocolate Bar 30g", subtype: "CHOCOLATE" },
      { name: "SweetNova Festive Dry Fruit Chocolate Box 300g", subtype: "CHOCOLATE" },
      { name: "SweetNova Chocolate Coated Almonds 100g", subtype: "CHOCOLATE" },
      { name: "SweetNova Mint Candy Pack 100g", subtype: "CHOCOLATE" },
      { name: "SweetNova Gummy Bears 150g", subtype: "CHOCOLATE" },
    ],
  },
  {
    category: ProductCategory.BAKERY,
    skuPrefix: "BAK",
    perishable: true,
    costRange: [15, 75],
    marginRange: [1.3, 1.5],
    peakWeeklyDemand: 600,
    demandDecay: 0.93,
    items: [
      { name: "NovaBake White Bread 400g" },
      { name: "NovaBake Brown Bread 400g" },
      { name: "NovaBake Multigrain Bread 400g" },
      { name: "NovaBake Milk Bread 350g" },
      { name: "NovaBake Sandwich Bread 400g" },
      { name: "NovaBake Burger Buns 4pc" },
      { name: "NovaBake Pav 6pc" },
      { name: "NovaBake Glucose Biscuits 200g" },
      { name: "NovaBake Marie Biscuits 250g" },
      { name: "NovaBake Cream Biscuits Chocolate 150g" },
      { name: "NovaBake Digestive Biscuits 200g" },
      { name: "NovaBake Butter Cookies 250g" },
      { name: "NovaBake Coconut Cookies 200g" },
      { name: "NovaBake Cream Crackers 200g" },
      { name: "NovaBake Rusk 300g" },
      { name: "NovaBake Wheat Rusk 300g" },
      { name: "NovaBake Muffins Chocolate Chip 4pc" },
      { name: "NovaBake Plum Cake 250g" },
      { name: "NovaBake Fruit Cake 400g" },
      { name: "NovaBake Doughnuts Glazed 4pc" },
      { name: "NovaBake Croissant Butter 4pc" },
      { name: "NovaBake Cup Cakes Vanilla 6pc" },
      { name: "NovaBake Chocolate Brownie 4pc" },
      { name: "NovaBake Pizza Base 2pc" },
      { name: "NovaBake Bread Sticks 150g" },
      { name: "NovaBake Garlic Bread 250g" },
      { name: "NovaBake Bread Rolls 6pc" },
    ],
  },
  {
    category: ProductCategory.PERSONAL_CARE,
    skuPrefix: "PCR",
    perishable: false,
    costRange: [25, 220],
    marginRange: [1.5, 2.0],
    peakWeeklyDemand: 350,
    demandDecay: 0.93,
    items: [
      { name: "PureGlow Herbal Shampoo 200ml" },
      { name: "PureGlow Anti-Dandruff Shampoo 200ml" },
      { name: "PureGlow Conditioner 200ml" },
      { name: "PureGlow Kids Shampoo 200ml" },
      { name: "PureGlow Body Wash 250ml" },
      { name: "PureGlow Bathing Soap 100g" },
      { name: "PureGlow Bathing Soap Sandal 125g" },
      { name: "PureGlow Glycerin Soap 75g" },
      { name: "PureGlow Toothpaste 100g" },
      { name: "PureGlow Toothpaste Herbal 150g" },
      { name: "PureGlow Toothbrush Soft 1pc" },
      { name: "PureGlow Mouthwash 250ml" },
      { name: "PureGlow Face Wash Neem 100g" },
      { name: "PureGlow Face Wash Charcoal 100g" },
      { name: "PureGlow Talcum Powder 200g" },
      { name: "PureGlow Deodorant Spray 150ml" },
      { name: "PureGlow Roll-On Deodorant 50ml" },
      { name: "PureGlow Sunscreen Lotion SPF50 100ml" },
      { name: "PureGlow Body Lotion 200ml" },
      { name: "PureGlow Hand Cream 100ml" },
      { name: "PureGlow Lip Balm 4.5g" },
      { name: "PureGlow Hair Oil Coconut 200ml" },
      { name: "PureGlow Hair Oil Almond 200ml" },
      { name: "PureGlow Shaving Cream 70g" },
      { name: "PureGlow Aftershave Lotion 100ml" },
      { name: "PureGlow Razor Blades 5pc" },
      { name: "PureGlow Sanitary Pads 10pc" },
      { name: "PureGlow Baby Powder 200g" },
      { name: "PureGlow Hand Sanitizer 100ml" },
    ],
  },
  {
    category: ProductCategory.HOUSEHOLD,
    skuPrefix: "HHD",
    perishable: false,
    costRange: [20, 190],
    marginRange: [1.4, 1.8],
    peakWeeklyDemand: 300,
    demandDecay: 0.93,
    items: [
      { name: "HomeShine Dishwash Liquid 500ml" },
      { name: "HomeShine Dishwash Bar 200g" },
      { name: "HomeShine Laundry Detergent Powder 1kg" },
      { name: "HomeShine Laundry Detergent Powder 3kg" },
      { name: "HomeShine Liquid Detergent 1L" },
      { name: "HomeShine Fabric Softener 500ml" },
      { name: "HomeShine Floor Cleaner 1L" },
      { name: "HomeShine Toilet Cleaner 500ml" },
      { name: "HomeShine Glass Cleaner 500ml" },
      { name: "HomeShine Bathroom Cleaner 500ml" },
      { name: "HomeShine All Purpose Cleaner 500ml" },
      { name: "HomeShine Mosquito Repellent Liquid 45ml" },
      { name: "HomeShine Mosquito Coil 10pc" },
      { name: "HomeShine Air Freshener Spray 250ml" },
      { name: "HomeShine Scented Candles 2pc" },
      { name: "HomeShine Aluminium Foil 10m" },
      { name: "HomeShine Cling Wrap 20m" },
      { name: "HomeShine Garbage Bags Medium 30pc" },
      { name: "HomeShine Garbage Bags Large 30pc" },
      { name: "HomeShine Tissue Paper Box 100pc" },
      { name: "HomeShine Toilet Roll 4pc" },
      { name: "HomeShine Kitchen Towel Roll 2pc" },
      { name: "HomeShine Wet Wipes 80pc" },
      { name: "HomeShine Steel Scrub Pads 5pc" },
      { name: "HomeShine Matchbox 10pc" },
      { name: "HomeShine Shoe Polish 40ml" },
      { name: "HomeShine Room Freshener Gel 100g" },
      { name: "HomeShine Naphthalene Balls 200g" },
      { name: "HomeShine Diwali Diya Set 12pc" },
    ],
  },
  {
    category: ProductCategory.FROZEN_FOODS,
    skuPrefix: "FRZ",
    perishable: true,
    costRange: [40, 260],
    marginRange: [1.3, 1.5],
    peakWeeklyDemand: 400,
    demandDecay: 0.92,
    items: [
      { name: "ArcticBite Green Peas 500g" },
      { name: "ArcticBite Mixed Vegetables 500g" },
      { name: "ArcticBite Sweet Corn 500g" },
      { name: "ArcticBite French Fries 500g" },
      { name: "ArcticBite Aloo Tikki 400g" },
      { name: "ArcticBite Veg Nuggets 400g" },
      { name: "ArcticBite Chicken Nuggets 400g" },
      { name: "ArcticBite Chicken Sausages 400g" },
      { name: "ArcticBite Chicken Wings 500g" },
      { name: "ArcticBite Fish Fingers 400g" },
      { name: "ArcticBite Veg Spring Rolls 400g" },
      { name: "ArcticBite Veg Cutlet 400g" },
      { name: "ArcticBite Paratha Plain 5pc" },
      { name: "ArcticBite Paratha Aloo 5pc" },
      { name: "ArcticBite Frozen Idli 12pc" },
      { name: "ArcticBite Momos Veg 400g" },
      { name: "ArcticBite Momos Chicken 400g" },
      { name: "ArcticBite Corn Cheese Balls 350g" },
      { name: "ArcticBite Frozen Garlic Bread 300g" },
      { name: "ArcticBite Frozen Peas Corn Mix 500g" },
      { name: "ArcticBite Frozen Mango Pulp 500g" },
      { name: "ArcticBite Frozen Paneer Peas Gravy 400g" },
      { name: "ArcticBite Ice Cream Vanilla 700ml" },
      { name: "ArcticBite Ice Cream Chocolate 700ml" },
      { name: "ArcticBite Ice Cream Butterscotch 700ml" },
      { name: "ArcticBite Kulfi Bar 4pc" },
      { name: "ArcticBite Ice Cream Cone 4pc" },
    ],
  },
];

interface ProductPlan {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  subtype: Subtype;
  unitOfMeasure: string;
  unitCost: number;
  unitPrice: number;
  leadTimeDays: number;
  perishable: boolean;
  primarySupplierId: string;
  baseWeeklyDemand: number;
  seasonalKey: SeasonalKey;
  globalIndex: number;
  /** Business scenario (item 5): a handful of legacy-feeling products are
   *  deliberately tagged as declining instead of following the catalog-wide
   *  growth trend — see DECLINING_DEMAND_PRODUCT_NAMES below. */
  demandTrend: "GROWING" | "DECLINING";
}

/** Business scenario (item 5): products with a deliberately declining demand
 *  trend instead of the catalog-wide growth trend — plausible "changing
 *  consumer preference" items (condensed milk, rusk, talcum powder,
 *  mothballs, kulfi bars) rather than an arbitrary random subset. */
const DECLINING_DEMAND_PRODUCT_NAMES = new Set<string>([
  "NovaFresh Condensed Milk 400g",
  "NovaBake Wheat Rusk 300g",
  "PureGlow Talcum Powder 200g",
  "HomeShine Naphthalene Balls 200g",
  "ArcticBite Kulfi Bar 4pc",
]);

function buildProductPlans(supplierPlans: SupplierPlan[]): ProductPlan[] {
  const suppliersByTag = new Map<string, SupplierPlan[]>();
  for (const s of supplierPlans) {
    for (const tag of s.serves) {
      if (!suppliersByTag.has(tag)) suppliersByTag.set(tag, []);
      suppliersByTag.get(tag)!.push(s);
    }
  }

  const plans: ProductPlan[] = [];
  let globalIndex = 0;
  for (const block of CATEGORY_BLOCKS) {
    const n = block.items.length;
    block.items.forEach((item, i) => {
      const subtype: Subtype = item.subtype ?? "NONE";
      const t = n <= 1 ? 0 : i / (n - 1);
      const unitCost = round(block.costRange[0] + (block.costRange[1] - block.costRange[0]) * t, 2);
      const marginMultiplier =
        block.marginRange[0] + (block.marginRange[1] - block.marginRange[0]) * frac(globalIndex, 3);
      const unitPrice = round(unitCost * marginMultiplier, 2);
      const baseWeeklyDemand = Math.max(
        15,
        Math.round(block.peakWeeklyDemand * Math.pow(block.demandDecay, i)),
      );

      const tag = supplierTagForItem(block.category, subtype);
      const pool = suppliersByTag.get(tag);
      if (!pool || pool.length === 0) {
        throw new Error(`No supplier configured for tag "${tag}" (product "${item.name}")`);
      }
      const supplier = pool[i % pool.length];

      plans.push({
        id: randomUUID(),
        sku: `${block.skuPrefix}-${String(i + 1).padStart(4, "0")}`,
        name: item.name,
        category: block.category,
        subtype,
        unitOfMeasure: extractUnit(item.name),
        unitCost,
        unitPrice,
        leadTimeDays: supplier.contractedLeadTimeDays,
        perishable: block.perishable,
        primarySupplierId: supplier.id,
        baseWeeklyDemand,
        seasonalKey: seasonalKeyFor(block.category, subtype),
        globalIndex,
        demandTrend: DECLINING_DEMAND_PRODUCT_NAMES.has(item.name) ? "DECLINING" : "GROWING",
      });
      globalIndex += 1;
    });
  }
  return plans;
}

// ---------------------------------------------------------------------------
// 4. DEMAND HISTORY — 78 weekly data points per product, built from
//    baseWeeklyDemand x seasonalMultiplier(month) x trend x deterministic
//    wiggle. This is the single source of truth that inventory safety
//    stock/reorder points, forecasts, and the "demand expected to increase"
//    recommendations are all derived from.
// ---------------------------------------------------------------------------

interface DemandPoint {
  weekStart: Date;
  quantity: number;
}

function buildDemandSeries(productPlans: ProductPlan[]): Map<string, DemandPoint[]> {
  const map = new Map<string, DemandPoint[]>();
  for (const p of productPlans) {
    const series: DemandPoint[] = [];
    for (let w = 0; w < HISTORY_WEEKS; w++) {
      const weekStart = addWeeks(FIRST_WEEK_START, w);
      const month = weekStart.getMonth();
      const seasonal = SEASONAL_MULTIPLIERS[p.seasonalKey][month];
      // Catalog-wide products grow ~16% over 18 months; DECLINING-tagged
      // products (business scenario item 5) instead shrink ~30%.
      const trend =
        p.demandTrend === "DECLINING"
          ? 1.15 - 0.35 * (w / (HISTORY_WEEKS - 1))
          : 0.92 + 0.16 * (w / (HISTORY_WEEKS - 1));
      const noise = wiggle(p.globalIndex, w, 0.04); // deterministic +/-4% wiggle, not RNG
      const quantity = Math.max(0, Math.round(p.baseWeeklyDemand * seasonal * trend * noise));
      series.push({ weekStart, quantity });
    }
    map.set(p.id, series);
  }
  return map;
}

// ---------------------------------------------------------------------------
// 5. INVENTORY — safety stock & reorder point computed from each product's
//    real generated demand series (Z x sigma x sqrt(L); avgDailyDemand x L
//    + safetyStock), then on-hand quantity assigned per warehouse from a
//    deterministic Critical/Low/Healthy/Overstocked profile whose weights
//    vary by warehouse (see WAREHOUSES above) — this is what makes Mumbai
//    read as "tight" and Kolkata read as "overstocked" across the catalog.
// ---------------------------------------------------------------------------

interface InventoryPlan {
  id: string;
  productId: string;
  warehouseId: string;
  onHandQty: number;
  safetyStock: number;
  reorderPoint: number;
  stockStatus: StockStatus;
  lastCalculatedAt: Date;
}

function computeMeanStd(values: number[]): { mean: number; std: number } {
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}

function safetyStockAndReorderPoint(series: DemandPoint[], leadTimeDays: number) {
  const daily = series.map((p) => p.quantity / 7);
  const { mean, std } = computeMeanStd(daily);
  const safetyStock = Math.round(SERVICE_LEVEL_Z * std * Math.sqrt(leadTimeDays));
  const reorderPoint = Math.max(Math.round(mean * leadTimeDays + safetyStock), safetyStock + 1);
  return { safetyStock, reorderPoint };
}

function pickStockStatus(weights: WarehousePlan["profileWeights"], selector: number): StockStatus {
  const cCut = weights.CRITICAL * 100;
  const lCut = cCut + weights.LOW * 100;
  const hCut = lCut + weights.HEALTHY * 100;
  if (selector < cCut) return StockStatus.CRITICAL;
  if (selector < lCut) return StockStatus.LOW;
  if (selector < hCut) return StockStatus.HEALTHY;
  return StockStatus.OVERSTOCKED;
}

function onHandForStatus(reorderPoint: number, status: StockStatus, a: number, b: number): number {
  const rp = Math.max(reorderPoint, 5);
  if (status === StockStatus.CRITICAL) return Math.round(rp * rangeValue(0.3, 0.55, a, b));
  if (status === StockStatus.LOW) return Math.round(rp * rangeValue(1.0, 1.2, a, b));
  if (status === StockStatus.HEALTHY) return Math.round(rp * rangeValue(1.8, 2.8, a, b));
  return Math.round(rp * rangeValue(4.0, 6.5, a, b)); // OVERSTOCKED
}

function buildInventoryPlans(
  productPlans: ProductPlan[],
  demandByProduct: Map<string, DemandPoint[]>,
  warehousePlans: WarehousePlan[],
): InventoryPlan[] {
  const plans: InventoryPlan[] = [];
  productPlans.forEach((product, pIndex) => {
    const series = demandByProduct.get(product.id)!;
    const { safetyStock, reorderPoint } = safetyStockAndReorderPoint(series, product.leadTimeDays);
    warehousePlans.forEach((warehouse, wIndex) => {
      const selector = frac(pIndex, wIndex * 97 + 13) * 100;
      const status = pickStockStatus(warehouse.profileWeights, selector);
      const onHandQty = onHandForStatus(reorderPoint, status, pIndex, wIndex * 31 + 7);
      plans.push({
        id: randomUUID(),
        productId: product.id,
        warehouseId: warehouse.id,
        onHandQty,
        safetyStock,
        reorderPoint,
        stockStatus: status,
        lastCalculatedAt: CURRENT_WEEK_START,
      });
    });
  });
  return plans;
}

/** Derives each warehouse's capacityUnits from its actual generated stock
 *  total and its target utilization, so "different capacities, different
 *  utilization levels" is an exact, guaranteed outcome rather than a guess. */
function calibrateWarehouseCapacities(
  warehousePlans: WarehousePlan[],
  inventoryPlans: InventoryPlan[],
): void {
  for (const warehouse of warehousePlans) {
    const sum = inventoryPlans
      .filter((inv) => inv.warehouseId === warehouse.id)
      .reduce((s, inv) => s + inv.onHandQty, 0);
    warehouse.capacityUnits = Math.max(1000, Math.round(sum / warehouse.targetUtilization));
  }
}

// ---------------------------------------------------------------------------
// 5b. DELIBERATE BUSINESS SCENARIOS (Milestone 1.3 follow-up)
//
// The probabilistic generation above already produces broad, realistic
// variation — but a few specific, narratable stories are deliberately
// scripted on top of it so the dashboards/Copilot always have a clean,
// recognizable example to point at, rather than relying on "probably one of
// the 812 rows happens to be extreme enough":
//   item 7  — a handful of staple products forced HEALTHY everywhere
//   item 8  — one flagship near-zero "stockout risk" product
//   item 9  — one flagship deep-overstock product
//   item 10 — three products with a real Healthy -> Low -> Critical
//             transaction history over the trailing weeks, not just a
//             single-snapshot label
// (items 1 and 5 — declining supplier reliability and declining demand — are
// handled where they naturally belong: buildPurchaseOrderPlans and
// buildDemandSeries, respectively.)
// ---------------------------------------------------------------------------

const CONSISTENTLY_HEALTHY_PRODUCT_NAMES = [
  "NovaFresh Toned Milk 500ml",
  "NovaFizz Cola 250ml",
  "PureGlow Toothpaste 100g",
  "HomeShine Dishwash Liquid 500ml",
];

const FLAGSHIP_STOCKOUT = { productName: "ArcticBite Chicken Nuggets 400g", warehouseIndex: 1 }; // Mumbai
const FLAGSHIP_OVERSTOCK = {
  productName: "HomeShine Laundry Detergent Powder 3kg",
  warehouseIndex: 3,
}; // Kolkata

const TRAJECTORY_PRODUCTS = [
  { productName: "NovaBrew Instant Coffee 100g", warehouseIndex: 0 }, // Delhi
  { productName: "SweetNova Assorted Toffees 250g", warehouseIndex: 2 }, // Bengaluru
  { productName: "CrispKing Bhujia Sev 200g", warehouseIndex: 3 }, // Kolkata
];
const TRAJECTORY_WEEKS = 8;

function findInventoryFor(
  productPlans: ProductPlan[],
  warehousePlans: WarehousePlan[],
  inventoryPlans: InventoryPlan[],
  productName: string,
  warehouseIndex: number,
): { inv: InventoryPlan; product: ProductPlan } {
  const product = productPlans.find((p) => p.name === productName);
  if (!product) throw new Error(`Scenario override: product "${productName}" not found in catalog`);
  const warehouse = warehousePlans[warehouseIndex];
  const inv = inventoryPlans.find(
    (i) => i.productId === product.id && i.warehouseId === warehouse.id,
  );
  if (!inv) throw new Error(`Scenario override: inventory row for "${productName}" not found`);
  return { inv, product };
}

/** Mutates inventoryPlans in place for the scripted scenarios (items 7-9),
 *  and returns the weekly SALE transaction history backing the item-10
 *  Healthy -> Low -> Critical trajectories (mutating those 3 rows' final
 *  onHandQty/stockStatus too, to match the trajectory's last data point
 *  exactly). Must run BEFORE calibrateWarehouseCapacities so the warehouse
 *  utilization figures reflect these overrides. */
function applyBusinessScenarios(
  productPlans: ProductPlan[],
  warehousePlans: WarehousePlan[],
  inventoryPlans: InventoryPlan[],
): TransactionPlan[] {
  // Item 7: consistently healthy showcase products, at every warehouse.
  for (const name of CONSISTENTLY_HEALTHY_PRODUCT_NAMES) {
    const product = productPlans.find((p) => p.name === name)!;
    warehousePlans.forEach((warehouse, wIndex) => {
      const inv = inventoryPlans.find(
        (i) => i.productId === product.id && i.warehouseId === warehouse.id,
      )!;
      inv.stockStatus = StockStatus.HEALTHY;
      inv.onHandQty = Math.round(
        inv.reorderPoint * rangeValue(1.9, 2.3, product.globalIndex, wIndex + 500),
      );
    });
  }

  // Item 8: flagship stockout-risk product — deep into critical territory.
  const stockout = findInventoryFor(
    productPlans,
    warehousePlans,
    inventoryPlans,
    FLAGSHIP_STOCKOUT.productName,
    FLAGSHIP_STOCKOUT.warehouseIndex,
  );
  stockout.inv.stockStatus = StockStatus.CRITICAL;
  stockout.inv.onHandQty = Math.max(0, Math.round(stockout.inv.reorderPoint * 0.08));

  // Item 9: flagship overstock product — deep excess.
  const overstock = findInventoryFor(
    productPlans,
    warehousePlans,
    inventoryPlans,
    FLAGSHIP_OVERSTOCK.productName,
    FLAGSHIP_OVERSTOCK.warehouseIndex,
  );
  overstock.inv.stockStatus = StockStatus.OVERSTOCKED;
  overstock.inv.onHandQty = Math.round(overstock.inv.reorderPoint * 9);

  // Item 10: Healthy -> Low -> Critical trajectories, expressed as a real
  // weekly SALE transaction sequence ending exactly at the final Inventory
  // row's onHandQty — traceable in InventoryTransaction, not just a label.
  const trajectoryTransactions: TransactionPlan[] = [];
  TRAJECTORY_PRODUCTS.forEach(({ productName, warehouseIndex }, idx) => {
    const { inv, product } = findInventoryFor(
      productPlans,
      warehousePlans,
      inventoryPlans,
      productName,
      warehouseIndex,
    );
    const startLevel = Math.round(
      inv.reorderPoint * rangeValue(2.0, 2.4, product.globalIndex, 888),
    );
    const finalLevel = Math.max(
      0,
      Math.round(inv.reorderPoint * rangeValue(0.35, 0.5, product.globalIndex, 777)),
    );
    inv.stockStatus = StockStatus.CRITICAL;
    inv.onHandQty = finalLevel;

    let previousLevel = startLevel;
    for (let step = 1; step <= TRAJECTORY_WEEKS; step++) {
      const level = Math.round(startLevel + (finalLevel - startLevel) * (step / TRAJECTORY_WEEKS));
      const saleQuantity = previousLevel - level; // units sold this week (>= 0 since the trajectory is monotonically declining)
      const weeksAgo = TRAJECTORY_WEEKS - step;
      if (saleQuantity > 0) {
        trajectoryTransactions.push({
          id: randomUUID(),
          inventoryId: inv.id,
          transactionType: TransactionType.SALE,
          quantity: -saleQuantity,
          reference: `WEEKLY-SALES-TRAJ-${idx + 1}`,
          notes: `Week ${step}/${TRAJECTORY_WEEKS} of a demand-outpacing-replenishment decline from Healthy toward Critical.`,
          createdAt: addDays(CURRENT_WEEK_START, -weeksAgo * 7),
        });
      }
      previousLevel = level;
    }
  });

  return trajectoryTransactions;
}

// ---------------------------------------------------------------------------
// 6. PURCHASE ORDERS — ~145 orders spread across suppliers/warehouses/time,
//    with status drawn from a fixed weighted cycle (Open / Completed /
//    Delayed / Cancelled) and delivery delays correlated with each
//    supplier's reliabilityScore, so low-reliability suppliers show up with
//    visibly more delayed orders.
// ---------------------------------------------------------------------------

interface POItemPlan {
  id: string;
  purchaseOrderId: string;
  productId: string;
  quantity: number;
  unitCost: number;
}

interface POPlan {
  id: string;
  poNumber: string;
  supplierId: string;
  warehouseId: string;
  status: PurchaseOrderStatus;
  orderDate: Date;
  expectedDeliveryDate: Date;
  actualDeliveryDate: Date | null;
  items: POItemPlan[];
}

const PO_STATUS_CYCLE: PurchaseOrderStatus[] = [
  ...Array(13).fill(PurchaseOrderStatus.RECEIVED), // ~45% - completed (some flagged delayed below)
  ...Array(6).fill(PurchaseOrderStatus.IN_TRANSIT), // ~21% - open, en route
  ...Array(4).fill(PurchaseOrderStatus.APPROVED), // ~14% - open, confirmed
  ...Array(3).fill(PurchaseOrderStatus.SUBMITTED), // ~10% - open, awaiting approval
  ...Array(2).fill(PurchaseOrderStatus.DRAFT), // ~7% - open, not yet submitted
  ...Array(1).fill(PurchaseOrderStatus.CANCELLED), // ~3% - cancelled
];

const PURCHASE_ORDER_COUNT = 145; // 5 full cycles of PO_STATUS_CYCLE (length 29)

function weeksAgoRangeForStatus(status: PurchaseOrderStatus): [number, number] {
  switch (status) {
    case PurchaseOrderStatus.RECEIVED:
      return [4, 30];
    case PurchaseOrderStatus.IN_TRANSIT:
      return [0, 5];
    case PurchaseOrderStatus.APPROVED:
      return [0, 2];
    case PurchaseOrderStatus.SUBMITTED:
      return [0, 1.5];
    case PurchaseOrderStatus.DRAFT:
      return [0, 1];
    case PurchaseOrderStatus.CANCELLED:
      return [3, 20];
    default:
      return [0, 4];
  }
}

function buildPurchaseOrderPlans(
  productPlans: ProductPlan[],
  supplierPlans: SupplierPlan[],
  warehousePlans: WarehousePlan[],
): POPlan[] {
  const supplierById = new Map(supplierPlans.map((s) => [s.id, s]));
  const productsByCategory = new Map<ProductCategory, ProductPlan[]>();
  for (const p of productPlans) {
    if (!productsByCategory.has(p.category)) productsByCategory.set(p.category, []);
    productsByCategory.get(p.category)!.push(p);
  }

  const plans: POPlan[] = [];
  for (let i = 0; i < PURCHASE_ORDER_COUNT; i++) {
    const primaryProduct = productPlans[i % productPlans.length];
    const warehouse = warehousePlans[i % warehousePlans.length];
    const supplier = supplierById.get(primaryProduct.primarySupplierId)!;
    const status = PO_STATUS_CYCLE[i % PO_STATUS_CYCLE.length];

    const [minWeeks, maxWeeks] = weeksAgoRangeForStatus(status);
    const weeksAgo = rangeValue(minWeeks, maxWeeks, i, 7);
    const orderDate = addDays(CURRENT_WEEK_START, -Math.round(weeksAgo * 7));
    const expectedDeliveryDate = addDays(orderDate, supplier.contractedLeadTimeDays);

    let actualDeliveryDate: Date | null = null;
    if (status === PurchaseOrderStatus.RECEIVED) {
      // Lower-reliability suppliers are proportionally more likely to have shipped late.
      // Business scenario (item 1): a `decliningReliability` supplier's delay
      // chance instead grows with order *recency* — old orders were mostly
      // on time, recent orders are increasingly late — so the decline is a
      // real trend visible in the PO timeline, not just a static score.
      const [minReceivedWeeks, maxReceivedWeeks] = weeksAgoRangeForStatus(
        PurchaseOrderStatus.RECEIVED,
      );
      const recency = 1 - (weeksAgo - minReceivedWeeks) / (maxReceivedWeeks - minReceivedWeeks);
      const delayChance = supplier.decliningReliability
        ? 0.05 + Math.min(Math.max(recency, 0), 1) * 0.55
        : Math.max(0.03, (100 - supplier.reliabilityScore) / 130);
      const delayed = frac(i, 999) < delayChance;
      actualDeliveryDate = delayed
        ? addDays(expectedDeliveryDate, Math.round(rangeValue(2, 12, i, 17)))
        : addDays(expectedDeliveryDate, -Math.round(rangeValue(0, 2, i, 18)));
      if (actualDeliveryDate > CURRENT_WEEK_START) actualDeliveryDate = CURRENT_WEEK_START;
    }

    const categoryList = productsByCategory.get(primaryProduct.category)!;
    const primaryIndexInCategory = categoryList.indexOf(primaryProduct);
    const itemCount = 1 + Math.floor(rangeValue(0, 3, i, 23)); // 1-3 line items
    const poId = randomUUID();
    const items: POItemPlan[] = [];
    for (let k = 0; k < itemCount; k++) {
      const product =
        k === 0
          ? primaryProduct
          : categoryList[(primaryIndexInCategory + k * 5) % categoryList.length];
      const quantity = Math.max(
        10,
        Math.round(product.baseWeeklyDemand * rangeValue(2, 6, i, k * 3 + 1)),
      );
      const unitCost = round(product.unitCost * rangeValue(0.96, 1.06, i, k * 7 + 2), 2);
      items.push({
        id: randomUUID(),
        purchaseOrderId: poId,
        productId: product.id,
        quantity,
        unitCost,
      });
    }

    plans.push({
      id: poId,
      poNumber: `PO-${String(i + 1).padStart(5, "0")}`,
      supplierId: supplier.id,
      warehouseId: warehouse.id,
      status,
      orderDate,
      expectedDeliveryDate,
      actualDeliveryDate,
      items,
    });
  }
  return plans;
}

// ---------------------------------------------------------------------------
// 7. INVENTORY TRANSACTIONS — one PURCHASE-type audit entry per line item
//    of every RECEIVED purchase order (goods that actually arrived), dated
//    to the order's actual delivery date. We deliberately do NOT synthesize
//    a full SALE/ADJUSTMENT transaction log for the whole catalog here
//    (that would mean ~100k+ extra rows not requested in the brief); demand/
//    sales are represented via DemandHistory instead. The one exception is
//    the item-10 "Healthy -> Low -> Critical" business scenario, which needs
//    a real weekly SALE sequence for its 3 designated products — that's
//    built separately in applyBusinessScenarios and merged in by main().
// ---------------------------------------------------------------------------

interface TransactionPlan {
  id: string;
  inventoryId: string;
  transactionType: TransactionType;
  quantity: number;
  reference: string;
  notes: string | null;
  createdAt?: Date;
}

function buildInventoryTransactionPlans(
  poPlans: POPlan[],
  inventoryPlans: InventoryPlan[],
): TransactionPlan[] {
  const inventoryByKey = new Map<string, InventoryPlan>();
  for (const inv of inventoryPlans) {
    inventoryByKey.set(`${inv.productId}:${inv.warehouseId}`, inv);
  }

  const transactions: TransactionPlan[] = [];
  for (const po of poPlans) {
    if (po.status !== PurchaseOrderStatus.RECEIVED) continue;
    for (const item of po.items) {
      const inv = inventoryByKey.get(`${item.productId}:${po.warehouseId}`);
      if (!inv) continue;
      transactions.push({
        id: randomUUID(),
        inventoryId: inv.id,
        transactionType: TransactionType.PURCHASE,
        quantity: item.quantity,
        reference: po.poNumber,
        notes: null,
        createdAt: po.actualDeliveryDate ?? undefined,
      });
    }
  }
  return transactions;
}

// ---------------------------------------------------------------------------
// 8. FORECASTS — for the last 12 weeks of history, a 4-week Moving Average
//    and an Exponential Smoothing (alpha=0.3) backtest forecast per product,
//    each compared against real actual demand to compute MAPE. This is the
//    "closely follows history with normal forecasting error" requirement,
//    grounded in the real generated series — not the reusable forecasting
//    engine module itself (a later milestone).
// ---------------------------------------------------------------------------

interface ForecastPlan {
  id: string;
  productId: string;
  method: ForecastMethod;
  periodDate: Date;
  forecastQty: number;
  mape: number | null;
}

const FORECAST_WEEKS = 12;
const MOVING_AVERAGE_WINDOW = 4;
const SMOOTHING_ALPHA = 0.3;

function movingAverage(series: number[], targetIndex: number, window: number): number {
  const start = Math.max(0, targetIndex - window);
  const slice = series.slice(start, targetIndex);
  if (slice.length === 0) return series[targetIndex] ?? 0;
  return slice.reduce((s, v) => s + v, 0) / slice.length;
}

function exponentialSmoothing(series: number[], targetIndex: number, alpha: number): number {
  let level = series[0] ?? 0;
  for (let t = 1; t < targetIndex; t++) {
    level = alpha * series[t] + (1 - alpha) * level;
  }
  return level;
}

function mapeOf(actual: number, forecast: number): number | null {
  if (actual === 0) return null;
  return round((Math.abs(actual - forecast) / actual) * 100, 2);
}

function buildForecastPlans(
  productPlans: ProductPlan[],
  demandByProduct: Map<string, DemandPoint[]>,
): ForecastPlan[] {
  const plans: ForecastPlan[] = [];
  for (const product of productPlans) {
    const series = demandByProduct.get(product.id)!;
    const quantities = series.map((p) => p.quantity);
    const startWeek = HISTORY_WEEKS - FORECAST_WEEKS;
    for (let w = startWeek; w < HISTORY_WEEKS; w++) {
      const actual = quantities[w];
      const periodDate = series[w].weekStart;

      const maForecast = Math.round(movingAverage(quantities, w, MOVING_AVERAGE_WINDOW));
      plans.push({
        id: randomUUID(),
        productId: product.id,
        method: ForecastMethod.MOVING_AVERAGE,
        periodDate,
        forecastQty: maForecast,
        mape: mapeOf(actual, maForecast),
      });

      const esForecast = Math.round(exponentialSmoothing(quantities, w, SMOOTHING_ALPHA));
      plans.push({
        id: randomUUID(),
        productId: product.id,
        method: ForecastMethod.EXPONENTIAL_SMOOTHING,
        periodDate,
        forecastQty: esForecast,
        mape: mapeOf(actual, esForecast),
      });
    }
  }
  return plans;
}

// ---------------------------------------------------------------------------
// 9. AI RECOMMENDATIONS — ~10-12 hand-selected examples, each picked from a
//    real extreme in the generated data (worst stock ratio, lowest-reliability
//    supplier, busiest warehouse, biggest upcoming seasonal jump) with
//    `metricJustification` built from the real numbers. `aiNarrative` is a
//    hand-written illustrative sentence standing in for what Claude would
//    generate — the real recommendation rule engine and AI integration are
//    later milestones (Phase 3 and Phase 5 in DEVELOPMENT_ROADMAP.md).
// ---------------------------------------------------------------------------

interface RecommendationPlan {
  id: string;
  category: RecommendationCategory;
  severity: RecommendationSeverity;
  status: RecommendationStatus;
  metricJustification: string;
  aiNarrative: string;
  productId: string | null;
  supplierId: string | null;
  warehouseId: string | null;
}

function buildRecommendationPlans(ctx: {
  productPlans: ProductPlan[];
  supplierPlans: SupplierPlan[];
  warehousePlans: WarehousePlan[];
  inventoryPlans: InventoryPlan[];
  poPlans: POPlan[];
  demandByProduct: Map<string, DemandPoint[]>;
  trajectoryTransactionPlans: TransactionPlan[];
}): RecommendationPlan[] {
  const {
    productPlans,
    supplierPlans,
    warehousePlans,
    inventoryPlans,
    poPlans,
    demandByProduct,
    trajectoryTransactionPlans,
  } = ctx;
  const productById = new Map(productPlans.map((p) => [p.id, p]));
  const warehouseById = new Map(warehousePlans.map((w) => [w.id, w]));
  const supplierById = new Map(supplierPlans.map((s) => [s.id, s]));

  const recs: RecommendationPlan[] = [];
  const ratio = (inv: InventoryPlan) => inv.onHandQty / Math.max(inv.reorderPoint, 1);
  const sortedByRatioAsc = [...inventoryPlans].sort((a, b) => ratio(a) - ratio(b));
  const sortedByRatioDesc = [...inventoryPlans].sort((a, b) => ratio(b) - ratio(a));

  // 1-2: most critical inventory positions.
  sortedByRatioAsc.slice(0, 2).forEach((inv) => {
    const product = productById.get(inv.productId)!;
    const warehouse = warehouseById.get(inv.warehouseId)!;
    const supplier = supplierById.get(product.primarySupplierId)!;
    recs.push({
      id: randomUUID(),
      category: RecommendationCategory.INVENTORY,
      severity: RecommendationSeverity.CRITICAL,
      status: RecommendationStatus.ACTIVE,
      metricJustification: `On-hand stock (${inv.onHandQty} units) is below the reorder point (${inv.reorderPoint} units, safety stock ${inv.safetyStock}) for ${product.name} at ${warehouse.name}.`,
      aiNarrative: `${product.name} is critically low at ${warehouse.name} and is likely to stock out within days at current demand. Recommend placing an EOQ-sized reorder with ${supplier.name} immediately.`,
      productId: product.id,
      supplierId: supplier.id,
      warehouseId: warehouse.id,
    });
  });

  // 3: a product approaching (but not yet below) its reorder point.
  const nearReorder = inventoryPlans.find((inv) => inv.stockStatus === StockStatus.LOW);
  if (nearReorder) {
    const product = productById.get(nearReorder.productId)!;
    const warehouse = warehouseById.get(nearReorder.warehouseId)!;
    recs.push({
      id: randomUUID(),
      category: RecommendationCategory.INVENTORY,
      severity: RecommendationSeverity.WARNING,
      status: RecommendationStatus.ACTIVE,
      metricJustification: `On-hand stock (${nearReorder.onHandQty} units) is approaching the reorder point (${nearReorder.reorderPoint} units) for ${product.name} at ${warehouse.name}.`,
      aiNarrative: `${product.name} at ${warehouse.name} will cross its reorder point soon. Recommend scheduling a reorder in the next few days.`,
      productId: product.id,
      supplierId: null,
      warehouseId: warehouse.id,
    });
  }

  // 4: the most overstocked position.
  const overstocked = sortedByRatioDesc[0];
  if (overstocked) {
    const product = productById.get(overstocked.productId)!;
    const warehouse = warehouseById.get(overstocked.warehouseId)!;
    recs.push({
      id: randomUUID(),
      category: RecommendationCategory.INVENTORY,
      severity: RecommendationSeverity.INFO,
      status: RecommendationStatus.DISMISSED,
      metricJustification: `On-hand stock (${overstocked.onHandQty} units) is ${round(ratio(overstocked), 1)}x the reorder point (${overstocked.reorderPoint} units) for ${product.name} at ${warehouse.name}, tying up working capital.`,
      aiNarrative: `${product.name} is significantly overstocked at ${warehouse.name}. Consider pausing reorders or transferring stock to a warehouse with tighter supply.`,
      productId: product.id,
      supplierId: null,
      warehouseId: warehouse.id,
    });
  }

  // 5-6: lowest-reliability suppliers.
  const sortedSuppliers = [...supplierPlans].sort(
    (a, b) => a.reliabilityScore - b.reliabilityScore,
  );
  sortedSuppliers.slice(0, 2).forEach((supplier, idx) => {
    recs.push({
      id: randomUUID(),
      category: RecommendationCategory.SUPPLIER,
      severity:
        supplier.reliabilityScore < 70
          ? RecommendationSeverity.CRITICAL
          : RecommendationSeverity.WARNING,
      status: idx === 1 ? RecommendationStatus.ACCEPTED : RecommendationStatus.ACTIVE,
      metricJustification: `${supplier.name} has a reliability score of ${supplier.reliabilityScore}/100, driven by delayed deliveries on recent purchase orders (contracted lead time ${supplier.contractedLeadTimeDays} days).`,
      aiNarrative: `${supplier.name}'s on-time delivery performance has been inconsistent. Recommend reviewing recent delayed purchase orders and evaluating an alternate supplier.`,
      productId: null,
      supplierId: supplier.id,
      warehouseId: null,
    });
  });

  // Business scenario item 1: the supplier with a deliberately declining
  // reliability trend gets its own recommendation, computed from the actual
  // split between its older vs. more recent RECEIVED purchase orders — a
  // real measured trend, not just a restatement of the current score.
  const decliningSupplierPlan = supplierPlans.find((s) => s.decliningReliability);
  if (decliningSupplierPlan) {
    const supplierReceived = poPlans
      .filter(
        (po) =>
          po.supplierId === decliningSupplierPlan.id && po.status === PurchaseOrderStatus.RECEIVED,
      )
      .sort((a, b) => a.orderDate.getTime() - b.orderDate.getTime());
    if (supplierReceived.length >= 4) {
      const mid = Math.floor(supplierReceived.length / 2);
      const olderHalf = supplierReceived.slice(0, mid);
      const recentHalf = supplierReceived.slice(mid);
      const delayRate = (pos: POPlan[]) =>
        Math.round(
          (pos.filter((po) => po.actualDeliveryDate! > po.expectedDeliveryDate).length /
            pos.length) *
            100,
        );
      const olderDelayRate = delayRate(olderHalf);
      const recentDelayRate = delayRate(recentHalf);
      recs.push({
        id: randomUUID(),
        category: RecommendationCategory.SUPPLIER,
        severity: RecommendationSeverity.WARNING,
        status: RecommendationStatus.ACTIVE,
        metricJustification: `${decliningSupplierPlan.name}'s on-time delivery has worsened over time: ${olderDelayRate}% of its earlier orders were late, vs. ${recentDelayRate}% of its most recent orders (current reliability score ${decliningSupplierPlan.reliabilityScore}/100).`,
        aiNarrative: `${decliningSupplierPlan.name} is trending in the wrong direction, not just consistently mediocre — recent orders are late far more often than older ones. Recommend a performance review before renewing terms, and start qualifying a backup supplier for its SKUs.`,
        productId: null,
        supplierId: decliningSupplierPlan.id,
        warehouseId: null,
      });
    }
  }

  // Business scenario item 5: a declining-demand product, with the measured
  // decline computed from the real generated series (first quarter vs. last
  // quarter of the 18-month window) rather than asserted.
  const decliningDemandProduct = productPlans.find((p) => p.demandTrend === "DECLINING");
  if (decliningDemandProduct) {
    const series = demandByProduct.get(decliningDemandProduct.id)!;
    const quarterLength = Math.floor(series.length / 4);
    const firstQuarterAvg =
      series.slice(0, quarterLength).reduce((s, p) => s + p.quantity, 0) / quarterLength;
    const lastQuarterAvg =
      series.slice(-quarterLength).reduce((s, p) => s + p.quantity, 0) / quarterLength;
    const pctChange = round(((lastQuarterAvg - firstQuarterAvg) / firstQuarterAvg) * 100, 0);
    recs.push({
      id: randomUUID(),
      category: RecommendationCategory.DEMAND,
      severity: RecommendationSeverity.INFO,
      status: RecommendationStatus.ACTIVE,
      metricJustification: `${decliningDemandProduct.name} weekly demand has fallen ~${Math.abs(pctChange)}% comparing the first quarter to the most recent quarter of the 18-month history (${Math.round(firstQuarterAvg)} -> ${Math.round(lastQuarterAvg)} units/week).`,
      aiNarrative: `${decliningDemandProduct.name} shows a sustained decline, not seasonal noise. Recommend reducing standing order quantities and reorder point sizing to avoid building excess stock of a shrinking line.`,
      productId: decliningDemandProduct.id,
      supplierId: null,
      warehouseId: null,
    });
  }

  // Business scenario item 10: one Healthy -> Low -> Critical trajectory
  // product, narrated from its actual weekly SALE transaction history.
  const trajectoryProductName = TRAJECTORY_PRODUCTS[0]?.productName;
  const trajectoryProduct = productPlans.find((p) => p.name === trajectoryProductName);
  if (trajectoryProduct) {
    const trajectoryInv = inventoryPlans.find(
      (i) =>
        i.productId === trajectoryProduct.id &&
        i.warehouseId === warehousePlans[TRAJECTORY_PRODUCTS[0].warehouseIndex].id,
    )!;
    const relatedTransactions = trajectoryTransactionPlans
      .filter((t) => t.inventoryId === trajectoryInv.id)
      .sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
    const warehouse = warehouseById.get(trajectoryInv.warehouseId)!;
    if (relatedTransactions.length > 0) {
      const weeksSpan = TRAJECTORY_WEEKS;
      recs.push({
        id: randomUUID(),
        category: RecommendationCategory.INVENTORY,
        severity: RecommendationSeverity.CRITICAL,
        status: RecommendationStatus.ACTIVE,
        metricJustification: `${trajectoryProduct.name} at ${warehouse.name} has declined steadily over the past ${weeksSpan} weeks from a healthy stock level to ${trajectoryInv.onHandQty} units, now below its reorder point (${trajectoryInv.reorderPoint} units) with no replenishment order placed in that window.`,
        aiNarrative: `${trajectoryProduct.name} at ${warehouse.name} moved from Healthy to Critical over ${weeksSpan} weeks of steady depletion — this looks like a missed reorder trigger, not a sudden shock. Recommend placing an order now and reviewing why the automatic reorder point wasn't acted on.`,
        productId: trajectoryProduct.id,
        supplierId: null,
        warehouseId: warehouse.id,
      });
    }
  }

  // 7: an overdue (or soonest-due) in-transit purchase order.
  const overduePO =
    poPlans.find(
      (po) =>
        po.status === PurchaseOrderStatus.IN_TRANSIT &&
        po.expectedDeliveryDate < CURRENT_WEEK_START,
    ) ??
    [...poPlans]
      .filter((po) => po.status === PurchaseOrderStatus.IN_TRANSIT)
      .sort((a, b) => a.expectedDeliveryDate.getTime() - b.expectedDeliveryDate.getTime())[0];
  if (overduePO) {
    const supplier = supplierById.get(overduePO.supplierId)!;
    const warehouse = warehouseById.get(overduePO.warehouseId)!;
    recs.push({
      id: randomUUID(),
      category: RecommendationCategory.PROCUREMENT,
      severity: RecommendationSeverity.WARNING,
      status: RecommendationStatus.ACTIVE,
      metricJustification: `Purchase order ${overduePO.poNumber} to ${supplier.name} for ${warehouse.name} was expected on ${overduePO.expectedDeliveryDate.toDateString()} and is still in transit.`,
      aiNarrative: `This order from ${supplier.name} appears to be running late. Recommend following up with the supplier and checking downstream stock impact at ${warehouse.name}.`,
      productId: null,
      supplierId: supplier.id,
      warehouseId: warehouse.id,
    });
  }

  // 8: the busiest (highest target-utilization) warehouse.
  const busiest = [...warehousePlans].sort((a, b) => b.targetUtilization - a.targetUtilization)[0];
  recs.push({
    id: randomUUID(),
    category: RecommendationCategory.INVENTORY,
    severity: RecommendationSeverity.WARNING,
    status: RecommendationStatus.ACTIVE,
    metricJustification: `${busiest.name} is estimated at ${Math.round(busiest.targetUtilization * 100)}% of its ${busiest.capacityUnits}-unit capacity, the highest utilization among NovaFoods' 4 warehouses.`,
    aiNarrative: `${busiest.name} is nearing capacity. Recommend reviewing incoming purchase orders scheduled for this warehouse and rebalancing stock to warehouses with more headroom.`,
    productId: null,
    supplierId: null,
    warehouseId: busiest.id,
  });

  // 9-10: products with the biggest seasonal demand jump expected in the
  // next 3 months, computed from whatever month the script actually runs
  // in. A 3-month lookahead (rather than just next month) is what actually
  // surfaces the brief's named patterns — e.g. a Diwali chocolate spike is
  // only visible from July if you look ahead to November, not August.
  const currentMonth = CURRENT_WEEK_START.getMonth();
  const LOOKAHEAD_MONTHS = 3;
  const demandIncreaseCandidates = productPlans
    .map((p) => {
      const curMult = SEASONAL_MULTIPLIERS[p.seasonalKey][currentMonth];
      let bestPctChange = -Infinity;
      let bestMonthsAhead = 1;
      for (let ahead = 1; ahead <= LOOKAHEAD_MONTHS; ahead++) {
        const futureMonth = (currentMonth + ahead) % 12;
        const futureMult = SEASONAL_MULTIPLIERS[p.seasonalKey][futureMonth];
        const pctChange = ((futureMult - curMult) / curMult) * 100;
        if (pctChange > bestPctChange) {
          bestPctChange = pctChange;
          bestMonthsAhead = ahead;
        }
      }
      return { product: p, pctChange: bestPctChange, monthsAhead: bestMonthsAhead };
    })
    .filter((s) => s.pctChange > 5)
    .sort((a, b) => b.pctChange - a.pctChange);

  demandIncreaseCandidates.slice(0, 2).forEach(({ product, pctChange, monthsAhead }) => {
    const horizon = monthsAhead === 1 ? "next month" : `over the next ${monthsAhead} months`;
    recs.push({
      id: randomUUID(),
      category: RecommendationCategory.DEMAND,
      severity: RecommendationSeverity.INFO,
      status: RecommendationStatus.ACTIVE,
      metricJustification: `${product.name} demand is projected to rise ~${round(pctChange, 0)}% ${horizon}, based on 18 months of seasonal demand history for this category.`,
      aiNarrative: `Seasonal demand for ${product.name} typically increases heading into this period. Recommend increasing safety stock ahead of the expected rise to avoid stockouts.`,
      productId: product.id,
      supplierId: null,
      warehouseId: null,
    });
  });

  return recs;
}

// ---------------------------------------------------------------------------
// Row mappers (Plan -> Prisma create input)
// ---------------------------------------------------------------------------

function toWarehouseRow(w: WarehousePlan) {
  return { id: w.id, name: w.name, location: w.location, capacityUnits: w.capacityUnits };
}

function toSupplierRow(s: SupplierPlan) {
  return {
    id: s.id,
    name: s.name,
    contactEmail: s.contactEmail,
    contactPhone: s.contactPhone,
    contractedLeadTimeDays: s.contractedLeadTimeDays,
    paymentTerms: s.paymentTerms,
    reliabilityScore: s.reliabilityScore,
  };
}

function toProductRow(p: ProductPlan) {
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    category: p.category,
    unitOfMeasure: p.unitOfMeasure,
    unitCost: p.unitCost,
    unitPrice: p.unitPrice,
    leadTimeDays: p.leadTimeDays,
    perishable: p.perishable,
    primarySupplierId: p.primarySupplierId,
  };
}

function toInventoryRow(inv: InventoryPlan) {
  return {
    id: inv.id,
    productId: inv.productId,
    warehouseId: inv.warehouseId,
    onHandQty: inv.onHandQty,
    safetyStock: inv.safetyStock,
    reorderPoint: inv.reorderPoint,
    stockStatus: inv.stockStatus,
    lastCalculatedAt: inv.lastCalculatedAt,
  };
}

function toDemandRow(productId: string, point: DemandPoint) {
  return { id: randomUUID(), productId, periodDate: point.weekStart, quantitySold: point.quantity };
}

function toPurchaseOrderRow(po: POPlan) {
  return {
    id: po.id,
    status: po.status,
    orderDate: po.orderDate,
    expectedDeliveryDate: po.expectedDeliveryDate,
    actualDeliveryDate: po.actualDeliveryDate,
    supplierId: po.supplierId,
    warehouseId: po.warehouseId,
  };
}

function toPurchaseOrderItemRow(item: POItemPlan) {
  return {
    id: item.id,
    purchaseOrderId: item.purchaseOrderId,
    productId: item.productId,
    quantity: item.quantity,
    unitCost: item.unitCost,
  };
}

function toTransactionRow(t: TransactionPlan) {
  return {
    id: t.id,
    inventoryId: t.inventoryId,
    transactionType: t.transactionType,
    quantity: t.quantity,
    reference: t.reference,
    notes: t.notes,
    createdAt: t.createdAt,
  };
}

function toForecastRow(f: ForecastPlan) {
  return {
    id: f.id,
    productId: f.productId,
    method: f.method,
    periodDate: f.periodDate,
    forecastQty: f.forecastQty,
    mape: f.mape,
  };
}

function toRecommendationRow(r: RecommendationPlan) {
  return {
    id: r.id,
    category: r.category,
    severity: r.severity,
    status: r.status,
    metricJustification: r.metricJustification,
    aiNarrative: r.aiNarrative,
    productId: r.productId,
    supplierId: r.supplierId,
    warehouseId: r.warehouseId,
  };
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

async function assertDatabaseIsEmpty(): Promise<void> {
  const existing = await prisma.warehouse.count();
  if (existing > 0) {
    throw new Error(
      "Database is not empty (Warehouse table has rows already). " +
        "Run `npx prisma migrate reset` to clear all tables before reseeding, " +
        "to avoid duplicate or inconsistent data.",
    );
  }
}

async function main() {
  await assertDatabaseIsEmpty();

  console.log("Building NovaFoods Pvt. Ltd. dataset in memory...");
  const warehousePlans = buildWarehousePlans();
  const supplierPlans = buildSupplierPlans();
  const productPlans = buildProductPlans(supplierPlans);
  const demandByProduct = buildDemandSeries(productPlans);
  const inventoryPlans = buildInventoryPlans(productPlans, demandByProduct, warehousePlans);
  const trajectoryTransactionPlans = applyBusinessScenarios(
    productPlans,
    warehousePlans,
    inventoryPlans,
  );
  calibrateWarehouseCapacities(warehousePlans, inventoryPlans);
  const poPlans = buildPurchaseOrderPlans(productPlans, supplierPlans, warehousePlans);
  const transactionPlans = [
    ...buildInventoryTransactionPlans(poPlans, inventoryPlans),
    ...trajectoryTransactionPlans,
  ];
  const forecastPlans = buildForecastPlans(productPlans, demandByProduct);
  const recommendationPlans = buildRecommendationPlans({
    productPlans,
    supplierPlans,
    warehousePlans,
    inventoryPlans,
    poPlans,
    demandByProduct,
    trajectoryTransactionPlans,
  });

  const demandRows = productPlans.flatMap((p) =>
    demandByProduct.get(p.id)!.map((point) => toDemandRow(p.id, point)),
  );
  const poItemRows = poPlans.flatMap((po) => po.items.map(toPurchaseOrderItemRow));

  console.log("Writing to database...");
  await prisma.warehouse.createMany({ data: warehousePlans.map(toWarehouseRow) });
  await prisma.supplier.createMany({ data: supplierPlans.map(toSupplierRow) });
  await prisma.product.createMany({ data: productPlans.map(toProductRow) });

  for (const batch of chunk(inventoryPlans.map(toInventoryRow), 500)) {
    await prisma.inventory.createMany({ data: batch });
  }
  for (const batch of chunk(demandRows, 500)) {
    await prisma.demandHistory.createMany({ data: batch });
  }
  for (const batch of chunk(poPlans.map(toPurchaseOrderRow), 500)) {
    await prisma.purchaseOrder.createMany({ data: batch });
  }
  for (const batch of chunk(poItemRows, 500)) {
    await prisma.purchaseOrderItem.createMany({ data: batch });
  }
  for (const batch of chunk(transactionPlans.map(toTransactionRow), 500)) {
    await prisma.inventoryTransaction.createMany({ data: batch });
  }
  for (const batch of chunk(forecastPlans.map(toForecastRow), 500)) {
    await prisma.forecast.createMany({ data: batch });
  }
  await prisma.aIRecommendation.createMany({ data: recommendationPlans.map(toRecommendationRow) });

  console.log("Seed complete. Row counts:");
  console.table({
    warehouses: warehousePlans.length,
    suppliers: supplierPlans.length,
    products: productPlans.length,
    inventory: inventoryPlans.length,
    demandHistory: demandRows.length,
    purchaseOrders: poPlans.length,
    purchaseOrderItems: poItemRows.length,
    inventoryTransactions: transactionPlans.length,
    forecasts: forecastPlans.length,
    recommendations: recommendationPlans.length,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
