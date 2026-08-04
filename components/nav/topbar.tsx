import { RecalculateButton } from "./recalculate-button";
import { MobileNav } from "./mobile-nav";

export function Topbar() {
  return (
    <header className="flex h-16 items-center justify-between gap-3 border-b bg-background px-6">
      <div className="flex items-center gap-3">
        <MobileNav />
        <div>
          <h1 className="text-sm font-semibold">Operations Decision Hub</h1>
          <p className="text-xs text-muted-foreground">AI-grounded recommendations for NovaFoods FMCG operations</p>
        </div>
      </div>
      <RecalculateButton />
    </header>
  );
}
