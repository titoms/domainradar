"use client";

import React, { useCallback, useRef, useReducer, KeyboardEvent, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, FileJson, AlertCircle, CheckCircle2, Tags } from "lucide-react";
import { domainInputSchema } from "@/lib/schemas";
import type { DomainInput } from "@/lib/types";

interface JsonInputProps {
  value?: DomainInput | null;
  onInputChange: (input: DomainInput | null) => void;
  disabled?: boolean;
  className?: string;
}

type InputTab = "json" | "builder";

interface TagField {
  key: keyof DomainInput;
  label: string;
  placeholder: string;
}

const TAG_FIELDS: TagField[] = [
  { key: "base_names", label: "Base Names", placeholder: "Type a name and press Enter…" },
  { key: "prefixes", label: "Prefixes", placeholder: "Type a prefix and press Enter…" },
  { key: "suffixes", label: "Suffixes", placeholder: "Type a suffix and press Enter…" },
  { key: "tlds", label: "TLDs", placeholder: "Type a TLD and press Enter…" },
];

import { TagInput } from "@/components/ui/tag-input";

import { JsonInputTabs } from "@/components/ui/json-input-tabs";

type JsonInputState = {
  tab: InputTab;
  rawJson: string;
  error: string | null;
  parsedSummary: {
    baseNames: number;
    prefixes: number;
    suffixes: number;
    tlds: number;
  } | null;
  builderData: DomainInput;
};

type JsonInputAction =
  | { type: "SET_TAB"; payload: InputTab }
  | { type: "SET_RAW_JSON"; payload: string }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_SUMMARY"; payload: JsonInputState["parsedSummary"] }
  | { type: "SET_BUILDER_DATA"; payload: DomainInput }
  | { type: "CLEAR" };

