"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings2, Info } from "lucide-react";
import type { CheckOptions } from "@/lib/types";

interface OptionsPanelProps {
  options: CheckOptions;
  onOptionsChange: (options: CheckOptions) => void;
  disabled?: boolean;
}

export function OptionsPanel({
  options,
  onOptionsChange,
  disabled,
}: OptionsPanelProps) {
  const update = (partial: Partial<CheckOptions>) => {
    onOptionsChange({ ...options, ...partial });
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800/60 shadow-xl shadow-black/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-emerald-400 glow-emerald" />
          Batch Options
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="batch-size" className="text-xs text-zinc-400">
              Batch size
            </Label>
            <Input
              id="batch-size"
              type="number"
              min={1}
              max={50}
              value={options.batchSize}
              onChange={(e) =>
                update({ batchSize: Math.max(1, Math.min(50, parseInt(e.target.value) || 5)) })
              }
              disabled={disabled}
              className="h-8 text-sm bg-zinc-950 border-zinc-700"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="concurrency" className="text-xs text-zinc-400">
              Concurrency
            </Label>
            <Input
              id="concurrency"
              type="number"
              min={1}
              max={10}
              value={options.concurrency}
              onChange={(e) =>
                update({ concurrency: Math.max(1, Math.min(10, parseInt(e.target.value) || 2)) })
              }
              disabled={disabled}
              className="h-8 text-sm bg-zinc-950 border-zinc-700"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="delay-ms" className="text-xs text-zinc-400">
              Delay (ms)
            </Label>
            <Input
              id="delay-ms"
              type="number"
              min={0}
              max={30000}
              step={100}
              value={options.delayMs}
              onChange={(e) =>
                update({ delayMs: Math.max(0, Math.min(30000, parseInt(e.target.value) || 1500)) })
              }
              disabled={disabled}
              className="h-8 text-sm bg-zinc-950 border-zinc-700"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="aftermarket"
            checked={options.tryAftermarket}
            onCheckedChange={(checked) =>
              update({ tryAftermarket: checked === true })
            }
            disabled={disabled}
            className="border-zinc-600"
          />
          <Label htmlFor="aftermarket" className="text-xs text-zinc-400 cursor-pointer">
            Try aftermarket lookup (best effort)
          </Label>
        </div>

        <div className="flex items-start gap-2 p-2.5 rounded-md bg-zinc-900/80 border border-zinc-800 text-zinc-500 text-[11px]">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p>RDAP-only mode works without API keys — it provides availability status only.</p>
            <p>Premium pricing is only available in Namecheap mode with configured credentials.</p>
            <p>Aftermarket prices may show &quot;Not available&quot; if no reliable provider data exists.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
