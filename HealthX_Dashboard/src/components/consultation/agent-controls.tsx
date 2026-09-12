"use client";

import { AVATARS } from "@/config/avatars";
import type { Avatar, VoiceSessionError } from "@/types";

interface AgentControlsProps {
  selectedAvatar: Avatar;
  onSelectAvatar: (avatar: Avatar) => void;
  isCallActive: boolean;
  connecting: boolean;
  voiceReady: boolean;
  onStartCall: () => void;
  onEndCall: () => void;
  error: VoiceSessionError | null;
}

export function AgentControls({
  selectedAvatar,
  onSelectAvatar,
  isCallActive,
  connecting,
  voiceReady,
  onStartCall,
  onEndCall,
  error,
}: AgentControlsProps) {
  return (
    <div className="flex-shrink-0">
      {!isCallActive && (
        <div className="pt-3 border-t border-slate-100">
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-2 text-center">
            Pick your avatar
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            {AVATARS.map((avatar) => {
              const selected =
                selectedAvatar.gender === avatar.gender && selectedAvatar.age === avatar.age;
              return (
                <button
                  key={`${avatar.gender}-${avatar.age}`}
                  type="button"
                  onClick={() => onSelectAvatar(avatar)}
                  title={avatar.label}
                  className={`rounded-xl p-1.5 border-2 transition-all hover:scale-105 ${
                    selected
                      ? "border-indigo-500 bg-indigo-50 shadow-sm"
                      : "border-transparent bg-slate-50 hover:border-slate-200"
                  }`}
                >
                  <img
                    src={avatar.src}
                    alt={avatar.label}
                    className="h-8 w-8 object-contain"
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-col items-center gap-2">
        {!isCallActive ? (
          <>
            <button
              type="button"
              onClick={onStartCall}
              disabled={connecting || !voiceReady}
              className="w-full max-w-xs px-5 py-2 rounded-full bg-indigo-600 text-white text-sm font-medium shadow-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {connecting ? "Connecting…" : "Start planning"}
            </button>
            {!voiceReady && (
              <p className="text-[10px] text-slate-400">Initializing voice agent…</p>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={onEndCall}
            className="w-full max-w-xs px-5 py-2 rounded-full bg-red-500 text-white text-sm font-medium shadow-md hover:bg-red-600 transition-colors"
          >
            End session
          </button>
        )}
        {error && (
          <p className="text-xs text-red-600 truncate max-w-full" title={error.message}>
            {error.userMessage ?? error.message}
          </p>
        )}
      </div>
    </div>
  );
}
