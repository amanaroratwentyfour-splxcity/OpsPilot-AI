"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  TrendingUp,
  BarChart3,
  Sparkles,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Executive Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory Intelligence", icon: Package },
  { href: "/procurement", label: "Procurement", icon: ShoppingCart },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
  { href: "/forecasting", label: "Demand Forecasting", icon: TrendingUp },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/copilot", label: "Operations Copilot", icon: Sparkles },
  { href: "/import-center", label: "Import Center", icon: FileSpreadsheet },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-muted/30 md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Sparkles className="h-5 w-5 text-primary" />
        <span className="font-semibold tracking-tight">OpsPilot AI</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4 text-xs text-muted-foreground">
        NovaFoods Pvt. Ltd.
        <br />
        Operations Decision Hub
      </div>
    </aside>
  );
}
