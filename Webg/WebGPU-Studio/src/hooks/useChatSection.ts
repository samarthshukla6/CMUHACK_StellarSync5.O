/**
 * Section-scoped hook for chat and vision pages.
 * Runs only useAuth, useModel, useVision, useChat.
 */

import { useAuth } from "./useAuth";
import { useModel } from "./useModel";
import { useChat } from "./useChat";
import { useVision } from "./useVision";

export function useChatSection(activeSection: string) {
  const auth = useAuth();
  const model = useModel(activeSection);
  const vision = useVision();

  const defaultSystemPrompt =
    model.systemPrompt ??
    "You are WebGPU Studio, a concise local-first copilot. Be clear, structured, and brief.";
  const effectiveSystemPrompt = defaultSystemPrompt;

  const chat = useChat({
    activeSection,
    selectedPreset: model.selectedPreset,
    effectiveSystemPrompt,
    webLLMSupported: model.webLLMSupported,
    transformersJSSupported: model.transformersJSSupported,
    transformersJSWorkerRef: model.transformersJSWorkerRef,
    visionModelRef: model.visionModelRef,
    visionImage: vision.visionImage,
    modelId: model.modelId,
    ensureModelReady: model.ensureModelReady,
    setModelLoading: model.setModelLoading,
    setModelProgress: model.setModelProgress,
    setWebLLMStatus: model.setWebLLMStatus,
    isFeatureDisabled: auth.isFeatureDisabled,
    incrementQueryCount: auth.incrementQueryCount,
  });

  return {
    activeSection,
    auth,
    model,
    vision,
    chat,
  };
}
