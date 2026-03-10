"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe, Shield, Eye, EyeOff } from "lucide-react";
import type { CheckMode, NamecheapCredentials } from "@/lib/types";

interface ModeSelectorProps {
  mode: CheckMode;
  onModeChange: (mode: CheckMode) => void;
  namecheapConfigured: boolean;
  disabled?: boolean;
  credentials: NamecheapCredentials;
  onCredentialsChange: (creds: NamecheapCredentials) => void;
}

export function ModeSelector({
  mode,
  onModeChange,
  disabled,
  credentials,
  onCredentialsChange,
}: ModeSelectorProps) {
  const [showKey, setShowKey] = useState(false);

  const hasCredentials = !!(
    credentials.apiUser &&
    credentials.apiKey &&
    credentials.username &&
    credentials.clientIp
  );

  const updateCred = (field: keyof NamecheapCredentials, value: string) => {
    onCredentialsChange({ ...credentials, [field]: value });
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800/60 shadow-xl shadow-black/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Shield className="h-4 w-4 text-purple-400 glow-purple" />
          Check Mode
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onModeChange("rdap")}
            disabled={disabled}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-sm transition-all ${
              mode === "rdap"
                ? "border-blue-500/60 bg-blue-950/30 text-blue-300 shadow-[0_0_16px_rgba(59,130,246,0.12)]"
                : "border-zinc-700/60 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Globe className={`h-5 w-5 ${mode === "rdap" ? "glow-blue" : ""}`} />
            <span className="font-medium">RDAP Only</span>
            <span className="text-[10px] opacity-70">No API key needed</span>
          </button>
          <button
            onClick={() => onModeChange("namecheap-rdap")}
            disabled={disabled}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-sm transition-all ${
              mode === "namecheap-rdap"
                ? "border-amber-500/60 bg-amber-950/30 text-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.12)]"
                : "border-zinc-700/60 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Shield className={`h-5 w-5 ${mode === "namecheap-rdap" ? "glow-amber" : ""}`} />
            <span className="font-medium">Namecheap + RDAP</span>
            <span className="text-[10px] opacity-70">Premium pricing info</span>
          </button>
        </div>

        {mode === "namecheap-rdap" && (
          <div className="space-y-2 p-3 rounded-lg bg-zinc-800/40 border border-zinc-700/40">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-zinc-300">
                Namecheap API Credentials
              </p>
              {hasCredentials && (
                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                  Configured
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="nc-api-user" className="text-[10px] text-zinc-500">
                  API User
                </Label>
                <Input
                  id="nc-api-user"
                  type="text"
                  value={credentials.apiUser}
                  onChange={(e) => updateCred("apiUser", e.target.value)}
                  disabled={disabled}
                  placeholder="api_user"
                  className="h-7 text-xs bg-zinc-950/80 border-zinc-700/60"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nc-username" className="text-[10px] text-zinc-500">
                  Username
                </Label>
                <Input
                  id="nc-username"
                  type="text"
                  value={credentials.username}
                  onChange={(e) => updateCred("username", e.target.value)}
                  disabled={disabled}
                  placeholder="username"
                  className="h-7 text-xs bg-zinc-950/80 border-zinc-700/60"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="nc-api-key" className="text-[10px] text-zinc-500">
                API Key
              </Label>
              <div className="relative">
                <Input
                  id="nc-api-key"
                  type={showKey ? "text" : "password"}
                  value={credentials.apiKey}
                  onChange={(e) => updateCred("apiKey", e.target.value)}
                  disabled={disabled}
                  placeholder="api_key"
                  className="h-7 text-xs bg-zinc-950/80 border-zinc-700/60 pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showKey ? (
                    <EyeOff className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="nc-client-ip" className="text-[10px] text-zinc-500">
                Whitelisted Client IP
              </Label>
              <Input
                id="nc-client-ip"
                type="text"
                value={credentials.clientIp}
                onChange={(e) => updateCred("clientIp", e.target.value)}
                disabled={disabled}
                placeholder="127.0.0.1"
                className="h-7 text-xs bg-zinc-950/80 border-zinc-700/60"
              />
            </div>

            {!hasCredentials && (
              <p className="text-[10px] text-amber-400/70 mt-1">
                Fill all fields to enable Namecheap mode. Without credentials, RDAP fallback will be used.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
