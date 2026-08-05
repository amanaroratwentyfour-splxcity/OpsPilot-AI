import { FileSpreadsheet, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DownloadTemplateButton } from "@/components/import-center/download-template-button";
import { UploadPanel } from "@/components/import-center/upload-panel";

export default function ImportCenterPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Center"
        description="Upload your company's operational data in our Excel template, and OpsPilot AI automatically validates it, imports it, recalculates every operations engine, and generates fresh analytics and AI recommendations."
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <CardTitle>Download Template</CardTitle>
          </div>
          <CardDescription>
            OpsPilot_Template.xlsx contains one worksheet per data type (Products, Suppliers, Warehouses,
            Inventory, Demand History, and Purchase Orders), plus an Instructions sheet and a Data Dictionary
            sheet describing every column. Fill it in with your own company&apos;s data, following the rules on
            the Instructions sheet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DownloadTemplateButton />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle>Upload &amp; Validate</CardTitle>
          </div>
          <CardDescription>
            Upload a filled-in workbook to check it for structural, business-rule, and cross-sheet
            relationship problems. Every issue is reported with its exact sheet, row, and column. Nothing is
            written to the database at this stage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UploadPanel />
        </CardContent>
      </Card>
    </div>
  );
}
