"use client";

import React, { useMemo, useState, useReducer, useEffect, useRef } from "react";
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
import { StatusBadge } from "@/components/status-badge";
import { PriceCell } from "@/components/price-cell";
import { ResultsTableFilters, type StatusFilter } from "@/components/results-table-filters";

interface ResultsTableProps {
  results: DomainResult[];
  onRetryFailed?: (failedDomains: DomainResult[]) => void;
  isRunning?: boolean;
}

type SortKey = keyof DomainResult;
type SortDir = "asc" | "desc";

type TableState = {
  search: string;
  filterStatus: StatusFilter;
  filterPremium: boolean;
  filterTld: string;
  sortKey: SortKey;
  sortDir: SortDir;
};

type TableAction =
  | { type: "SET_SEARCH"; payload: string }
  | { type: "SET_STATUS"; payload: StatusFilter }
  | { type: "SET_PREMIUM"; payload: boolean }
  | { type: "SET_TLD"; payload: string }
  | { type: "TOGGLE_SORT"; payload: SortKey };

const tableReducer = (state: TableState, action: TableAction): TableState => {
  switch (action.type) {
    case "SET_SEARCH":
      return { ...state, search: action.payload };
    case "SET_STATUS":
      return { ...state, filterStatus: action.payload };
    case "SET_PREMIUM":
      return { ...state, filterPremium: action.payload };
    case "SET_TLD":
      return { ...state, filterTld: action.payload };
    case "TOGGLE_SORT":
      if (state.sortKey === action.payload) {
        return { ...state, sortDir: state.sortDir === "asc" ? "desc" : "asc" };
      }
      return { ...state, sortKey: action.payload, sortDir: "asc" };
    default:
      return state;
  }
};

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV(results: DomainResult[]) {
  const headers = [
    "Domain", "Label", "Base Name", "Prefix", "Suffix", "TLD", 
    "Status", "Premium", "Premium Price", "Standard Price", 
    "Aftermarket Price", "Aftermarket Source", "Source Used", "Notes"
  ];
  const rows = results.map((r) => [
    r.domain, r.label, r.baseName, r.prefixUsed || "", r.suffixUsed || "", r.tld,
    r.status, r.premiumRegistration ? "Yes" : "No", r.premiumRegistrationPrice ?? "",
    r.standardRegistrationPrice ?? "", r.aftermarketResalePrice ?? "",
    r.aftermarketSource ?? "", r.sourceUsed, r.notes || ""
  ]);
  const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  downloadBlob(csv, "domain-results.csv", "text/csv;charset=utf-8;");
}

function exportJSON(results: DomainResult[]) {
  downloadBlob(JSON.stringify(results, null, 2), "domain-results.json", "application/json");
}

