"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Activity, Square, AlertTriangle } from "lucide-react";
import type { BatchProgress } from "@/lib/types";

interface ProgressPanelProps {
  progress: BatchProgress | null;
  errors: string[];
  isRunning: boolean;
  onCancel: () => void;
}

export function ProgressPanel({
  progress,
  errors,
  isRunning,
  onCancel,
}: ProgressPanelProps) {
  if (!progress && !isRunning) return null;

  const pct = progress
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <Card className="bg-zinc-900/50 border-zinc-800/60 shadow-xl shadow-black/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Activity className={`h-4 w-4 ${isRunning ? "text-blue-400 animate-pulse glow-blue" : "text-zinc-500"}`} />
            Progress
          </CardTitle>
          {isRunning && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="h-7 text-xs border-red-900/50 text-red-400 hover:bg-red-950/30 hover:text-red-300"
            >
              <Square className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={pct} className="h-2" />

        {progress && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-zinc-800/50 rounded-md px-2.5 py-1.5">
              <span className="text-zinc-500">Total</span>
              <p className="font-medium text-zinc-200">{progress.total}</p>
            </div>
            <div className="bg-zinc-800/50 rounded-md px-2.5 py-1.5">
              <span className="text-zinc-500">Completed</span>
              <p className="font-medium text-emerald-400">{progress.completed}</p>
            </div>
            <div className="bg-zinc-800/50 rounded-md px-2.5 py-1.5">
              <span className="text-zinc-500">Remaining</span>
              <p className="font-medium text-blue-400">{progress.remaining}</p>
            </div>
            <div className="bg-zinc-800/50 rounded-md px-2.5 py-1.5">
              <span className="text-zinc-500">Batch</span>
              <p className="font-medium text-zinc-200">
                {progress.currentBatch}/{progress.totalBatches}
              </p>
            </div>
            <div className="bg-zinc-800/50 rounded-md px-2.5 py-1.5">
              <span className="text-zinc-500">Successful</span>
              <p className="font-medium text-emerald-400">{progress.successful}</p>
            </div>
            <div className="bg-zinc-800/50 rounded-md px-2.5 py-1.5">
              <span className="text-zinc-500">Failed</span>
              <p className="font-medium text-red-400">{progress.failed}</p>
            </div>
            <div className="bg-zinc-800/50 rounded-md px-2.5 py-1.5">
              <span className="text-zinc-500">Retries</span>
              <p className="font-medium text-amber-400">{progress.retries}</p>
            </div>
            <div className="bg-zinc-800/50 rounded-md px-2.5 py-1.5">
              <span className="text-zinc-500">Mode</span>
              <p className="font-medium text-purple-400">
                {progress.mode === "rdap" ? "RDAP" : "NC+RDAP"}
              </p>
            </div>
          </div>
        )}

        {errors.length > 0 && (
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {errors.slice(-5).map((err, i) => (
              <div
                key={i}
                className="flex items-start gap-1.5 text-[11px] text-amber-400/80"
              >
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
