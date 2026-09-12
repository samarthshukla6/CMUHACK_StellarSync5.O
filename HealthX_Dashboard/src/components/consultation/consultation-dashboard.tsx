"use client";

import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import { useVoiceSession } from "@/hooks/use-voice-session";
import { useConsultationReport } from "@/hooks/use-consultation-report";
import { ConsultationScene } from "@/components/consultation/consultation-scene";
import { AgentStage } from "@/components/consultation/agent-stage";
import { AgentControls } from "@/components/consultation/agent-controls";
import { DashboardPanel } from "@/components/layout/dashboard-panel";
import { LiveTranscript } from "@/components/transcript/live-transcript";
import { findAvatar } from "@/config/avatars";
import { FEATURES, DEFAULT_FEATURE_ID, findFeature } from "@/config/features";

export function ConsultationDashboard() {
  const [isClient, setIsClient] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(() => findAvatar("male", "teenager"));
  const [activeFeatureId, setActiveFeatureId] = useState(DEFAULT_FEATURE_ID);
  const activeFeature = findFeature(activeFeatureId);

  const {
    isReady,
    connecting,
    connected,
    assistantIsSpeaking,
    volumeLevel,
    transcript,
    error,
    startCall,
    endCall,
  } = useVoiceSession();

  const { report, isGenerating, generateReportFromTranscript } = useConsultationReport(
    connected,
    transcript
  );

  const isCallActive = connecting || connected;

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse h-8 w-48 bg-slate-200 rounded" />
      </div>
    );
  }

  return (
    <div className="h-full min-w-0 lg:min-w-[880px] p-2 lg:p-3 grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3 overflow-y-auto lg:overflow-hidden">
      <div className="lg:col-span-8 min-h-0 lg:min-h-[480px]">
        <ConsultationScene
          isCallActive={isCallActive}
          transcript={transcript}
          report={report}
          isGeneratingReport={isGenerating}
          onGenerateReport={generateReportFromTranscript}
          features={FEATURES}
          activeFeature={activeFeature}
          onSelectFeature={setActiveFeatureId}
        />
      </div>

      <div className="hidden lg:flex lg:col-span-4 min-h-0 flex-col">
        <DashboardPanel
          title="Live Transcript"
          icon={<Radio className="h-4 w-4" />}
          subtitle={
            isCallActive
              ? "Conversation in progress"
              : transcript.length
              ? "Previous session"
              : "Waiting to start"
          }
        >
          <div className="h-full min-h-0 flex flex-col gap-3">
            <AgentStage
              selectedAvatar={selectedAvatar}
              isCallActive={isCallActive}
              assistantIsSpeaking={assistantIsSpeaking}
              volumeLevel={volumeLevel}
            />
            <AgentControls
              selectedAvatar={selectedAvatar}
              onSelectAvatar={setSelectedAvatar}
              isCallActive={isCallActive}
              connecting={connecting}
              voiceReady={isReady}
              onStartCall={startCall}
              onEndCall={endCall}
              error={error}
            />
            <div className="flex-1 min-h-0 pt-3 border-t border-slate-100">
              <LiveTranscript transcript={transcript} />
            </div>
          </div>
        </DashboardPanel>
      </div>
    </div>
  );
}
