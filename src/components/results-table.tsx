"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowUpDown,
  Copy,
  Download,
  Search,
  Filter,
  Check,
  RotateCcw,
} from "lucide-react";
import type { DomainResult } from "@/lib/types";

interface ResultsTableProps {
  results: DomainResult[];
  onRetryFailed?: (failedDomains: DomainResult[]) => void;
  isRunning?: boolean;
}

type SortKey = keyof DomainResult;
type SortDir = "asc" | "desc";
type StatusFilter = "" | "available" | "registered" | "unknown";

function exportCSV(results: DomainResult[]) {
  const headers = [
    "Domain",
    "Label",
    "Base Name",
    "Prefix",
    "Suffix",
    "TLD",
    "Status",
    "Premium",
    "Premium Price",
    "Standard Price",
    "Aftermarket Price",
    "Aftermarket Source",
    "Source Used",
    "Notes",
  ];
  const rows = results.map((r) => [
    r.domain,
    r.label,
    r.baseName,
    r.prefixUsed || "",
    r.suffixUsed || "",
    r.tld,
    r.status,
    r.premiumRegistration ? "Yes" : "No",
    r.premiumRegistrationPrice ?? "",
    r.standardRegistrationPrice ?? "",
    r.aftermarketResalePrice ?? "",
    r.aftermarketSource ?? "",
    r.sourceUsed,
    r.notes || "",
  ]);

  const csv =
    [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

  downloadBlob(csv, "domain-results.csv", "text/csv;charset=utf-8;");
}

function exportJSON(results: DomainResult[]) {
  const json = JSON.stringify(results, null, 2);
  downloadBlob(json, "domain-results.json", "application/json");
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ResultsTable({ results, onRetryFailed, isRunning }: ResultsTableProps) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("");
  const [filterPremium, setFilterPremium] = useState(false);
  const [filterTld, setFilterTld] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("domain");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);

  // Get unique TLDs
  const tlds = useMemo(
    () => [...new Set(results.map((r) => r.tld))].sort(),
    [results]
  );

  // Count failed/unknown
  const failedResults = useMemo(
    () => results.filter((r) => r.status === "unknown"),
    [results]
  );

  // Filter + sort
  const filtered = useMemo(() => {
    let data = [...results];

    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (r) =>
          r.domain.includes(q) ||
          r.baseName.includes(q) ||
          r.label.includes(q)
      );
    }

    if (filterStatus) {
      data = data.filter((r) => r.status === filterStatus);
    }

    if (filterPremium) {
      data = data.filter((r) => r.premiumRegistration);
    }

    if (filterTld) {
      data = data.filter((r) => r.tld === filterTld);
    }

    data.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = String(aVal).localeCompare(String(bVal), undefined, {
        numeric: true,
      });
      return sortDir === "asc" ? cmp : -cmp;
    });

    return data;
  }, [results, search, filterStatus, filterPremium, filterTld, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const copyDomain = (domain: string) => {
    navigator.clipboard.writeText(domain);
    setCopiedDomain(domain);
    setTimeout(() => setCopiedDomain(null), 1500);
  };

  const statusBadge = (status: string) => {
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
  };

  const formatPrice = (price: number | null, currency: string | null) => {
    if (price == null) return <span className="text-zinc-600">—</span>;
    return (
      <span>
        {currency === "USD" ? "$" : ""}
        {price.toFixed(2)}
      </span>
    );
  };

  if (results.length === 0) return null;

  return (
    <Card className="bg-zinc-900/50 border-zinc-800/60 shadow-xl shadow-black/20">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Filter className="h-4 w-4 text-cyan-400" />
            Results ({filtered.length}/{results.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            {failedResults.length > 0 && onRetryFailed && !isRunning && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRetryFailed(failedResults)}
                className="h-7 text-xs border-amber-900/50 text-amber-400 hover:bg-amber-950/30 hover:text-amber-300"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Retry {failedResults.length} failed
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportJSON(results)}
              className="h-7 text-xs border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
            >
              <Download className="h-3 w-3 mr-1" />
              JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCSV(results)}
              className="h-7 text-xs border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
            >
              <Download className="h-3 w-3 mr-1" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <Input
              placeholder="Search domain or base name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-sm bg-zinc-950 border-zinc-700"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
            className="h-8 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-300"
          >
            <option value="">All Statuses</option>
            <option value="available">✅ Available</option>
            <option value="registered">🔴 Registered</option>
            <option value="unknown">⚠️ Unknown / Failed</option>
          </select>
          <div className="flex items-center gap-1.5">
            <Checkbox
              id="filter-premium"
              checked={filterPremium}
              onCheckedChange={(c) => setFilterPremium(c === true)}
              className="border-zinc-600"
            />
            <label htmlFor="filter-premium" className="text-xs text-zinc-400 cursor-pointer whitespace-nowrap">
              Premium only
            </label>
          </div>
          <select
            value={filterTld}
            onChange={(e) => setFilterTld(e.target.value)}
            className="h-8 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-300"
          >
            <option value="">All TLDs</option>
            {tlds.map((tld) => (
              <option key={tld} value={tld}>
                .{tld}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-zinc-800 overflow-auto max-h-[600px]">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                {[
                  { key: "domain" as SortKey, label: "Domain" },
                  { key: "label" as SortKey, label: "Label" },
                  { key: "baseName" as SortKey, label: "Base Name" },
                  { key: "prefixUsed" as SortKey, label: "Prefix" },
                  { key: "suffixUsed" as SortKey, label: "Suffix" },
                  { key: "status" as SortKey, label: "Status" },
                  { key: "premiumRegistration" as SortKey, label: "Premium" },
                  {
                    key: "premiumRegistrationPrice" as SortKey,
                    label: "Prem. Price",
                  },
                  {
                    key: "standardRegistrationPrice" as SortKey,
                    label: "Std. Price",
                  },
                  {
                    key: "aftermarketResalePrice" as SortKey,
                    label: "Aftermkt",
                  },
                  { key: "sourceUsed" as SortKey, label: "Source" },
                  { key: "notes" as SortKey, label: "Notes" },
                ].map(({ key, label }) => (
                  <TableHead
                    key={key}
                    className="text-zinc-400 text-[11px] font-medium cursor-pointer hover:text-zinc-200 whitespace-nowrap"
                    onClick={() => toggleSort(key)}
                  >
                    <span className="flex items-center gap-1">
                      {label}
                      <ArrowUpDown className="h-3 w-3 opacity-40" />
                    </span>
                  </TableHead>
                ))}
                <TableHead className="text-zinc-400 text-[11px] font-medium w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={13}
                    className="text-center text-zinc-500 py-8 text-sm"
                  >
                    No results match your filters
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r, i) => (
                  <TableRow
                    key={`${r.domain}-${i}`}
                    className="border-zinc-800/50 hover:bg-zinc-800/30 text-xs"
                  >
                    <TableCell className="font-mono text-zinc-200 whitespace-nowrap">
                      {r.domain}
                    </TableCell>
                    <TableCell className="text-zinc-400">{r.label}</TableCell>
                    <TableCell className="text-zinc-400">{r.baseName}</TableCell>
                    <TableCell className="text-zinc-500">
                      {r.prefixUsed || "—"}
                    </TableCell>
                    <TableCell className="text-zinc-500">
                      {r.suffixUsed || "—"}
                    </TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell>
                      {r.premiumRegistration ? (
                        <Badge className="bg-purple-950/50 text-purple-400 border-purple-800/50 text-[10px] font-normal">
                          Yes
                        </Badge>
                      ) : (
                        <span className="text-zinc-600">No</span>
                      )}
                    </TableCell>
                    <TableCell className="text-zinc-300">
                      {formatPrice(r.premiumRegistrationPrice, r.currency)}
                    </TableCell>
                    <TableCell className="text-zinc-300">
                      {formatPrice(r.standardRegistrationPrice, r.currency)}
                    </TableCell>
                    <TableCell className="text-zinc-300">
                      {r.aftermarketResalePrice != null ? (
                        formatPrice(r.aftermarketResalePrice, r.currency)
                      ) : (
                        <span className="text-zinc-600 text-[10px]">
                          Not available
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-normal border-zinc-700 text-zinc-400"
                      >
                        {r.sourceUsed}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-zinc-500 text-[11px]">
                      {r.notes || "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyDomain(r.domain)}
                      >
                        {copiedDomain === r.domain ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3 text-zinc-500" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
