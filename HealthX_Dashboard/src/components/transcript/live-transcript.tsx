"use client";

import { useEffect, useRef } from "react";
import { AI_ASSISTANT_NAME } from "@/config/assistant";
import type { TranscriptEntry } from "@/types";

interface LiveTranscriptProps {
  transcript: TranscriptEntry[];
}

export function LiveTranscript({ transcript }: LiveTranscriptProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <div
      ref={containerRef}
      className="h-full min-h-0 overflow-y-auto text-gray-600 space-y-2 pr-1 scrollbar-hide"
    >
      {transcript.length === 0 ? (
        <p className="text-slate-400 italic text-xs">
          Atlas will write the plan here as you speak...
        </p>
      ) : (
        transcript.map((entry, index) => (
          <div
            key={`${index}-${entry.text.slice(0, 24)}`}
            className={`p-2 rounded-lg text-xs ${
              entry.role === "user"
                ? "bg-slate-50 border border-slate-100"
                : "bg-indigo-50/70 border border-indigo-100"
            }`}
          >
            <p className="break-words">
              <span
                className={`font-medium ${
                  entry.role === "user" ? "text-slate-800" : "text-indigo-800"
                }`}
              >
                {entry.role === "user" ? "You" : AI_ASSISTANT_NAME}:
              </span>{" "}
              <span className="text-slate-600">{entry.text}</span>
            </p>
          </div>
        ))
      )}
      <div ref={endRef} />
    </div>
  );
}
