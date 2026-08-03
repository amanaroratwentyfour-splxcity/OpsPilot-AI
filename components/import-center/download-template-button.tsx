"use client";

import { useState } from "react";
import { Download, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Status = "idle" | "running" | "done" | "error";

const TEMPLATE_FILE_NAME = "OpsPilot_Template.xlsx";

export function DownloadTemplateButton() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setStatus("running");
    setMessage(null);
    try {
      const response = await fetch("/api/import-center/template");
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? `Template download failed (${response.status})`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = TEMPLATE_FILE_NAME;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setStatus("done");
      setMessage(`${TEMPLATE_FILE_NAME} downloaded`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Template download failed");
    } finally {
      setTimeout(() => setStatus("idle"), 4000);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={handleClick} disabled={status === "running"}>
        <Download className="mr-2 h-4 w-4" />
        {status === "running" ? "Preparing template…" : "Download Excel Template"}
      </Button>
      {message && (
        <span
          className={cn(
            "flex items-center gap-1.5 text-xs",
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
    </div>
  );
}
