import { ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ExecutiveBrief({ lines }: { lines: string[] }) {
  return (
    <Card className="border-primary/20 bg-primary/[0.03]">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
        <ClipboardList className="h-4 w-4 text-primary" />
        <CardTitle>Executive Brief</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5 text-sm text-foreground">
          {lines.map((line, index) => (
            <li key={index} className="flex gap-2">
              <span className="text-primary">•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Deterministic summary generated from current engine outputs.
        </p>
      </CardContent>
    </Card>
  );
}
