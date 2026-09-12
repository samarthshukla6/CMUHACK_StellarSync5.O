/**
 * Hook for managing chat state and operations
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { streamText } from "ai";
import { transformersJS } from "@built-in-ai/transformers-js";
import { isWebLLMReady, prepareWebLLMSession } from "@/lib/ai/webllm-session";
import { ensureTransformersJSWorker } from "@/lib/ai/transformers-session";
import { ChatMessage } from "@/studio/_components/features/chat/types";
import { ModelPreset } from "@/lib/ai/models";

interface UseChatProps {
  activeSection: string;
  selectedPreset: ModelPreset;
  effectiveSystemPrompt: string;
  webLLMSupported: boolean | null;
  transformersJSSupported: boolean | null;
  transformersJSWorkerRef: React.MutableRefObject<Worker | null>;
  visionModelRef: React.MutableRefObject<ReturnType<typeof import("@built-in-ai/transformers-js").transformersJS> | null>;
  visionImage: string | null;
  modelId: string;
  ensureModelReady: (signal?: AbortSignal) => Promise<void>;
  setModelLoading: (loading: boolean) => void;
  setModelProgress: (progress: number) => void;
  setWebLLMStatus: (status: string) => void;
  isFeatureDisabled: boolean;
  incrementQueryCount: () => void;
}

export function useChat({
  activeSection,
  selectedPreset,
  effectiveSystemPrompt,
  webLLMSupported,
  transformersJSSupported,
  transformersJSWorkerRef,
  visionModelRef,
  visionImage,
  modelId,
  ensureModelReady,
  setModelLoading,
  setModelProgress,
  setWebLLMStatus,
  incrementQueryCount,
}: UseChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamController, setStreamController] = useState<AbortController | null>(null);
  const chatFeedRef = useRef<HTMLDivElement | null>(null);
  const previousSectionRef = useRef<string>(activeSection);

  const resetChat = useCallback(() => {
    setStreamController((current) => {
      if (current) {
        current.abort();
      }
      return null;
    });
    setPending(false);
    setMessages([]);
    setInput("");
  }, []);

  // Reset chat when switching between chat and vision sections
  useEffect(() => {
    const previous = previousSectionRef.current;
    if (
      (previous === "chat" && activeSection === "vision") ||
      (previous === "vision" && activeSection === "chat")
    ) {
      resetChat();
    }
    previousSectionRef.current = activeSection;
  }, [activeSection, resetChat]);

  async function runWebLLMChat(newMessages: ChatMessage[], controller: AbortController) {
    if (!webLLMSupported) {
      throw new Error("WebGPU/WebLLM not supported in this browser");
    }

    const needsLoad = !isWebLLMReady(selectedPreset.modelId);
    if (needsLoad) {
      setModelLoading(true);
      setModelProgress(1);
      setWebLLMStatus("Loading model…");
    }
    let model;
    try {
      model = await prepareWebLLMSession(selectedPreset.modelId, (progress) => {
        const pct = Math.round(progress.progress * 100);
        setModelProgress(Math.max(1, Math.min(100, pct)));
        setWebLLMStatus(progress.text || "Loading model…");
      });
    } finally {
      if (needsLoad) setModelLoading(false);
    }

    setWebLLMStatus("Generating…");
    const modelMessages = newMessages.map((m) => ({
      role: m.role === "tool" ? "assistant" : m.role,
      content: m.content,
    }));

    const result = streamText({ model, messages: modelMessages, abortSignal: controller.signal });

    let acc = "";
    let firstChunk = true;
    for await (const delta of result.textStream) {
      if (firstChunk) {
        setIsProcessing(false);
        firstChunk = false;
      }
      acc += delta;
      setMessages(() => [...newMessages, { role: "assistant", content: acc }]);
    }
    setWebLLMStatus("");
  }

  async function runClientVisionChat(newMessages: ChatMessage[], controller: AbortController) {
    if (!transformersJSSupported) {
      throw new Error("WebGPU/Transformers.js not supported in this browser");
    }
    if (!visionImage) {
      throw new Error("Image required for vision model");
    }

    let model = visionModelRef.current;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const needsNewModel = !model || (model as any).modelId !== selectedPreset.modelId;

    if (needsNewModel) {
      setModelLoading(true);
      setModelProgress(1);
      setWebLLMStatus("Downloading vision model…");

      if (!navigator.gpu) {
        throw new Error("WebGPU is not available in this browser. Please use a browser that supports WebGPU (Chrome 113+, Edge 113+, or Safari 18.1+).");
      }

      transformersJSWorkerRef.current = await ensureTransformersJSWorker();

      model = transformersJS(selectedPreset.modelId, {
        isVisionModel: true,
        device: "webgpu",
        worker: transformersJSWorkerRef.current,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (model as any).modelId = selectedPreset.modelId;
      visionModelRef.current = model;

      try {
        const availability = await model.availability();
        if (availability !== "available") {
          await model.createSessionWithProgress?.((progress: { progress: number; text?: string } | number) => {
            const pct = typeof progress === "number"
              ? Math.round(progress * 100)
              : Math.round(progress.progress * 100);
            setModelProgress(Math.max(1, Math.min(100, pct)));
            if (typeof progress !== "number" && progress.text) {
              setWebLLMStatus(progress.text);
            }
          });
        }
      } catch (error) {
        // A failed download must not leave a stale model cached for the next attempt.
        visionModelRef.current = null;
        throw error;
      } finally {
        setModelLoading(false);
      }
    }

    if (!model) {
      throw new Error("Model not initialized");
    }

    const modelMessages = newMessages.map((m) => {
      if (m.role === "user") {
        const enhancedPrompt = m.content.trim() 
          ? `${m.content}\n\nPlease provide a detailed visual analysis of this image. Focus on understanding what the image shows, its structure, layout, design, and meaning. Describe visual elements, relationships, and context. Mention text content in context of understanding what the image represents.`
          : "Please provide a detailed visual analysis of this image. Describe what the image shows and means - its visual structure, layout, design elements, colors, and overall purpose. Break down the image systematically: start with what it represents, then describe the visual structure and layout, then mention content in context of understanding. Focus on visual understanding and meaning, not just text transcription.";
        
        return {
          role: m.role,
          content: [
            { type: "text", text: enhancedPrompt },
            { type: "image", image: visionImage },
          ],
        };
      }
      return {
        role: m.role === "tool" ? "assistant" : m.role,
        content: m.content,
      };
    });

    const result = streamText({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: model as any, // transformers.js model type not fully compatible with AI SDK
      system: effectiveSystemPrompt,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: modelMessages as any, // transformers.js message format
      abortSignal: controller.signal,
      temperature: 0.7,
    });

    let acc = "";
    let firstChunk = true;
    for await (const delta of result.textStream) {
      if (firstChunk) {
        setIsProcessing(false);
        firstChunk = false;
      }
      acc += delta;
      setMessages(() => [...newMessages, { role: "assistant", content: acc }]);
    }
  }

  async function runServerChat(newMessages: ChatMessage[], controller: AbortController) {
    const transformedMessages =
      activeSection === "vision" && visionImage
        ? newMessages.map((m) =>
            m.role === "user"
              ? {
                  ...m,
                  content: [
                    { type: "text", text: m.content },
                    { type: "image", image: visionImage },
                  ],
                }
              : m,
          )
        : newMessages;

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: transformedMessages,
        modelId,
        systemPrompt: effectiveSystemPrompt,
      }),
      signal: controller.signal,
    });

    if (!res.ok || !res.body) {
      throw new Error(`Server error: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let acc = "";
    let firstChunk = true;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const decoded = decoder.decode(value, { stream: true });
        if (firstChunk && decoded.trim()) {
          setIsProcessing(false);
          firstChunk = false;
        }
        acc += decoded;
        setMessages(() => [
          ...newMessages,
          { role: "assistant", content: acc },
        ]);
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        throw error;
      }
    }
  }

  async function sendChat(
    promptOverride?: string,
    options: { preserveInput?: boolean } = { preserveInput: false },
  ) {
    if (pending) return;
    
    // AUTH DISABLED: no query cap, so the limit gate below is removed.
    // if (isFeatureDisabled) {
    //   setMessages((prev) => [
    //     ...prev,
    //     { role: "assistant", content: "You've reached the limit of 10 queries. Please login to continue using all features." },
    //   ]);
    //   return;
    // }

    const content = promptOverride ?? input;
    const trimmed = content.trim();
    if (!trimmed) return;
    if (activeSection === "vision" && !visionImage) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Please add an image to use the vision model." },
      ]);
      return;
    }
    
    incrementQueryCount();
    
    setPending(true);
    setIsProcessing(true);

    const userMessage: ChatMessage = { role: "user", content: trimmed };

    const payload = [...messages, userMessage];
    setMessages(payload);
    if (options.preserveInput) {
      setInput(trimmed);
    } else {
      setInput("");
    }

    const controller = new AbortController();
    setStreamController(controller);

    try {
      const presetKind = selectedPreset.kind;
      if (presetKind === "webllm") {
        await runWebLLMChat(payload, controller);
      } else if (presetKind === "vision") {
        if (!transformersJSSupported) {
          throw new Error("WebGPU/Transformers.js is required for vision models. Please use a browser that supports WebGPU.");
        }
        await runClientVisionChat(payload, controller);
      } else {
        await ensureModelReady(controller.signal);
        await runServerChat(payload, controller);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${(err as Error).message}` },
      ]);
    } finally {
      setPending(false);
      setIsProcessing(false);
      setModelLoading(false);
      setWebLLMStatus("");
      setStreamController(null);
    }
  }

  const processingText = useMemo(() => {
    return activeSection === "vision" ? "Image is being processed..." : "Response is being processed...";
  }, [activeSection]);

  function stop() {
    if (streamController) {
      streamController.abort();
    }
    setPending(false);
  }

  return {
    messages,
    setMessages,
    input,
    setInput,
    pending,
    isProcessing,
    setIsProcessing,
    streamController,
    chatFeedRef,
    resetChat,
    sendChat,
    stop,
    processingText,
  };
}

