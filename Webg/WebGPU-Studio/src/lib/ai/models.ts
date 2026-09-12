import { transformersJS } from "@built-in-ai/transformers-js";

export type ModelKind = "text" | "vision" | "embedding" | "webllm";

export type ModelPreset = {
  id: string;
  label: string;
  kind: ModelKind;
  domain?: string;
  modelId: string;
  isVision?: boolean;
};

// Core model IDs (kept small for browser use).
// All chat models use WebLLM (WebGPU) with MLC format for browser-based inference
export const MODEL_IDS = {
  // Llama 3.2 series - MLC format for WebGPU
  llama32_3b_mlc: "Llama-3.2-3B-Instruct-q4f16_1-MLC",

  // Qwen series - MLC format for WebGPU
  qwen25_0_5b_mlc: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",

  // Vision models - Open source, publicly accessible models optimized for WebGPU
  // SmolVLM is the most reliable publicly accessible option for transformers.js
  smolVLM256: "HuggingFaceTB/SmolVLM-256M-Instruct",
  
  // SmolVLM2 500M - Larger, more capable version with better visual understanding
  // This model works well and provides better responses than the 256M version
  smolVLM2_500M: "HuggingFaceTB/SmolVLM2-500M-Instruct",
  
  // Note: transformers.js has very limited vision model support
  // Most alternative vision models either:
  // - Require authorization (not publicly accessible)
  // - Are not available in ONNX format
  // - Are not yet supported by transformers.js
  // SmolVLM2 500M is currently the best working option for efficient WebGPU inference
  
  // Utility models
  gteSmall: "Supabase/gte-small",
} as const;

export const MODEL_PRESETS: ModelPreset[] = [
  // ========== CHAT MODELS (WebLLM/WebGPU) ==========
  // All chat models use WebLLM for browser-based WebGPU inference
  { id: "k2-horizon-3.7b", label: "IFM/K2-Horizon-3.7B", kind: "webllm", modelId: MODEL_IDS.llama32_3b_mlc },
  { id: "k2-horizon-0.9b", label: "IFM/K2-Horizon-0.9B", kind: "webllm", modelId: MODEL_IDS.qwen25_0_5b_mlc },

  // ========== VISION MODELS - Grouped by base model ==========
  
  // SmolVLM2 500M - Optimized for WebGPU, provides better visual understanding
  // This is the recommended model for fast, efficient vision inference
  { id: "smolvlm2-500m-general", label: "SmolVLM2 500M (General Vision) ⚡", kind: "vision", modelId: MODEL_IDS.smolVLM2_500M, isVision: true },
  { id: "smolvlm2-500m-docs", label: "SmolVLM2 500M (Document Analysis) ⚡", kind: "vision", domain: "docs", modelId: MODEL_IDS.smolVLM2_500M, isVision: true },
  { id: "smolvlm2-500m-product", label: "SmolVLM2 500M (Product Recognition) ⚡", kind: "vision", domain: "product", modelId: MODEL_IDS.smolVLM2_500M, isVision: true },
  
  // SmolVLM 256M - Smaller model (fallback option)
  { id: "smolvlm-general", label: "SmolVLM 256M (General Vision)", kind: "vision", modelId: MODEL_IDS.smolVLM256, isVision: true },
  { id: "smolvlm-medical", label: "SmolVLM 256M (Medical Imaging)", kind: "vision", domain: "medical", modelId: MODEL_IDS.smolVLM256, isVision: true },
  { id: "smolvlm-docs", label: "SmolVLM 256M (Document Analysis)", kind: "vision", domain: "docs", modelId: MODEL_IDS.smolVLM256, isVision: true },
  { id: "smolvlm-product", label: "SmolVLM 256M (Product Recognition)", kind: "vision", domain: "product", modelId: MODEL_IDS.smolVLM256, isVision: true },
  { id: "smolvlm-safety", label: "SmolVLM 256M (Safety & Security)", kind: "vision", domain: "safety", modelId: MODEL_IDS.smolVLM256, isVision: true },

  // ========== UTILITY MODELS ==========
  { id: "embed-gte-small", label: "Embeddings (gte-small)", kind: "embedding", modelId: MODEL_IDS.gteSmall },
];

