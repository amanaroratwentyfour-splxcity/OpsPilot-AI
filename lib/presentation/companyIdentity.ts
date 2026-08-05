/**
 * Derives a display name for the currently-loaded company from warehouse
 * names — the only per-import data available for this, since the schema
 * deliberately has no Company/tenant table (SYSTEM_ARCHITECTURE.md §1,
 * "single company, no tenancy layer"). Adding one is out of scope for a
 * presentation-only phase, so this stays zero-schema-change and
 * automatically reflects whatever was most recently imported: every
 * import replaces every Warehouse row (DATA_IMPORT_ARCHITECTURE.md), so
 * this recomputes fresh on every page load from live data, never a cached
 * or stored value.
 *
 * Heuristic: the seeded NovaFoods dataset names every warehouse
 * "NovaFoods {City} Distribution Center" — i.e. a shared leading word (or
 * words) followed by a location-specific suffix. This finds the longest
 * common leading sequence of whole words across every warehouse name and
 * uses it as the company name; if no common leading word exists (a
 * dataset that doesn't follow this convention), it falls back to a
 * neutral, honest label rather than guessing.
 */
export function deriveCompanyName(warehouseNames: string[]): string {
  const FALLBACK = "Imported Company";

  const nonEmpty = warehouseNames.map((n) => n.trim()).filter((n) => n.length > 0);
  if (nonEmpty.length === 0) return FALLBACK;

  const wordLists = nonEmpty.map((name) => name.split(/\s+/));
  const shortest = Math.min(...wordLists.map((words) => words.length));

  const commonWords: string[] = [];
  for (let i = 0; i < shortest; i++) {
    const word = wordLists[0][i];
    if (wordLists.every((words) => words[i] === word)) {
      commonWords.push(word);
    } else {
      break;
    }
  }

  // A common prefix that's every warehouse's *entire* name isn't a company
  // name, it's just "all warehouses happen to be named identically" (e.g.
  // a dataset with one warehouse) — only trust a prefix strictly shorter
  // than at least one full name.
  if (commonWords.length === 0 || wordLists.some((words) => words.length === commonWords.length)) {
    return FALLBACK;
  }

  return commonWords.join(" ");
}
