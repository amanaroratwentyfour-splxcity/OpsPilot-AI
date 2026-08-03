"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Status = "idle" | "running" | "done" | "error";

export function RecalculateButton() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setStatus("running");
    setMessage(null);
    try {
      const response = await fetch("/api/recalculate", { method: "POST" });
      if (!response.ok) {
        throw new Error(`Recalculation failed (${response.status})`);
      }
      const result = await response.json();
      setStatus("done");
      setMessage(
        `Updated ${result.inventory?.productsProcessed ?? 0} products, ${result.recommendations?.candidatesGenerated ?? 0} recommendations`,
      );
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Recalculation failed");
    } finally {
      setTimeout(() => setStatus("idle"), 4000);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {message && (
        <span
          className={cn(
            "hidden items-center gap-1.5 text-xs sm:flex",
            status === "error" ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {status === "error" ? (
            <AlertCircle className="h-3.5 w-3.5" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          {message}
        </span>
      )}
      <Button size="sm" variant="outline" onClick={handleClick} disabled={status === "running"}>
        <RefreshCw className={cn("mr-2 h-3.5 w-3.5", status === "running" && "animate-spin")} />
        {status === "running" ? "Recalculating…" : "Recalculate All"}
      </Button>
    </div>
  );
}
