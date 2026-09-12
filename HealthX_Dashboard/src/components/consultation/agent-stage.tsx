"use client";

import { AI_ASSISTANT_NAME } from "@/config/assistant";
import {
  ConsultationBridge,
  IdleDoctorOrb,
  ActiveDoctorOrb,
} from "@/components/consultation/consultation-bridge";
import type { Avatar } from "@/types";

interface AgentStageProps {
  selectedAvatar: Avatar;
  isCallActive: boolean;
  assistantIsSpeaking: boolean;
  volumeLevel: number;
}

export function AgentStage({
  selectedAvatar,
  isCallActive,
  assistantIsSpeaking,
  volumeLevel,
}: AgentStageProps) {
  const userSpeaking = isCallActive && !assistantIsSpeaking && volumeLevel > 0.05;

  return (
    <div className="flex-shrink-0 flex items-center justify-center gap-1">
      <div className="flex flex-col items-center w-[34%] max-w-[140px]">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-cyan-600 mb-1">
          You
        </span>
        <div
          className={`relative rounded-xl bg-gradient-to-b from-cyan-50 to-white border p-2 w-full flex items-end justify-center transition-transform duration-300 ${
            userSpeaking
              ? "border-cyan-300 ring-2 ring-cyan-200/60 scale-[1.02]"
              : "border-cyan-100"
          }`}
        >
          <img
            src={selectedAvatar.src}
            alt="Your traveler avatar"
            className="h-16 object-contain object-bottom mx-auto"
          />
        </div>
      </div>

      <ConsultationBridge
        active={isCallActive}
        assistantIsSpeaking={assistantIsSpeaking}
        userSpeaking={userSpeaking}
      />

      <div className="flex flex-col items-center w-[34%] max-w-[140px]">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-indigo-600 mb-1">
          {AI_ASSISTANT_NAME}
        </span>
        <div
          className={`relative flex items-center justify-center rounded-xl bg-gradient-to-b from-indigo-50 to-white border p-2 w-full min-h-[90px] transition-transform duration-300 ${
            assistantIsSpeaking && isCallActive
              ? "border-indigo-300 ring-2 ring-indigo-200/60 scale-[1.02]"
              : "border-indigo-100"
          }`}
        >
          <div className="scale-[0.75] origin-center">
            {isCallActive ? (
              <ActiveDoctorOrb
                assistantIsSpeaking={assistantIsSpeaking}
                volumeLevel={volumeLevel}
                size={100}
              />
            ) : (
              <IdleDoctorOrb size={80} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
