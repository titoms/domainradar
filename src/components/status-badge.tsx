"use client";

import { Badge } from "@/components/ui/badge";
import type { DomainStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: DomainStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case "available":
      return (
        <Badge className="bg-emerald-950/50 text-emerald-400 border-emerald-800/50 text-[10px] font-normal">
          Available
        </Badge>
      );
    case "registered":
      return (
        <Badge className="bg-red-950/50 text-red-400 border-red-800/50 text-[10px] font-normal">
          Registered
        </Badge>
      );
    default:
      return (
        <Badge className="bg-amber-950/50 text-amber-400 border-amber-800/50 text-[10px] font-normal">
          Unknown
        </Badge>
      );
  }
}
