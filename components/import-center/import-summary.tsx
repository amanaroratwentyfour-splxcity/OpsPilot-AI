import Link from "next/link";
import { CheckCircle2, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImportedCounts {
  products: number;
  suppliers: number;
  warehouses: number;
  inventory: number;
  demandHistory: number;
  purchaseOrders: number;
  purchaseOrderItems: number;
}

interface ImportSummaryProps {
  imported: ImportedCounts;
  recalculated: boolean;
  durationMs: number;
}

const ROWS: { key: keyof ImportedCounts; label: string }[] = [
  { key: "products", label: "Products" },
  { key: "suppliers", label: "Suppliers" },
  { key: "warehouses", label: "Warehouses" },
  { key: "inventory", label: "Inventory Positions" },
  { key: "demandHistory", label: "Demand History Rows" },
  { key: "purchaseOrders", label: "Purchase Orders" },
  { key: "purchaseOrderItems", label: "Purchase Order Items" },
];

/** Shown after a successful POST /api/import-center/import — the dataset has already been replaced and recalculated. */
export function ImportSummary({ imported, recalculated, durationMs }: ImportSummaryProps) {
  return (
    <div className="space-y-4 rounded-md border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950">
      <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        <span className="font-medium">Dataset imported successfully in {(durationMs / 1000).toFixed(1)}s</span>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
        {ROWS.map(({ key, label }) => (
          <div key={key}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-base font-semibold">{imported[key].toLocaleString()}</dd>
          </div>
        ))}
      </dl>

      {!recalculated && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          The import succeeded, but recalculating KPIs and recommendations failed. Use &ldquo;Recalculate
          All&rdquo; from any dashboard page to retry.
        </p>
      )}

      <Button asChild>
        <Link href="/">
          <LayoutDashboard className="mr-2 h-4 w-4" />
          View Dashboard
        </Link>
      </Button>
    </div>
  );
}
