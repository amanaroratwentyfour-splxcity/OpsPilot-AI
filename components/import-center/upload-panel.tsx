"use client";

import { type ChangeEvent, useState } from "react";
import { AlertCircle, AlertTriangle, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ValidationReportTable } from "./validation-report-table";
import { ImportSummary } from "./import-summary";
import type { ValidationReport } from "@/lib/import/validationReport";

interface ValidateResponse {
  fileName: string;
  report: ValidationReport;
}

interface ImportResponse {
  imported: {
    products: number;
    suppliers: number;
    warehouses: number;
    inventory: number;
    demandHistory: number;
    purchaseOrders: number;
    purchaseOrderItems: number;
  };
  recalculated: boolean;
  durationMs: number;
}

type Phase = "idle" | "validating" | "validated" | "importing" | "imported" | "error";

/**
 * Upload → Read → Validate → Import → Recalculate, per
 * DATA_IMPORT_ARCHITECTURE.md §1 and the approved Milestone 3.4 flow. The
 * uploaded File is kept in state after a successful validation so "Import
 * Data" can resend the exact same file to /api/import-center/import
 * without asking the user to re-select it — there is no server-side
 * staging (deliberately simple, see the milestone's own scope notes).
 */
export function UploadPanel() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ValidateResponse | null>(null);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;

    setPhase("validating");
    setErrorMessage(null);
    setValidation(null);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selected);
      const response = await fetch("/api/import-center/validate", { method: "POST", body: formData });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error ?? `Validation failed (${response.status})`);
      }

      setFile(selected);
      setValidation(body as ValidateResponse);
      setPhase("validated");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Validation failed");
      setPhase("error");
    }
  }

  function handleImportClick() {
    if (!file) return;
    setConfirmOpen(true);
  }

  async function handleConfirmedImport() {
    if (!file) return;
    setConfirmOpen(false);
    setPhase("importing");
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/import-center/import", { method: "POST", body: formData });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error ?? `Import failed (${response.status})`);
      }

      setImportResult(body as ImportResponse);
      setPhase("imported");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Import failed");
      setPhase("error");
    }
  }

  const busy = phase === "validating" || phase === "importing";

  return (
    <div className="space-y-4">
      {phase !== "imported" && (
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild disabled={busy}>
            <label className="cursor-pointer">
              {phase === "validating" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {phase === "validating" ? "Validating…" : "Upload Workbook"}
              <input
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={handleFileSelected}
                disabled={busy}
              />
            </label>
          </Button>
          {file && <span className="text-xs text-muted-foreground">{file.name}</span>}
        </div>
      )}

      {phase === "error" && errorMessage && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      {validation && phase !== "imported" && (
        <div className="space-y-3">
          <ValidationReportTable report={validation.report} />
          {!validation.report.blocked && (
            <Button onClick={handleImportClick} disabled={busy}>
              {phase === "importing" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {phase === "importing" ? "Importing…" : "Import Data"}
            </Button>
          )}
        </div>
      )}

      {phase === "imported" && importResult && <ImportSummary {...importResult} />}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Replace the current dataset?
            </DialogTitle>
            <DialogDescription>
              Importing {file?.name} will permanently replace every product, supplier, warehouse, inventory
              position, demand history row, and purchase order currently in the database, then recalculate all
              KPIs and recommendations. <strong className="text-foreground">This cannot be undone.</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmedImport}>
              Replace dataset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
