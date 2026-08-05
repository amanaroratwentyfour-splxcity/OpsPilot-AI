import { ProductCategory, PurchaseOrderStatus } from "@/lib/generated/prisma/enums";

/**
 * Single source of truth for OpsPilot_Template.xlsx — every sheet, every
 * column, and the example rows shown to the user. templateGenerator.ts
 * reads this to build the workbook; structuralValidation.ts,
 * businessValidation.ts, and referentialValidation.ts read the same
 * definitions to check an uploaded workbook against them. Nothing about
 * the template or its validation rules is ever hand-duplicated.
 *
 * Column headers, natural-key choices, and validation rules mirror
 * DATA_IMPORT_ARCHITECTURE.md §2 exactly. Enum values are imported from
 * the generated Prisma enums, never hand-copied, so a dropdown here can
 * never drift out of sync with the schema (see DATA_IMPORT_ARCHITECTURE.md
 * §2.9, "Enum sources are shared, not duplicated").
 */

export type ColumnDataType = "text" | "wholeNumber" | "decimal" | "boolean" | "date" | "enum";

/** A numeric business-rule bound — e.g. { min: 0, exclusive: true } means "must be greater than 0". */
export interface NumericRule {
  min: number;
  exclusive: boolean;
}

/**
 * A cross-sheet natural-key reference: this sheet's `column` must resolve to
 * some row's `targetColumn` value on `targetSheet`. Drives both the
 * Referential Validation pass and (for optional columns) whether a blank
 * value is allowed to skip the check.
 */
export interface ColumnReference {
  column: string;
  targetSheet: string;
  targetColumn: string;
}

export interface WorkbookColumnDefinition {
  /** Exact column header text, written to row 1 of the sheet. */
  header: string;
  required: boolean;
  dataType: ColumnDataType;
  /** Only present when dataType is "enum". */
  enumValues?: readonly string[];
  /** Only present when dataType is "wholeNumber" or "decimal". */
  numericRule?: NumericRule;
  /** Shown in the DataDictionary sheet and used to build the Instructions sheet. */
  description: string;
}

export interface WorkbookSheetDefinition {
  /** Exact worksheet tab name. */
  name: string;
  required: boolean;
  /** One-paragraph summary, shown in the Instructions sheet and as a note on the sheet's header cell. */
  purpose: string;
  columns: WorkbookColumnDefinition[];
  /** Column header(s) whose combination must be unique within this sheet. Empty when the sheet has no natural-key uniqueness rule. */
  naturalKey: readonly string[];
  /** Cross-sheet natural-key references this sheet's rows must resolve against. */
  references: readonly ColumnReference[];
  /** 2–3 illustrative rows, in column order, cross-referencing each other by natural key. */
  exampleRows: ReadonlyArray<ReadonlyArray<string | number>>;
}

const PRODUCT_CATEGORY_VALUES = Object.values(ProductCategory);
const PURCHASE_ORDER_STATUS_VALUES = Object.values(PurchaseOrderStatus);
const BOOLEAN_VALUES = ["TRUE", "FALSE"] as const;

