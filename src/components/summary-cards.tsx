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
      bg: "bg-zinc-800/50",
      border: "border-zinc-700/50",
      glow: "",
    },
    {
      label: "Available",
      value: available,
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-950/30",
      border: "border-emerald-800/40",
      glow: "shadow-[0_0_20px_rgba(16,185,129,0.08)]",
    },
    {
      label: "Registered",
      value: registered,
      icon: XCircle,
      color: "text-red-400",
      bg: "bg-red-950/30",
      border: "border-red-800/40",
      glow: "shadow-[0_0_20px_rgba(239,68,68,0.08)]",
    },
    {
      label: "Unknown",
      value: unknown,
      icon: HelpCircle,
      color: "text-amber-400",
      bg: "bg-amber-950/30",
      border: "border-amber-800/40",
      glow: "shadow-[0_0_20px_rgba(245,158,11,0.08)]",
    },
    {
      label: "Premium Avail.",
      value: premiumAvailable,
      icon: Sparkles,
      color: "text-purple-400",
      bg: "bg-purple-950/30",
      border: "border-purple-800/40",
      glow: "shadow-[0_0_20px_rgba(147,51,234,0.08)]",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
      {cards.map(({ label, value, icon: Icon, color, bg, border, glow }) => (
        <Card key={label} className={`${bg} ${border} ${glow}`}>
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
