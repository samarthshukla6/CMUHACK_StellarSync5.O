"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Conversation } from "@elevenlabs/client";
import { ASSISTANT_OPTIONS } from "@/config/assistant";
import { buildSessionContext } from "@/lib/voice/session-context";
import { ELEVENLABS_AGENT_ID } from "@/config/env.client";
import type { TranscriptEntry, VoiceSessionError } from "@/types";

const AGENT_ID = ELEVENLABS_AGENT_ID;

function upsertTranscriptEntry(entries: TranscriptEntry[], nextEntry: TranscriptEntry) {
  const lastIndex = entries.length - 1;
  const last = lastIndex >= 0 ? entries[lastIndex] : null;

  if (last && last.role === nextEntry.role && last.type === "partial") {
    entries[lastIndex] = nextEntry;
    return;
  }

  entries.push(nextEntry);
}

export function useVoiceSession() {
  const [isReady, setIsReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [assistantIsSpeaking, setAssistantIsSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<VoiceSessionError | null>(null);

  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const conversationRef = useRef<Awaited<ReturnType<typeof Conversation.startSession>> | null>(null);
  const volumeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speakingRef = useRef(false);

  const stopVolumePolling = useCallback(() => {
    if (volumeTimerRef.current) {
      clearInterval(volumeTimerRef.current);
      volumeTimerRef.current = null;
    }
    setVolumeLevel(0);
  }, []);

  const startVolumePolling = useCallback(
    (conversation: NonNullable<typeof conversationRef.current>) => {
      stopVolumePolling();
      volumeTimerRef.current = setInterval(async () => {
        try {
          const level = speakingRef.current
            ? await conversation.getOutputVolume()
            : await conversation.getInputVolume();
          setVolumeLevel(typeof level === "number" ? level : 0);
        } catch {
          setVolumeLevel(0);
        }
      }, 80);
    },
    [stopVolumePolling]
  );

  const handleCallStart = useCallback(() => {
    setConnecting(false);
    setConnected(true);
    setError(null);
    transcriptRef.current = [];
    setTranscript([]);
  }, []);

  const handleCallEnd = useCallback(() => {
    setConnecting(false);
    setConnected(false);
    setAssistantIsSpeaking(false);
    speakingRef.current = false;
    stopVolumePolling();
    conversationRef.current = null;
  }, [stopVolumePolling]);

  const handleError = useCallback(
    (err: unknown, context?: string) => {
      const errorMessage =
        typeof err === "string"
          ? err
          : err instanceof Error
          ? err.message
          : context ?? "An unspecified ElevenLabs error occurred.";

      const specificError = err instanceof Error ? err : new Error(errorMessage);
      (specificError as VoiceSessionError).userMessage = errorMessage;

      setError(specificError as VoiceSessionError);
      setConnecting(false);
      setConnected(false);
      speakingRef.current = false;
      stopVolumePolling();
    },
    [stopVolumePolling]
  );

  const handleMessage = useCallback((message: { message?: string; text?: string; role?: string; source?: string }) => {
    const text = message?.message || message?.text || "";
    if (!text) return;

    const role = message.role === "user" || message.source === "user" ? "user" : "assistant";
    upsertTranscriptEntry(transcriptRef.current, {
      role,
      text,
      type: "final",
      timestamp: new Date(),
    });
    setTranscript([...transcriptRef.current]);
  }, []);

  useEffect(() => {
    setIsReady(Boolean(AGENT_ID));

    return () => {
      stopVolumePolling();
      conversationRef.current?.endSession().catch(() => {});
      conversationRef.current = null;
    };
  }, [stopVolumePolling]);

  const startCall = useCallback(async () => {
    if (conversationRef.current) return;

    if (!AGENT_ID) {
      handleError(new Error("Missing NEXT_PUBLIC_ELEVENLABS_AGENT_ID in .env"));
      return;
    }

    setConnecting(true);
    setConnected(false);
    setError(null);

    try {
      const conversation = await Conversation.startSession({
        agentId: AGENT_ID,
        connectionType: "websocket",
        onConnect: handleCallStart,
        onDisconnect: (details) => {
          if (details?.reason === "error") {
            handleError(new Error(details.message || "Voice connection closed unexpectedly."));
          }
          handleCallEnd();
        },
        onMessage: handleMessage,
        onModeChange: ({ mode }) => {
          const speaking = mode === "speaking";
          speakingRef.current = speaking;
          setAssistantIsSpeaking(speaking);
        },
        onStatusChange: ({ status }) => {
          if (status === "connecting") {
            setConnecting(true);
            setConnected(false);
          }
          if (status === "connected") handleCallStart();
          if (status === "disconnected") {
            setConnecting(false);
            setConnected(false);
          }
        },
        onError: (message) => handleError(message),
        onDebug: (payload) => {
          if (payload?.type === "tentative_agent_response" && payload.response) {
            upsertTranscriptEntry(transcriptRef.current, {
              role: "assistant",
              text: payload.response,
              type: "partial",
              timestamp: new Date(),
            });
            setTranscript([...transcriptRef.current]);
          }
        },
      });

      conversationRef.current = conversation;

      const sessionContext = buildSessionContext(ASSISTANT_OPTIONS);
      if (sessionContext) {
        conversation.sendContextualUpdate(sessionContext);
      }

      handleCallStart();
      startVolumePolling(conversation);
    } catch (err) {
      handleError(err);
    }
  }, [handleCallEnd, handleCallStart, handleError, handleMessage, startVolumePolling]);

  const endCall = useCallback(() => {
    conversationRef.current?.endSession().catch(() => {});
    conversationRef.current = null;
    handleCallEnd();
  }, [handleCallEnd]);

  return {
    isReady,
    connecting,
    connected,
    assistantIsSpeaking,
    volumeLevel,
    transcript,
    error,
    startCall,
    endCall,
  };
}
