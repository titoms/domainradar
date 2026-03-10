"use client";

import React, { useCallback, useRef, useState, KeyboardEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, FileJson, AlertCircle, CheckCircle2, X, Tags, Plus } from "lucide-react";
import { domainInputSchema } from "@/lib/schemas";
import type { DomainInput } from "@/lib/types";

interface JsonInputProps {
  onInputChange: (input: DomainInput | null) => void;
  disabled?: boolean;
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

function TagInput({
  label,
  placeholder,
  tags,
  onAdd,
  onRemove,
  disabled,
}: {
  label: string;
  placeholder: string;
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
}) {
  const [inputValue, setInputValue] = useState("");

  const handleAdd = () => {
    const trimmed = inputValue.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onAdd(trimmed);
      setInputValue("");
    } else {
      setInputValue("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      onRemove(tags.length - 1);
    } else if (e.key === "," || e.key === " ") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">{label}</Label>
      <div className="flex items-center gap-1.5">
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleAdd}
          placeholder={placeholder}
          disabled={disabled}
          className="h-8 text-xs bg-zinc-950/80 border-zinc-700/60 focus:border-blue-500/50 focus:ring-blue-500/20 transition-colors"
        />
        {inputValue.trim() && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAdd}
            disabled={disabled}
            className="h-8 w-8 p-0 text-zinc-500 hover:text-blue-300 shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {tags.map((tag, i) => (
            <Badge
              key={`${tag}-${i}`}
              className="bg-blue-950/40 text-blue-300 border-blue-800/30 text-[11px] font-normal pl-2 pr-1 py-0.5 gap-1 shadow-[0_0_8px_rgba(59,130,246,0.08)]"
            >
              {tag}
              <button
                type="button"
                onClick={() => onRemove(i)}
                disabled={disabled}
                className="hover:bg-blue-800/30 rounded-full p-0.5 transition-colors"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function JsonInput({ onInputChange, disabled }: JsonInputProps) {
  const [tab, setTab] = useState<InputTab>("builder");
  const [rawJson, setRawJson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [parsedSummary, setParsedSummary] = useState<{
    baseNames: number;
    prefixes: number;
    suffixes: number;
    tlds: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Builder state
  const [builderData, setBuilderData] = useState<DomainInput>({
    base_names: [],
    prefixes: [],
    suffixes: [],
    tlds: [],
  });

  const validateAndSet = useCallback(
    (text: string) => {
      setRawJson(text);
      setError(null);
      setParsedSummary(null);
      onInputChange(null);

      if (!text.trim()) return;

      try {
        const parsed = JSON.parse(text);
        const result = domainInputSchema.safeParse(parsed);

        if (!result.success) {
          const issues = result.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ");
          setError(issues);
          return;
        }

        setParsedSummary({
          baseNames: result.data.base_names.length,
          prefixes: result.data.prefixes.length,
          suffixes: result.data.suffixes.length,
          tlds: result.data.tlds.length,
        });
        onInputChange(result.data);
      } catch {
        setError("Invalid JSON syntax. Please check the formatting.");
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

  // Builder: validate and notify parent whenever tags change
  const updateBuilder = useCallback(
    (newData: DomainInput) => {
      setBuilderData(newData);
      const result = domainInputSchema.safeParse(newData);
      if (result.success && result.data.base_names.length > 0 && result.data.tlds.length > 0) {
        onInputChange(result.data);
        setError(null);
        setParsedSummary({
          baseNames: result.data.base_names.length,
          prefixes: result.data.prefixes.length,
          suffixes: result.data.suffixes.length,
          tlds: result.data.tlds.length,
        });
      } else {
        onInputChange(null);
        setParsedSummary(null);
        if (newData.base_names.length === 0 && newData.tlds.length === 0) {
          setError(null);
        } else if (newData.base_names.length === 0) {
          setError("At least one base name is required");
        } else if (newData.tlds.length === 0) {
          setError("At least one TLD is required");
        }
      }
    },
    [onInputChange]
  );

  const handleAddTag = (field: keyof DomainInput, tag: string) => {
    const updated = { ...builderData, [field]: [...builderData[field], tag] };
    updateBuilder(updated);
  };

  const handleRemoveTag = (field: keyof DomainInput, index: number) => {
    const updated = {
      ...builderData,
      [field]: builderData[field].filter((_, i) => i !== index),
    };
    updateBuilder(updated);
  };

  // When switching to builder, try to populate from current JSON
  const switchToBuilder = () => {
    setTab("builder");
    if (rawJson.trim()) {
      try {
        const parsed = JSON.parse(rawJson);
        const result = domainInputSchema.safeParse(parsed);
        if (result.success) {
          setBuilderData(result.data);
          updateBuilder(result.data);
          return;
        }
      } catch {
        // ignore
      }
    }
    updateBuilder(builderData);
  };

  // When switching to JSON, serialize builder data
  const switchToJson = () => {
    setTab("json");
    if (builderData.base_names.length > 0 || builderData.tlds.length > 0) {
      const json = JSON.stringify(builderData, null, 2);
      validateAndSet(json);
    }
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800/60 shadow-xl shadow-black/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FileJson className="h-4 w-4 text-blue-400 glow-blue" />
            Input Configuration
          </CardTitle>
          <div className="flex items-center rounded-md bg-zinc-800/80 p-0.5 border border-zinc-700/40">
            <button
              onClick={switchToJson}
              disabled={disabled}
              className={`text-[11px] px-2.5 py-1 rounded transition-all ${
                tab === "json"
                  ? "bg-zinc-700 text-zinc-200 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              } disabled:opacity-50`}
            >
              <FileJson className="h-3 w-3 inline mr-1" />
              JSON
            </button>
            <button
              onClick={switchToBuilder}
              disabled={disabled}
              className={`text-[11px] px-2.5 py-1 rounded transition-all ${
                tab === "builder"
                  ? "bg-zinc-700 text-zinc-200 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              } disabled:opacity-50`}
            >
              <Tags className="h-3 w-3 inline mr-1" />
              Builder
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {tab === "json" ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="json-input" className="text-xs text-zinc-400">
                Paste JSON or upload a file
              </Label>
              <textarea
                id="json-input"
                className="w-full min-h-[160px] rounded-lg border border-zinc-700/60 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 resize-y disabled:opacity-50 transition-colors"
                placeholder={`{\n  "base_names": ["kivo", "vestra"],\n  "prefixes": ["get", "try"],\n  "suffixes": ["app", "lab"],\n  "tlds": ["com", "ai", "dev"]\n}`}
                value={rawJson}
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
              {rawJson && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRawJson("");
                    setError(null);
                    setParsedSummary(null);
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
                tags={builderData[field.key]}
                onAdd={(tag) => handleAddTag(field.key, tag)}
                onRemove={(idx) => handleRemoveTag(field.key, idx)}
                disabled={disabled}
              />
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-2.5 rounded-md bg-red-950/40 border border-red-900/50 text-red-300 text-xs shadow-[0_0_12px_rgba(239,68,68,0.06)]">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 glow-red" />
            <span>{error}</span>
          </div>
        )}

        {parsedSummary && (
          <div className="flex items-start gap-2 p-2.5 rounded-md bg-emerald-950/40 border border-emerald-900/50 text-emerald-300 text-xs shadow-[0_0_12px_rgba(16,185,129,0.06)]">
            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 glow-emerald" />
            <span>
              Valid: {parsedSummary.baseNames} base name{parsedSummary.baseNames !== 1 ? "s" : ""},
              {" "}{parsedSummary.prefixes} prefix{parsedSummary.prefixes !== 1 ? "es" : ""},
              {" "}{parsedSummary.suffixes} suffix{parsedSummary.suffixes !== 1 ? "es" : ""},
              {" "}{parsedSummary.tlds} TLD{parsedSummary.tlds !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
