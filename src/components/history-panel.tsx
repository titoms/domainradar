"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, Trash2, Eye, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import type { SavedAnalysis } from "@/lib/types";

interface HistoryPanelProps {
  analyses: SavedAnalysis[];
  onLoad: (analysis: SavedAnalysis) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HistoryPanel({ analyses, onLoad, onDelete, onClear }: HistoryPanelProps) {
  if (analyses.length === 0) return null;

  return (
    <Card className="bg-zinc-900/50 border-zinc-800/60 shadow-xl shadow-black/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <History className="h-4 w-4 text-indigo-400" />
            Previous Analyses ({analyses.length})
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-7 text-xs text-zinc-500 hover:text-red-400"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
          {analyses.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-zinc-800/40 border border-zinc-800/60 hover:border-zinc-700/60 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-zinc-300 truncate">
                    {formatDate(a.timestamp)}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[9px] font-normal border-zinc-700 text-zinc-500"
                  >
                    {a.mode === "rdap" ? "RDAP" : "NC+RDAP"}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="text-zinc-500">{a.totalChecked} domains</span>
                  <span className="flex items-center gap-0.5 text-emerald-400">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    {a.available}
                  </span>
                  <span className="flex items-center gap-0.5 text-red-400">
                    <XCircle className="h-2.5 w-2.5" />
                    {a.registered}
                  </span>
                  <span className="flex items-center gap-0.5 text-amber-400">
                    <HelpCircle className="h-2.5 w-2.5" />
                    {a.unknown}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onLoad(a)}
                  className="h-6 px-2 text-[10px] text-zinc-400 hover:text-blue-300"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Load
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(a.id)}
                  className="h-6 w-6 p-0 text-zinc-600 hover:text-red-400"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
