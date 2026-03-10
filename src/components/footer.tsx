"use client";

import { useEffect, useState } from "react";

export function Footer() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="mt-auto border-t border-zinc-800/40 bg-zinc-950/50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-600">
          <p>© {year ?? 2026} DomainCheckr. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="/" className="hover:text-zinc-400 transition-colors">Twitter</a>
            <a href="/" className="hover:text-zinc-400 transition-colors">GitHub</a>
            <a href="/" className="hover:text-zinc-400 transition-colors">LinkedIn</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