export const WORKBOOK_SHEETS: readonly WorkbookSheetDefinition[] = [
  {
    name: "Products",
    required: true,
    purpose:
      "The SKU catalog. Every other sheet that mentions a product refers back to a row here by SKU.",
    columns: [
      {
        header: "SKU",
        required: true,
        dataType: "text",
        description: "Natural key. Must be unique. Maps to the product's catalog code.",
      },
      { header: "Product Name", required: true, dataType: "text", description: "Display name." },
      {
        header: "Category",
        required: true,
        dataType: "enum",
        enumValues: PRODUCT_CATEGORY_VALUES,
        description: `One of: ${PRODUCT_CATEGORY_VALUES.join(", ")}.`,
      },
      {
        header: "Unit of Measure",
        required: true,
        dataType: "text",
        description: "e.g. ml, g, kg, pc.",
      },
      {
        header: "Unit Cost",
        required: true,
        dataType: "decimal",
        numericRule: { min: 0, exclusive: true },
        description: "What the company pays per unit. Must be greater than 0.",
      },
      {
        header: "Unit Price",
        required: true,
        dataType: "decimal",
        numericRule: { min: 0, exclusive: true },
        description: "What the company sells for per unit. Must be greater than 0.",
      },
      {
        header: "Lead Time Days",
        required: true,
        dataType: "wholeNumber",
        numericRule: { min: 0, exclusive: true },
        description: "Replenishment lead time in days. Must be greater than 0.",
      },
      {
        header: "Perishable",
        required: true,
        dataType: "boolean",
        description: "TRUE or FALSE — whether the product has a short shelf life.",
      },
      {
        header: "Primary Supplier Name",
        required: false,
        dataType: "text",
        description: "Optional. If present, must match a row in the Suppliers sheet.",
      },
    ],
    naturalKey: ["SKU"],
    references: [{ column: "Primary Supplier Name", targetSheet: "Suppliers", targetColumn: "Supplier Name" }],
    exampleRows: [
      ["DAI-0001", "Toned Milk 500ml", "DAIRY", "ml", 15.0, 18.83, 4, "TRUE", "Amrit Agro Foods Pvt. Ltd."],
      [
        "BEV-0010",
        "NovaBrew Instant Coffee 100g",
        "BEVERAGES",
        "g",
        120.0,
        165.0,
        7,
        "FALSE",
        "Malabar Coffee Estates Pvt. Ltd.",
      ],
      ["SNK-0005", "CrispyCo Potato Chips 90g", "SNACKS", "g", 22.0, 30.0, 5, "FALSE", ""],
    ],
  },
  {
    name: "Suppliers",
    required: true,
    purpose:
      "The vendor directory. Products optionally name a primary supplier here; purchase orders always do.",
    columns: [
      {
        header: "Supplier Name",
        required: true,
        dataType: "text",
        description: "Natural key. Must be unique.",
      },
      {
        header: "Contact Email",
        required: false,
        dataType: "text",
        description: "Optional. Should contain an @ if present.",
      },
      { header: "Contact Phone", required: false, dataType: "text", description: "Optional. Free text." },
      {
        header: "Contracted Lead Time Days",
        required: true,
        dataType: "wholeNumber",
        numericRule: { min: 0, exclusive: true },
        description: "Standard lead time this supplier commits to. Must be greater than 0.",
      },
      {
        header: "Payment Terms",
        required: false,
        dataType: "text",
        description: "Optional. Free text, e.g. Net 30.",
      },
    ],
    naturalKey: ["Supplier Name"],
    references: [],
    exampleRows: [
      ["Amrit Agro Foods Pvt. Ltd.", "procurement@amritagrofoods.in", "+91-9800000000", 4, "Net 30"],
      ["Malabar Coffee Estates Pvt. Ltd.", "sales@malabarcoffee.in", "+91-9811122233", 7, "Net 45"],
    ],
  },
  {
    name: "Warehouses",
    required: true,
    purpose:
      "The distribution centers the dataset operates out of. Every other sheet that mentions a warehouse refers back to a row here by name.",
    columns: [
      {
        header: "Warehouse Name",
        required: true,
        dataType: "text",
        description: "Natural key. Must be unique.",
      },
      { header: "Location", required: true, dataType: "text", description: "Free text, e.g. city/country." },
      {
        header: "Capacity Units",
        required: true,
        dataType: "decimal",
        numericRule: { min: 0, exclusive: true },
        description: "Total storage capacity. Must be greater than 0.",
      },
    ],
    naturalKey: ["Warehouse Name"],
    references: [],
    exampleRows: [
      ["Delhi Distribution Center", "Delhi, India", 224447],
      ["Mumbai Distribution Center", "Mumbai, India", 174091],
    ],
  },
  {
    name: "Inventory",
    required: true,
    purpose:
      "Current stock on hand — one row per product per warehouse. Safety stock, reorder point, and stock status are calculated by the Inventory Engine after import and are not collected here.",
    columns: [
      {
        header: "Product SKU",
        required: true,
        dataType: "text",
        description: "Must match a row in the Products sheet.",
      },
      {
        header: "Warehouse Name",
        required: true,
        dataType: "text",
        description: "Must match a row in the Warehouses sheet.",
      },
      {
        header: "On-Hand Quantity",
        required: true,
        dataType: "decimal",
        numericRule: { min: 0, exclusive: false },
        description: "Current physical stock. Must be 0 or greater.",
      },
    ],
    naturalKey: ["Product SKU", "Warehouse Name"],
    references: [
      { column: "Product SKU", targetSheet: "Products", targetColumn: "SKU" },
      { column: "Warehouse Name", targetSheet: "Warehouses", targetColumn: "Warehouse Name" },
    ],
    exampleRows: [
      ["DAI-0001", "Delhi Distribution Center", 850],
      ["DAI-0001", "Mumbai Distribution Center", 410],
      ["BEV-0010", "Mumbai Distribution Center", 220],
    ],
  },
  {
    name: "DemandHistory",
    required: true,
    purpose:
      "Historical weekly sales — the ground truth the Forecast Engine trains against and the Inventory Engine's safety stock formula uses.",
    columns: [
      {
        header: "Product SKU",
        required: true,
        dataType: "text",
        description: "Must match a row in the Products sheet.",
      },
      {
        header: "Period Date",
        required: true,
        dataType: "date",
        description: "Start of the week this row covers.",
      },
      {
        header: "Quantity Sold",
        required: true,
        dataType: "decimal",
        numericRule: { min: 0, exclusive: false },
        description: "Units sold in that period. Must be 0 or greater.",
      },
    ],
    naturalKey: ["Product SKU", "Period Date"],
    references: [{ column: "Product SKU", targetSheet: "Products", targetColumn: "SKU" }],
    exampleRows: [
      ["DAI-0001", "2026-06-01", 610],
      ["DAI-0001", "2026-06-08", 585],
      ["BEV-0010", "2026-06-01", 140],
    ],
  },
  {
    name: "PurchaseOrders",
    required: false,
    purpose:
      "Order history — the input to supplier reliability scoring and purchase order tracking. Optional: a new operation may have no order history yet.",
    columns: [
      {
        header: "PO Reference",
        required: true,
        dataType: "text",
        description: "Natural key. Must be unique within this sheet — used only to link to PurchaseOrderItems.",
      },
      {
        header: "Supplier Name",
        required: true,
        dataType: "text",
        description: "Must match a row in the Suppliers sheet.",
      },
      {
        header: "Warehouse Name",
        required: true,
        dataType: "text",
        description: "Must match a row in the Warehouses sheet.",
      },
      {
        header: "Status",
        required: true,
        dataType: "enum",
        enumValues: PURCHASE_ORDER_STATUS_VALUES,
        description: `One of: ${PURCHASE_ORDER_STATUS_VALUES.join(", ")}.`,
      },
      { header: "Order Date", required: true, dataType: "date", description: "When the order was placed." },
      {
        header: "Expected Delivery Date",
        required: false,
        dataType: "date",
        description: "Optional.",
      },
      {
        header: "Actual Delivery Date",
        required: false,
        dataType: "date",
        description: "Required if Status is RECEIVED.",
      },
    ],
    naturalKey: ["PO Reference"],
    references: [
      { column: "Supplier Name", targetSheet: "Suppliers", targetColumn: "Supplier Name" },
      { column: "Warehouse Name", targetSheet: "Warehouses", targetColumn: "Warehouse Name" },
    ],
    exampleRows: [
      [
        "PO-1001",
        "Amrit Agro Foods Pvt. Ltd.",
        "Delhi Distribution Center",
        "RECEIVED",
        "2026-05-20",
        "2026-05-24",
        "2026-05-23",
      ],
      [
        "PO-1002",
        "Malabar Coffee Estates Pvt. Ltd.",
        "Mumbai Distribution Center",
        "IN_TRANSIT",
        "2026-06-10",
        "2026-06-17",
        "",
      ],
    ],
  },
  {
    name: "PurchaseOrderItems",
    required: false,
    purpose:
      "Line items within each purchase order — one row per product ordered on a PO. Required only if the PurchaseOrders sheet has rows.",
    columns: [
      {
        header: "PO Reference",
        required: true,
        dataType: "text",
        description: "Must match a row in the PurchaseOrders sheet.",
      },
      {
        header: "Product SKU",
        required: true,
        dataType: "text",
        description: "Must match a row in the Products sheet.",
      },
      {
        header: "Quantity",
        required: true,
        dataType: "decimal",
        numericRule: { min: 0, exclusive: true },
        description: "Units ordered. Must be greater than 0.",
      },
      {
        header: "Unit Cost",
        required: true,
        dataType: "decimal",
        numericRule: { min: 0, exclusive: true },
        description: "Cost per unit at the time of order. Must be greater than 0.",
      },
    ],
    naturalKey: [],
    references: [
      { column: "PO Reference", targetSheet: "PurchaseOrders", targetColumn: "PO Reference" },
      { column: "Product SKU", targetSheet: "Products", targetColumn: "SKU" },
    ],
    exampleRows: [
      ["PO-1001", "DAI-0001", 2000, 14.5],
      ["PO-1002", "BEV-0010", 500, 118.0],
    ],
  },
];

export { PRODUCT_CATEGORY_VALUES, PURCHASE_ORDER_STATUS_VALUES, BOOLEAN_VALUES };

/** Human-readable label for a column's data type — shared by the DataDictionary sheet and structural validation error messages. */
export function dataTypeLabel(dataType: ColumnDataType, enumValues?: readonly string[]): string {
  switch (dataType) {
    case "enum":
      return `Enum (${(enumValues ?? []).join(" / ")})`;
    case "wholeNumber":
      return "Whole number";
    case "decimal":
      return "Number";
    case "boolean":
      return "Boolean (TRUE/FALSE)";
    case "date":
      return "Date";
    case "text":
      return "Text";
  }
}
