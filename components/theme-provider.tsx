"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Thin wrapper so app/layout.tsx (a Server Component) can render a client
 * provider without itself needing "use client". next-themes owns the
 * anti-flash mechanism: it injects a small blocking script before
 * hydration that reads localStorage (falling back to the OS preference
 * via `prefers-color-scheme` when nothing is stored yet) and applies the
 * `dark` class to <html> before first paint — the same class Tailwind's
 * `darkMode: ["class"]` and every token in globals.css already key off,
 * so no component needs theme-aware logic of its own.
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