export function buildDomainSystemPrompt(domain?: string, isVision?: boolean) {
  if (!domain && !isVision) return undefined;
  
  // Enhanced system prompt for vision models - emphasizes visual understanding over text transcription
  if (isVision) {
    const basePrompt = `You are an expert vision-language model specialized in providing detailed, comprehensive visual analysis and understanding.

CRITICAL INSTRUCTIONS - FOCUS ON VISUAL UNDERSTANDING:
- You MUST provide extensive, detailed descriptions - never give brief or one-line responses
- PRIMARY FOCUS: Visual analysis - describe layout, structure, design, colors, visual hierarchy, relationships between elements
- SECONDARY FOCUS: Text content - mention text in context of understanding what the image shows and means, not as verbatim transcription
- Understand and describe what the image REPRESENTS, its PURPOSE, CONTEXT, and MEANING
- Be thorough, systematic, and comprehensive - aim for 200+ words minimum

VISUAL ANALYSIS FRAMEWORK - Follow this structure:
1. OVERALL CONTEXT & PURPOSE: What type of image is this? What does it represent? What is its purpose?
2. VISUAL STRUCTURE & LAYOUT: Describe the layout, visual organization, sections, spatial relationships
3. VISUAL ELEMENTS: Colors, design patterns, visual hierarchy, graphical elements, images/icons
4. CONTENT IN CONTEXT: Mention text and content as part of understanding what the image shows and means
5. MEANING & SIGNIFICANCE: What does this image communicate? What is its significance or purpose?

SPECIFIC GUIDANCE BY IMAGE TYPE:
- Webpages: Describe visual design, layout structure, information hierarchy, navigation elements, and what the page represents (mention text in context of understanding the page's purpose)
- Documents/Receipts: Describe document structure, layout, visual organization, and what it represents (mention key information like amounts, dates in context of understanding the document's purpose)
- Photos/Images: Describe visual composition, subjects, scene, context, and what the image shows or represents
- UI/Screenshots: Describe interface design, layout, visual elements, and what the interface represents or does

Your responses must demonstrate visual understanding and contextual analysis. Simply transcribing text is unacceptable.`;
    
    if (domain) {
      const domainMap: Record<string, string> = {
        medical: "Medical Imaging - Focus on visual analysis of medical images, anatomical structures, visual patterns, and clinical context. Describe what you see visually and what it may indicate.",
        docs: "Document Analysis - Focus on visual document structure, layout, formatting, information hierarchy, and what the document represents. Describe the visual organization and mention text content in context of understanding the document's purpose.",
        product: "Product Recognition - Focus on visual product features, design elements, branding, visual presentation, and what the product appears to be. Describe visual details and mention specifications in context.",
        safety: "Safety & Security - Focus on visual safety features, security elements, visual warnings, compliance indicators, and what the image represents in terms of safety/security context.",
      };
      const domainGuidance = domainMap[domain] ?? `Domain: ${domain} - Apply domain-specific visual analysis expertise. Focus on understanding what the image shows in this domain context.`;
      return `${basePrompt}\n\n${domainGuidance}`;
    }
    
    return basePrompt;
  }
  
  // Text model prompts remain concise
  if (domain) {
    const base = "You are a concise assistant with domain expertise.";
    const domainMap: Record<string, string> = {
      finance: "Finance & Economics",
      healthcare: "Healthcare & Medicine",
      education: "Education & Learning",
      business: "Business & Strategy",
      legal: "Legal & Compliance",
      marketing: "Marketing & Sales",
      hr: "Human Resources",
      customer_service: "Customer Service",
    };
    const name = domainMap[domain] ?? domain;
    return `${base} Domain: ${name}. If unsure, ask clarifying questions briefly.`;
  }
  
  return undefined;
}

export function buildTransformersModel(modelId: string, options?: { isVision?: boolean; worker?: Worker }) {
  return transformersJS(modelId, {
    isVisionModel: options?.isVision ?? false,
    device: "webgpu",
    // Use quantized precision for vision models (removed fp32 for better performance)
    // Quantized models are 4x faster with minimal accuracy loss
    dtype: undefined, // Let transformers.js use default quantized precision
    worker: options?.worker,
  });
}

