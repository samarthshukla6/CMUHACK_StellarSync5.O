"use client";

import { VoiceOrb } from "@/components/voice/voice-orb";

interface FlowDotProps {
  direction: "to-patient" | "to-doctor";
  delay: number;
}

function FlowDot({ direction, delay }: FlowDotProps) {
  const animClass =
    direction === "to-patient"
      ? "consultation-dot-to-patient"
      : "consultation-dot-to-doctor";

  return (
    <span
      className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full consultation-flow-dot ${animClass} ${
        direction === "to-patient" ? "bg-indigo-400" : "bg-cyan-400"
      }`}
      style={{ animationDelay: `${delay}s` }}
    />
  );
}

interface ConsultationBridgeProps {
  active: boolean;
  assistantIsSpeaking: boolean;
  userSpeaking: boolean;
}

export function ConsultationBridge({
  active,
  assistantIsSpeaking,
  userSpeaking,
}: ConsultationBridgeProps) {
  const direction = assistantIsSpeaking
    ? "to-patient"
    : userSpeaking
    ? "to-doctor"
    : "idle";

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-2 min-w-[80px] max-w-[200px]">
      <div className="relative w-full h-8 flex items-center">
        <div
          className={`w-full h-0.5 rounded-full transition-colors duration-500 ${
            active
              ? "bg-gradient-to-r from-cyan-200 via-indigo-300 to-indigo-200"
              : "bg-slate-200"
          }`}
        />
        {active && direction !== "idle" && (
          <>
            <FlowDot direction={direction} delay={0} />
            <FlowDot direction={direction} delay={0.35} />
            <FlowDot direction={direction} delay={0.7} />
          </>
        )}
      </div>
      <p className="text-[10px] text-slate-500 mt-2 text-center leading-tight">
        {!active
          ? "Choose your avatar, then start"
          : assistantIsSpeaking
          ? "Atlas is speaking"
          : userSpeaking
          ? "You are speaking"
          : "Listening…"}
      </p>
    </div>
  );
}

export function IdleDoctorOrb({ size = 100 }: { size?: number }) {
  return (
    <div
      className="rounded-full shadow-lg flex items-center justify-center"
      style={{
        width: size,
        height: size,
        background:
          "radial-gradient(circle at 30% 30%, rgba(99,102,241,0.85) 0%, rgba(129,140,248,0.75) 55%, rgba(165,180,252,0.65) 100%)",
      }}
    >
      <div className="w-[70%] h-[70%] rounded-full bg-white/10 blur-sm" />
    </div>
  );
}

interface ActiveDoctorOrbProps {
  assistantIsSpeaking: boolean;
  volumeLevel: number;
  size?: number;
}

export function ActiveDoctorOrb({
  assistantIsSpeaking,
  volumeLevel,
  size = 120,
}: ActiveDoctorOrbProps) {
  return (
    <div className="flex flex-col items-center">
      <VoiceOrb
        sphereOnly
        size={size}
        assistantIsSpeaking={assistantIsSpeaking}
        volumeLevel={volumeLevel}
      />
    </div>
  );
}
