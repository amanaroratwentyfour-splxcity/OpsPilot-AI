"use client";

import { usePathname } from "next/navigation";

/**
 * DESIGN_SPECIFICATION.md §11.2 — a subtle, short opacity fade on route
 * change, nothing else (no slide/scale/parallax). Keying the wrapper by
 * pathname is what restarts the fade on every navigation; it adds no
 * fetching or state of its own, and the global prefers-reduced-motion
 * override in globals.css collapses this to an instant swap for users
 * who've asked the OS for it.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-in fade-in duration-200">
      {children}
    </div>
  );
}
