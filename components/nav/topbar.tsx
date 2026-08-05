import { RecalculateButton } from "./recalculate-button";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";

export function Topbar() {
  return (
    <header className="flex h-16 items-center justify-between gap-2 border-b bg-surface px-4 sm:gap-3 sm:px-6">
      <div className="flex items-center gap-3">
        <MobileNav />
        <div>
          <h1 className="text-sm font-semibold text-surface-foreground">Operations Decision Hub</h1>
          <p className="text-caption text-muted-foreground">AI-grounded recommendations for your operations</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <RecalculateButton />
        <ThemeToggle />
      </div>
    </header>
  );
}
