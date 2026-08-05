"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Compact icon-only toggle placed in the topbar next to Recalculate All
 * (Phase 4.3). Both icons stay in the DOM and crossfade purely via
 * Tailwind's `dark:` variant on the `dark` class next-themes already
 * applies to <html> — so the icon is correct on the very first paint with
 * no client-only mount guard needed, and `useTheme()` is only touched
 * inside the click handler (always safe post-mount) rather than at
 * render time.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      className="relative shrink-0"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-4 w-4 scale-100 rotate-0 transition-transform duration-300 dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute h-4 w-4 scale-0 rotate-90 transition-transform duration-300 dark:scale-100 dark:rotate-0" />
    </Button>
  );
}
