"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, HelpCircle, Sparkles, BarChart3 } from "lucide-react";
import type { DomainResult } from "@/lib/types";

interface SummaryCardsProps {
  results: DomainResult[];
}

export function SummaryCards({ results }: SummaryCardsProps) {
  if (results.length === 0) return null;

  const available = results.filter((r) => r.status === "available").length;
  const registered = results.filter((r) => r.status === "registered").length;
  const unknown = results.filter((r) => r.status === "unknown").length;
  const premiumAvailable = results.filter(
    (r) => r.status === "available" && r.premiumRegistration
  ).length;

  const cards = [
    {
      label: "Total Checked",
      value: results.length,
      icon: BarChart3,
      color: "text-zinc-300",
      bg: "bg-zinc-900/40",
      border: "border border-zinc-700/60",
      glow: "shadow-sm",
    },
    {
      label: "Available",
      value: available,
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-500/5",
      border: "border border-emerald-500/30",
      glow: "shadow-[0_0_15px_rgba(16,185,129,0.05)]",
    },
    {
      label: "Registered",
      value: registered,
      icon: XCircle,
      color: "text-red-400",
      bg: "bg-red-500/5",
      border: "border border-red-500/30",
      glow: "shadow-[0_0_15px_rgba(239,68,68,0.05)]",
    },
    {
      label: "Unknown",
      value: unknown,
      icon: HelpCircle,
      color: "text-amber-400",
      bg: "bg-amber-500/5",
      border: "border border-amber-500/30",
      glow: "shadow-[0_0_15px_rgba(245,158,11,0.05)]",
    },
    {
      label: "Premium Avail.",
      value: premiumAvailable,
      icon: Sparkles,
      color: "text-purple-400",
      bg: "bg-purple-500/5",
      border: "border border-purple-500/30",
      glow: "shadow-[0_0_15px_rgba(147,51,234,0.05)]",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
      {cards.map(({ label, value, icon: Icon, color, bg, border, glow }) => (
        <Card key={label} className={`${bg} ${border} ${glow} ring-0`}>
          <CardContent className="p-3 flex items-center gap-2.5">
            <Icon className={`h-4 w-4 ${color} shrink-0`} />
            <div>
              <p className="text-lg font-semibold text-zinc-100">{value}</p>
              <p className="text-[10px] text-zinc-500 leading-tight">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