const jsonInputReducer = (state: JsonInputState, action: JsonInputAction): JsonInputState => {
  switch (action.type) {
    case "SET_TAB":
      return { ...state, tab: action.payload };
    case "SET_RAW_JSON":
      return { ...state, rawJson: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_SUMMARY":
      return { ...state, parsedSummary: action.payload };
    case "SET_BUILDER_DATA":
      return { ...state, builderData: action.payload };
    case "CLEAR":
      return {
        ...state,
        rawJson: "",
        error: null,
        parsedSummary: null,
        builderData: { base_names: [], prefixes: [], suffixes: [], tlds: [] }
      };
    default:
      return state;
  }
};

export function JsonInput({ value, onInputChange, disabled, className }: JsonInputProps) {
  const [state, dispatch] = useReducer(jsonInputReducer, {
    tab: "builder",
    rawJson: "",
    error: null,
    parsedSummary: null,
    builderData: {
      base_names: [],
      prefixes: [],
      suffixes: [],
      tlds: [],
    },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync external value to local state
  React.useEffect(() => {
    if (value) {
      dispatch({ type: "SET_BUILDER_DATA", payload: value });
      dispatch({
        type: "SET_SUMMARY",
        payload: {
          baseNames: value.base_names.length,
          prefixes: value.prefixes.length,
          suffixes: value.suffixes.length,
          tlds: value.tlds.length,
        }
      });
      // Try to parse stringified value to raw JSON just in case they switch tabs
      try {
        dispatch({ type: "SET_RAW_JSON", payload: JSON.stringify(value, null, 2) });
      } catch {
        // ignore
      }
    } else if (value === null && state.builderData.base_names.length > 0) {
       // if completely cleared externally 
       dispatch({ type: "CLEAR" });
    }
  }, [value]);

  const validateAndSet = useCallback(
    (text: string) => {
      dispatch({ type: "SET_RAW_JSON", payload: text });
      dispatch({ type: "SET_ERROR", payload: null });
      dispatch({ type: "SET_SUMMARY", payload: null });
      onInputChange(null);

      if (!text.trim()) return;

      try {
        const parsed = JSON.parse(text);
        const result = domainInputSchema.safeParse(parsed);

        if (!result.success) {
          const issues = result.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ");
          dispatch({ type: "SET_ERROR", payload: issues });
          return;
        }

        dispatch({
          type: "SET_SUMMARY",
          payload: {
            baseNames: result.data.base_names.length,
            prefixes: result.data.prefixes.length,
            suffixes: result.data.suffixes.length,
            tlds: result.data.tlds.length,
          }
        });
        onInputChange(result.data);
      } catch {
        dispatch({ type: "SET_ERROR", payload: "Invalid JSON syntax. Please check the formatting." });
      }
    },
    [onInputChange]
  );

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        validateAndSet(text);
      };
      reader.readAsText(file);
    },
    [validateAndSet]
  );

  const updateBuilder = useCallback(
    (newData: DomainInput) => {
      dispatch({ type: "SET_BUILDER_DATA", payload: newData });
      const result = domainInputSchema.safeParse(newData);
      if (result.success && result.data.base_names.length > 0 && result.data.tlds.length > 0) {
        onInputChange(result.data);
        dispatch({ type: "SET_ERROR", payload: null });
        dispatch({
          type: "SET_SUMMARY",
          payload: {
            baseNames: result.data.base_names.length,
            prefixes: result.data.prefixes.length,
            suffixes: result.data.suffixes.length,
            tlds: result.data.tlds.length,
          }
        });
      } else {
        onInputChange(null);
        dispatch({ type: "SET_SUMMARY", payload: null });
        if (newData.base_names.length === 0 && newData.tlds.length === 0) {
          dispatch({ type: "SET_ERROR", payload: null });
        } else if (newData.base_names.length === 0) {
          dispatch({ type: "SET_ERROR", payload: "At least one base name is required" });
        } else if (newData.tlds.length === 0) {
          dispatch({ type: "SET_ERROR", payload: "At least one TLD is required" });
        }
      }
    },
    [onInputChange]
  );

  const handleAddTag = (field: keyof DomainInput, tag: string) => {
    const updated = { ...state.builderData, [field]: [...state.builderData[field], tag] };
    updateBuilder(updated);
  };

  const handleRemoveTag = (field: keyof DomainInput, index: number) => {
    const updated = {
      ...state.builderData,
      [field]: state.builderData[field].filter((_, i) => i !== index),
    };
    updateBuilder(updated);
  };

  const switchToBuilder = () => {
    dispatch({ type: "SET_TAB", payload: "builder" });
    if (state.rawJson.trim()) {
      try {
        const parsed = JSON.parse(state.rawJson);
        const result = domainInputSchema.safeParse(parsed);
        if (result.success) {
          updateBuilder(result.data);
          return;
        }
      } catch {
        // ignore
      }
    }
    updateBuilder(state.builderData);
  };

  const switchToJson = () => {
    dispatch({ type: "SET_TAB", payload: "json" });
    if (state.builderData.base_names.length > 0 || state.builderData.tlds.length > 0) {
      const json = JSON.stringify(state.builderData, null, 2);
      validateAndSet(json);
    }
  };

  return (
    <Card className={`bg-zinc-900/50 border-zinc-800/60 shadow-xl shadow-black/20 ${className || ""}`}>
      <CardHeader className="pb-3 border-b border-zinc-800/40">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FileJson className="h-4 w-4 text-blue-400" />
            Input Configuration
          </CardTitle>
          <JsonInputTabs
            tab={state.tab}
            onTabChange={(tab) => dispatch({ type: "SET_TAB", payload: tab })}
            disabled={disabled}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {state.tab === "json" ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="json-input" className="text-xs text-zinc-400">
                Paste JSON or upload a file
              </Label>
              <textarea
                id="json-input"
                className="w-full min-h-[160px] rounded-lg border border-zinc-700/60 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 resize-y disabled:opacity-50 transition-colors"
                placeholder={`{\n  "base_names": ["kivo", "vestra"],\n  "prefixes": ["get", "try"],\n  "suffixes": ["app", "lab"],\n  "tlds": ["com", "ai", "dev"]\n}`}
                value={state.rawJson}
                onChange={(e) => validateAndSet(e.target.value)}
                disabled={disabled}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="text-xs border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
              >
                <Upload className="h-3 w-3 mr-1.5" />
                Upload JSON
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileUpload}
              />
              {state.rawJson && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    dispatch({ type: "CLEAR" });
                    onInputChange(null);
                  }}
                  disabled={disabled}
                  className="text-xs text-zinc-500 hover:text-zinc-300"
                >
                  Clear
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            {TAG_FIELDS.map((field) => (
              <TagInput
                key={field.key}
                label={field.label}
                placeholder={field.placeholder}
                tags={state.builderData[field.key]}
                onAdd={(tag) => handleAddTag(field.key, tag)}
                onRemove={(idx) => handleRemoveTag(field.key, idx)}
                disabled={disabled}
              />
            ))}
          </div>
        )}

        {state.error && (
          <div className="flex items-start gap-2 p-2.5 rounded-md bg-red-950/40 border border-red-900/50 text-red-300 text-xs shadow-[0_0_12px_rgba(239,68,68,0.06)]">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        {state.parsedSummary && (
          <div className="flex items-start gap-2 p-2.5 rounded-md bg-emerald-950/40 border border-emerald-900/50 text-emerald-300 text-xs shadow-[0_0_12px_rgba(16,185,129,0.06)]">
            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              Valid: {state.parsedSummary.baseNames} base name{state.parsedSummary.baseNames !== 1 ? "s" : ""},
              {" "}{state.parsedSummary.prefixes} prefix{state.parsedSummary.prefixes !== 1 ? "es" : ""},
              {" "}{state.parsedSummary.suffixes} suffix{state.parsedSummary.suffixes !== 1 ? "es" : ""},
              {" "}{state.parsedSummary.tlds} TLD{state.parsedSummary.tlds !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
