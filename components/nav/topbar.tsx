import { RecalculateButton } from "./recalculate-button";

export function Topbar() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div>
        <h1 className="text-sm font-semibold">Operations Decision Hub</h1>
        <p className="text-xs text-muted-foreground">AI-grounded recommendations for NovaFoods FMCG operations</p>
      </div>
      <RecalculateButton />
    </header>
  );
}
