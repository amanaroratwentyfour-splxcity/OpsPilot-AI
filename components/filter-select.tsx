"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** A <select> bound to a URL search param — changing it re-navigates the
 *  page with the param set/cleared, letting the Server Component refetch
 *  filtered data with no client-side data layer of its own. */
export interface FilterOption {
  value: string;
  label: string;
}

export function FilterSelect({
  paramKey,
  label,
  options,
  allLabel = "All",
}: {
  paramKey: string;
  label: string;
  options: readonly (string | FilterOption)[];
  allLabel?: string;
}) {
  const normalized: FilterOption[] = options.map((o) =>
    typeof o === "string" ? { value: o, label: o.replace("_", " ") } : o,
  );
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get(paramKey) ?? "__all__";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "__all__") {
      params.delete(paramKey);
    } else {
      params.set(paramKey, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={current} onValueChange={handleChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">{allLabel}</SelectItem>
        {normalized.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
