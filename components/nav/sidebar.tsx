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

export const NAV_ITEMS = [
  { href: "/", label: "Executive Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory Intelligence", icon: Package },
  { href: "/procurement", label: "Procurement", icon: ShoppingCart },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
  { href: "/forecasting", label: "Demand Forecasting", icon: TrendingUp },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/copilot", label: "Operations Copilot", icon: Sparkles },
  { href: "/import-center", label: "Import Center", icon: FileSpreadsheet },
];

/** Shared nav link list — used by both the desktop Sidebar and the mobile Sheet drawer (MobileNav) so the two stay in sync. */
export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
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
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-surface md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Sparkles className="h-5 w-5 text-primary" />
        <span className="text-app-title tracking-tight">OpsPilot AI</span>
      </div>
      <NavLinks />
      <div className="border-t p-4 text-caption text-muted-foreground">
        OpsPilot AI
        <br />
        Operations Decision Hub
      </div>
    </aside>
  );
}
