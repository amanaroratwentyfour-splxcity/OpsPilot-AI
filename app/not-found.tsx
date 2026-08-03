import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <SearchX className="h-10 w-10 text-muted-foreground" />
      <h2 className="text-lg font-semibold">Not found</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        The item you&apos;re looking for doesn&apos;t exist, or may have been removed.
      </p>
      <Button asChild variant="outline" className="mt-2">
        <Link href="/">Back to Dashboard</Link>
      </Button>
    </div>
  );
}
