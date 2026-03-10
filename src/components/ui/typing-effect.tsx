"use client";

import { useEffect, useState } from "react";

export function TypingEffect({ text, speed = 40 }: { text: string; speed?: number }) {
  const [displayedText, setDisplayedText] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    let index = 0;
    let typeTimeout: NodeJS.Timeout;
    let blinkInterval: NodeJS.Timeout;
    let isCancelled = false;

    const typeNextChar = () => {
      if (isCancelled) return;
      
      setDisplayedText(text.substring(0, index + 1));
      index++;
      
      if (index < text.length) {
        typeTimeout = setTimeout(typeNextChar, speed);
      } else {
        // Finished typing, start blinking
        let blinks = 0;
        blinkInterval = setInterval(() => {
          if (isCancelled) return;
          setShowCursor((prev) => !prev);
          blinks++;
          
          // 10 toggles = 5 full blinks
          if (blinks >= 10) {
            clearInterval(blinkInterval);
            setShowCursor(true);
            
            // Restart typing sequence
            setDisplayedText("");
            index = 0;
            typeTimeout = setTimeout(typeNextChar, speed);
          }
        }, 500);
      }
    };

    // Start initial typing
    typeTimeout = setTimeout(typeNextChar, speed);

    return () => {
      isCancelled = true;
      clearTimeout(typeTimeout);
      clearInterval(blinkInterval);
    };
  }, [text, speed]);

  return (
    <span className="font-mono text-emerald-400">
      <span className="text-zinc-500 mr-2 opacity-70">~$</span>
      {displayedText}
      <span
        className="inline-block bg-emerald-400 ml-1"
        style={{ 
          width: "0.6em",
          height: "1.1em", 
          verticalAlign: "bottom", 
          marginBottom: "-0.1em",
          opacity: showCursor ? 1 : 0,
          transition: "opacity 100ms ease-in-out"
        }}
      />
    </span>
  );
}
