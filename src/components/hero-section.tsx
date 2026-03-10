import { TypingEffect } from "@/components/ui/typing-effect";

export function HeroSection() {
  return (
    <section className="relative mt-6 py-12 sm:py-12 animate-in fade-in slide-in-from-top-4 duration-700 flex flex-col items-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 flex flex-col items-center text-center">
        
        {/* Glitch Title */}
        <h1 className="glitch-container mb-2 overflow-visible w-full max-w-2xl px-2">
          <div className="glitch-stack" style={{ "--stacks": 3 } as React.CSSProperties}>
            <span style={{ "--index": 0 } as React.CSSProperties} className="text-5xl sm:text-7xl lg:text-[5rem] whitespace-nowrap overflow-visible leading-none tracking-tighter mix-blend-screen">Bulk Domain</span>
            <span style={{ "--index": 1 } as React.CSSProperties} className="text-5xl sm:text-7xl lg:text-[5rem] whitespace-nowrap overflow-visible leading-none tracking-tighter mix-blend-screen">Bulk Domain</span>
            <span style={{ "--index": 2 } as React.CSSProperties} className="text-5xl sm:text-7xl lg:text-[5rem] whitespace-nowrap overflow-visible leading-none tracking-tighter mix-blend-screen">Bulk Domain</span>
          </div>
          <span className="glitch-center text-3xl sm:text-5xl font-bold mt-2 font-mono bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent opacity-90 leading-none">
            Checker
          </span>
        </h1>

        <div className="text-zinc-400 text-sm sm:text-base max-w-2xl text-center mt-2 min-h-[3rem] flex items-center justify-center">
          <TypingEffect text="A professional-grade tool for bulk domain research. Generate variations, check availability via RDAP/Namecheap..." speed={35} />
        </div>
      </div>
    </section>
  );
}
