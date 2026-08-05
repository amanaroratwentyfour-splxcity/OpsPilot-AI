"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

/**
 * Full-screen splash shown only for the app's initial client mount —
 * RootLayout doesn't remount on client-side navigation, so this never
 * reappears when moving between pages. Never gates readiness: the page
 * behind it is already server-rendered and interactive, this is a purely
 * cosmetic overlay that starts fading the instant the client mounts, no
 * artificial delay. The fade itself reuses the same tailwindcss-animate
 * utility (`animate-out fade-out`) as components/nav/page-transition.tsx,
 * so it collapses to an instant swap under prefers-reduced-motion via the
 * existing global override in globals.css — no separate handling needed.
 */
export function SplashScreen() {
  const [phase, setPhase] = useState<"visible" | "hiding" | "hidden">("visible");

  useEffect(() => {
    setPhase("hiding");
    const timeout = setTimeout(() => setPhase("hidden"), 300);
    return () => clearTimeout(timeout);
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-background ${
        phase === "hiding" ? "animate-out fade-out duration-300" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-7 w-7 text-primary" />
        <span className="text-app-title tracking-tight">OpsPilot AI</span>
      </div>
      <p className="text-sm text-muted-foreground">AI-Powered Operations Intelligence Platform</p>
      <p className="text-caption text-muted-foreground">Loading Operations Intelligence...</p>
    </div>
  );
}
