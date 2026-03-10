import { FileJson, Tags } from "lucide-react";

interface JsonInputTabsProps {
  tab: "json" | "builder";
  onTabChange: (tab: "json" | "builder") => void;
  disabled?: boolean;
}

export function JsonInputTabs({ tab, onTabChange, disabled }: JsonInputTabsProps) {
  return (
    <div className="flex items-center rounded-md bg-zinc-800/80 p-0.5 border border-zinc-700/40">
      <button
        onClick={() => onTabChange("json")}
        disabled={disabled}
        className={`text-[11px] px-2.5 py-1 rounded transition-all ${
          tab === "json"
            ? "bg-zinc-700 text-zinc-200 shadow-sm"
            : "text-zinc-500 hover:text-zinc-300"
        } disabled:opacity-50 flex items-center gap-1`}
      >
        <FileJson className="h-3 w-3" />
        JSON
      </button>
      <button
        onClick={() => onTabChange("builder")}
        disabled={disabled}
        className={`text-[11px] px-2.5 py-1 rounded transition-all ${
          tab === "builder"
            ? "bg-zinc-700 text-zinc-200 shadow-sm"
            : "text-zinc-500 hover:text-zinc-300"
        } disabled:opacity-50 flex items-center gap-1`}
      >
        <Tags className="h-3 w-3" />
        Builder
      </button>
    </div>
  );
}
