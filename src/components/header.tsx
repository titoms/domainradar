"use client";

import { Play, Zap } from "lucide-react";
import { Button } from "./ui/button";

interface HeaderProps {
  onRun?: () => void;
  isRunning?: boolean;
  disabled?: boolean;
}

export function Header({ onRun, isRunning, disabled }: HeaderProps) {
  return (
    <header className="border-b border-zinc-800/40 bg-zinc-950/70 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            DomainCheckr
          </h1>
        </div>
        <div>
          <Button
            onClick={onRun}
            disabled={disabled}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium shadow-lg shadow-blue-500/15"
          >
            <Play className="h-4 w-4 mr-2" />
            {isRunning ? "Running..." : "RUN CHECK"}
          </Button>
        </div>
      </div>
    </header>
  );
}