export function ResultsTable({ results, onRetryFailed, isRunning }: ResultsTableProps) {
  const [state, dispatch] = useReducer(tableReducer, {
    search: "",
    filterStatus: "",
    filterPremium: false,
    filterTld: "",
    sortKey: "domain",
    sortDir: "asc",
  });

  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(50);
  const loadMoreRef = useRef<HTMLTableRowElement>(null);

  const hasPrefixes = useMemo(() => results.some((r) => r.prefixUsed && r.prefixUsed !== ""), [results]);
  const hasSuffixes = useMemo(() => results.some((r) => r.suffixUsed && r.suffixUsed !== ""), [results]);
  const tlds = useMemo(() => [...new Set(results.map((r) => r.tld))].sort(), [results]);
  const failedResults = useMemo(() => results.filter((r) => r.status === "unknown"), [results]);

  const filtered = useMemo(() => {
    let data = [...results];
    if (state.search) {
      const q = state.search.toLowerCase();
      data = data.filter(r => r.domain.includes(q) || r.baseName.includes(q) || r.label.includes(q));
    }
    if (state.filterStatus) data = data.filter(r => r.status === state.filterStatus);
    if (state.filterPremium) data = data.filter(r => r.premiumRegistration);
    if (state.filterTld) data = data.filter(r => r.tld === state.filterTld);

    data.sort((a, b) => {
      const aVal = a[state.sortKey];
      const bVal = b[state.sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return state.sortDir === "asc" ? cmp : -cmp;
    });
    return data;
  }, [results, state]);

  const visibleResults = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && visibleCount < filtered.length) {
        setVisibleCount(prev => prev + 50);
      }
    }, { threshold: 0.1 });
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [visibleCount, filtered.length]);

  const [prevFilteredLength, setPrevFilteredLength] = useState(filtered.length);
  if (filtered.length !== prevFilteredLength) {
    setPrevFilteredLength(filtered.length);
    setVisibleCount(50);
  }

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 1500);
  };

  if (results.length === 0) return null;

  const tableHeaders = [
    { key: "domain" as SortKey, label: "Domain", show: true },
    { key: "label" as SortKey, label: "Label", show: true },
    { key: "baseName" as SortKey, label: "Base Name", show: true },
    { key: "prefixUsed" as SortKey, label: "Prefix", show: hasPrefixes },
    { key: "suffixUsed" as SortKey, label: "Suffix", show: hasSuffixes },
    { key: "status" as SortKey, label: "Status", show: true },
    { key: "premiumRegistration" as SortKey, label: "Premium", show: true },
    { key: "premiumRegistrationPrice" as SortKey, label: "Prem. Price", show: true },
    { key: "standardRegistrationPrice" as SortKey, label: "Std. Price", show: true },
    { key: "aftermarketResalePrice" as SortKey, label: "Aftermkt", show: true },
    { key: "sourceUsed" as SortKey, label: "Source", show: true },
    { key: "notes" as SortKey, label: "Notes", show: true },
  ].filter((h) => h.show);

  return (
    <Card className="bg-zinc-900/50 border-zinc-800/60 shadow-xl shadow-black/20">
      <CardHeader className="pb-3 border-b border-zinc-800/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Filter className="h-4 w-4 text-cyan-400" />
            Results ({filtered.length}/{results.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            {failedResults.length > 0 && onRetryFailed && !isRunning && (
              <Button
                variant="outline" size="sm" onClick={() => onRetryFailed(failedResults)}
                className="h-7 text-xs border-amber-900/50 text-amber-400 hover:bg-amber-950/30 hover:text-amber-300"
              >
                <RotateCcw className="h-3 w-3 mr-1" /> Retry {failedResults.length} failed
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => exportJSON(results)} className="h-7 text-xs border-zinc-700 bg-zinc-800">
              <Download className="h-3 w-3 mr-1" /> JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportCSV(results)} className="h-7 text-xs border-zinc-700 bg-zinc-800">
              <Download className="h-3 w-3 mr-1" /> CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        <ResultsTableFilters
          search={state.search}
          onSearchChange={(search) => dispatch({ type: "SET_SEARCH", payload: search })}
          statusFilter={state.filterStatus}
          onStatusChange={(status) => dispatch({ type: "SET_STATUS", payload: status })}
          premiumFilter={state.filterPremium}
          onPremiumChange={(p) => dispatch({ type: "SET_PREMIUM", payload: p })}
          tldFilter={state.filterTld}
          onTldChange={(tld) => dispatch({ type: "SET_TLD", payload: tld })}
          tlds={tlds}
        />

        <div className="rounded-lg border border-zinc-800/60 overflow-hidden bg-zinc-950/30">
          <div className="overflow-auto max-h-[600px] relative">
            <Table>
              <TableHeader className="sticky top-0 bg-zinc-900/95 backdrop-blur-md z-10">
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  {tableHeaders.map(({ key, label }) => (
                    <TableHead
                      key={key} onClick={() => dispatch({ type: "TOGGLE_SORT", payload: key })}
                      className="text-zinc-400 text-[11px] font-semibold cursor-pointer hover:text-zinc-200 h-10"
                    >
                      <span className="flex items-center gap-1.5 px-1 whitespace-nowrap">
                        {label}
                        <ArrowUpDown className={`h-3 w-3 ${state.sortKey === key ? "text-blue-400" : "opacity-30"}`} />
                      </span>
                    </TableHead>
                  ))}
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={tableHeaders.length + 1} className="text-center text-zinc-500 py-16 text-sm">
                      No results match your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {visibleResults.map((r) => (
                      <TableRow key={r.domain} className="border-zinc-800/50 hover:bg-zinc-800/40 text-xs transition-colors group">
                        <TableCell className="font-mono text-zinc-200 whitespace-nowrap font-medium">
                          <div className="flex items-center gap-1.5">
                            {r.domain}
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyText(r.domain)}>
                              {copiedText === r.domain ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-zinc-500 hover:text-zinc-300" />}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-zinc-400">{r.label}</TableCell>
                        <TableCell className="text-zinc-400">{r.baseName}</TableCell>
                        {hasPrefixes && <TableCell className="text-zinc-500 italic">{r.prefixUsed || "—"}</TableCell>}
                        {hasSuffixes && <TableCell className="text-zinc-500 italic">{r.suffixUsed || "—"}</TableCell>}
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        <TableCell>
                          {r.premiumRegistration ? <Badge className="bg-purple-950/50 text-purple-400 border-purple-800/50 text-[10px]">Yes</Badge> : <span className="text-zinc-600 px-1">No</span>}
                        </TableCell>
                        <TableCell><PriceCell price={r.premiumRegistrationPrice} currency={r.currency} /></TableCell>
                        <TableCell><PriceCell price={r.standardRegistrationPrice} currency={r.currency} /></TableCell>
                        <TableCell>
                          <PriceCell price={r.aftermarketResalePrice} currency={r.currency} fallback="—" />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-normal border-zinc-700/80 text-zinc-400 bg-zinc-900/50">{r.sourceUsed}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-zinc-500 text-[11px]">{r.notes || "—"}</TableCell>
                        <TableCell>
                          {r.notes && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Copy Notes" onClick={() => copyText(r.notes!)}>
                              {copiedText === r.notes ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-300" />}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {visibleCount < filtered.length && (
                      <TableRow ref={loadMoreRef}>
                        <TableCell colSpan={tableHeaders.length + 1} className="py-8 text-center text-zinc-500 text-xs">
                          Loading more results...
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
