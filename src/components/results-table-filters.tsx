import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";

export type StatusFilter = "" | "available" | "registered" | "unknown";

interface ResultsTableFiltersProps {
  search: string;
  onSearchChange: (search: string) => void;
  statusFilter: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  premiumFilter: boolean;
  onPremiumChange: (premium: boolean) => void;
  tldFilter: string;
  onTldChange: (tld: string) => void;
  tlds: string[];
}

export function ResultsTableFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  premiumFilter,
  onPremiumChange,
  tldFilter,
  onTldChange,
  tlds,
}: ResultsTableFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input
          placeholder="Search domain or base name..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 pl-9 text-sm bg-zinc-950 border-zinc-700/50"
        />
      </div>
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
        className="h-9 rounded-md border border-zinc-700/50 bg-zinc-950 px-3 text-xs text-zinc-300 focus:ring-1 focus:ring-blue-500/50"
      >
        <option value="">All Statuses</option>
        <option value="available">✅ Available</option>
        <option value="registered">🔴 Registered</option>
        <option value="unknown">⚠️ Unknown / Failed</option>
      </select>
      <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-700/50 px-3 h-9 rounded-md">
        <Checkbox
          id="filter-p-res"
          checked={premiumFilter}
          onCheckedChange={(c) => onPremiumChange(c === true)}
        />
        <label htmlFor="filter-p-res" className="text-xs text-zinc-400 cursor-pointer">
          Premium only
        </label>
      </div>
      <select
        value={tldFilter}
        onChange={(e) => onTldChange(e.target.value)}
        className="h-9 rounded-md border border-zinc-700/50 bg-zinc-950 px-3 text-xs text-zinc-300"
      >
        <option value="">All TLDs</option>
        {tlds.map((tld) => (
          <option key={tld} value={tld}>
            .{tld}
          </option>
        ))}
      </select>
    </div>
  );
}
