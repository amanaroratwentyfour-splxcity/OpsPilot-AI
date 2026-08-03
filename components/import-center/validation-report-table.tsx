import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SeverityBadge } from "@/components/badges";
import type { ValidationReport } from "@/lib/import/validationReport";

/**
 * Renders a Validation Report (DATA_IMPORT_ARCHITECTURE.md §3.4): grouped
 * by sheet, ERROR before WARNING, then by row — the order buildValidationReport
 * already sorts issues into, so this component just renders them as given.
 */
export function ValidationReportTable({ report }: { report: ValidationReport }) {
  if (report.issues.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        No issues found. This workbook is ready to import.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        {report.errorCount > 0 && (
          <span className="flex items-center gap-1.5 font-medium text-destructive">
            <AlertCircle className="h-4 w-4" />
            {report.errorCount} error{report.errorCount === 1 ? "" : "s"}
          </span>
        )}
        {report.warningCount > 0 && (
          <span className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            {report.warningCount} warning{report.warningCount === 1 ? "" : "s"}
          </span>
        )}
        <span className="text-muted-foreground">
          {report.blocked
            ? "This workbook cannot be imported until every error above is fixed."
            : "No blocking errors — this workbook is ready to import."}
        </span>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Severity</TableHead>
              <TableHead>Sheet</TableHead>
              <TableHead className="w-16">Row</TableHead>
              <TableHead>Column</TableHead>
              <TableHead>Message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.issues.map((issue, index) => (
              <TableRow key={index}>
                <TableCell>
                  <SeverityBadge severity={issue.severity} />
                </TableCell>
                <TableCell className="font-medium">{issue.sheet}</TableCell>
                <TableCell className="text-muted-foreground">{issue.row ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{issue.column ?? "—"}</TableCell>
                <TableCell>{issue.message}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
