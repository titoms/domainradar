import React, { KeyboardEvent, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";

export function TagInput({
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

  const inputId = `tag-input-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={inputId}
        className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium cursor-pointer"
      >
        {label}
      </Label>
      <div className="flex items-center gap-1.5">
        <Input
          id={inputId}
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
          {tags.map((tag) => (
            <Badge
              key={tag}
              className="bg-blue-950/40 text-blue-300 border-blue-800/30 text-[11px] font-normal pl-2 pr-1 py-0.5 gap-1 shadow-[0_0_8px_rgba(59,130,246,0.08)]"
            >
              {tag}
              <button
                type="button"
                onClick={() => onRemove(tags.indexOf(tag))}
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
