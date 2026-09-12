/**
 * Hook for managing model state and operations
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { doesBrowserSupportWebLLM } from "@built-in-ai/web-llm";
import { doesBrowserSupportTransformersJS } from "@built-in-ai/transformers-js";
import { MODEL_PRESETS, ModelPreset, buildDomainSystemPrompt } from "@/lib/ai/models";
import { bootWebLLMRuntime, getWebLLMWorker } from "@/lib/ai/webllm-session";
import { bootTransformersRuntime, getTransformersJSWorker } from "@/lib/ai/transformers-session";

export function useModel(activeSection: string) {
  const [modelId, setModelId] = useState<string>(
    MODEL_PRESETS.find((p) => p.id === "k2-horizon-3.7b")?.id ??
    MODEL_PRESETS.find((p) => p.kind === "webllm")?.id ??
    MODEL_PRESETS[0].id,
  );
  const [modelLoading, setModelLoading] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);
  const [webLLMSupported, setWebLLMSupported] = useState<boolean | null>(null);
  const [webLLMStatus, setWebLLMStatus] = useState<string>("");
  const [transformersJSSupported, setTransformersJSSupported] = useState<boolean | null>(null);
  
  const webLLMWorkerRef = useRef<Worker | null>(null);
  const transformersJSWorkerRef = useRef<Worker | null>(null);
  const visionModelRef = useRef<ReturnType<typeof import("@built-in-ai/transformers-js").transformersJS> | null>(null);
  const previousSectionRef = useRef<string>(activeSection);
  
  // Store last selected model for each section
  const lastModelBySectionRef = useRef<Record<string, string>>({
    chat: MODEL_PRESETS.find((p) => p.id === "k2-horizon-3.7b")?.id ?? MODEL_PRESETS.find((p) => p.kind === "webllm")?.id ?? MODEL_PRESETS[0].id,
    vision: MODEL_PRESETS.find((p) => p.id === "smolvlm2-500m-general")?.id ?? 
            MODEL_PRESETS.find((p) => p.kind === "vision")?.id ?? 
            MODEL_PRESETS[0].id,
  });

  // Auto-switch model when section changes
  useEffect(() => {
    const sectionKey = activeSection === "home" ? "chat" : activeSection;
    const targetKind = sectionKey === "vision" ? "vision" : "webllm";
    const currentPreset = MODEL_PRESETS.find((p) => p.id === modelId);
    const isValidForSection = currentPreset?.kind === targetKind;

    if (!isValidForSection) {
      const lastModelForSection = lastModelBySectionRef.current[sectionKey];
      const modelToUse =
        lastModelForSection ||
        MODEL_PRESETS.find((p) => p.kind === targetKind)?.id ||
        MODEL_PRESETS[0].id;
      setModelId(modelToUse);
      lastModelBySectionRef.current[sectionKey] = modelToUse;
    } else {
      lastModelBySectionRef.current[sectionKey] = modelId;
    }

    previousSectionRef.current = activeSection;
  }, [activeSection, modelId]);

  // Boot the worker on hydrate so webpack compiles it before the first message.
  // If the selected preset is a WebLLM model, start downloading weights in the
  // background — the chat path joins this same in-flight promise.
  useEffect(() => {
    const supported = doesBrowserSupportWebLLM();
    setWebLLMSupported(supported);
    if (!supported) return;
    const preset = MODEL_PRESETS.find((p) => p.id === modelId);
    if (preset?.kind === "webllm") {
      webLLMWorkerRef.current = getWebLLMWorker();
      bootWebLLMRuntime(preset.modelId);
    }
  }, [modelId]);

  useEffect(() => {
    const supported = doesBrowserSupportTransformersJS();
    setTransformersJSSupported(supported);
    if (!supported || activeSection !== "vision") return;
    transformersJSWorkerRef.current = getTransformersJSWorker();
    bootTransformersRuntime();
  }, [activeSection]);

  const selectedPreset: ModelPreset = useMemo(
    () => MODEL_PRESETS.find((p) => p.id === modelId) ?? MODEL_PRESETS[0],
    [modelId],
  );

  const systemPrompt = useMemo(
    () => buildDomainSystemPrompt(selectedPreset.domain, selectedPreset.isVision),
    [selectedPreset],
  );

  async function ensureModelReady(signal?: AbortSignal) {
    setModelLoading(true);
    setModelProgress(1);
    const res = await fetch("/api/model/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId }),
      signal,
    });
    if (!res.ok || !res.body) {
      setModelLoading(false);
      throw new Error(`Model load failed (${res.status})`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const parts = chunk.trim().split("\n");
      parts.forEach((line) => {
        const pct = Number(line);
        if (!Number.isNaN(pct)) {
          setModelProgress(Math.max(1, Math.min(100, pct)));
        }
      });
    }
    setModelLoading(false);
  }

  return {
    modelId,
    setModelId,
    modelLoading,
    setModelLoading,
    modelProgress,
    setModelProgress,
    webLLMSupported,
    webLLMStatus,
    setWebLLMStatus,
    transformersJSSupported,
    selectedPreset,
    systemPrompt,
    webLLMWorkerRef,
    transformersJSWorkerRef,
    visionModelRef,
    ensureModelReady,
  };
}

