"use client";

import { useRef } from "react";
import { ChatFeed } from "../chat/chat-feed";
import { ChatMessage } from "../chat/types";
import { useFocusWhen } from "@/hooks/use-focus-when";
import { ModelSelector } from "@/studio/_components/common/model-selector";
import { SectionToggleButton } from "@/studio/_components/common/section-toggle-button";
import { PlusIcon, StopIcon, LoadingIcon, SendIcon, CloseIcon } from "@/studio/_components/common/icons";
import styles from "@/app/page.module.css";

interface VisionSectionProps {
  messages: ChatMessage[];
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  pending: boolean;
  isProcessing: boolean;
  processingText: string;
  onReset: () => void;
  onStop: () => void;
  visionImage: string | null;
  onVisionFileChange: (file: File | null) => void;
  chatFeedRef: React.RefObject<HTMLDivElement | null>;
  isFeatureDisabled: boolean;
  modelId: string;
  onModelChange: (modelId: string) => void;
  activeSection: string;
  modelLoading?: boolean;
  modelProgress?: number;
}

export function VisionSection({
  messages,
  input,
  onInputChange,
  onSend,
  pending,
  isProcessing,
  processingText,
  onReset,
  onStop,
  visionImage,
  onVisionFileChange,
  chatFeedRef,
  isFeatureDisabled,
  modelId,
  onModelChange,
  activeSection,
  modelLoading,
  modelProgress,
}: VisionSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useFocusWhen(!pending);

  const handleEnterSend = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const showWelcome = messages.length === 0 && !pending;

  return (
    <div className={styles.visionSection}>
      {showWelcome && (
        <div className={styles.visionInfo}>
          <p className={styles.visionInfoText}>
            Upload images and get local results
          </p>
        </div>
      )}

      {messages.length > 0 && (
        <div className={styles.chatHeader}>
          <button
            type="button"
            className={styles.newChatButton}
            onClick={onReset}
            title="New chat"
          >
            <PlusIcon size={16} />
            New chat
          </button>
        </div>
      )}

      <div className={styles.visionImageSection}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => onVisionFileChange(e.target.files?.[0] ?? null)}
          disabled={isFeatureDisabled}
          style={{ display: "none" }}
        />
        {visionImage ? (
          <div className={styles.visionImagePreview}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={visionImage} alt="Uploaded" />
            <button
              type="button"
              className={styles.visionImageRemove}
              onClick={() => onVisionFileChange(null)}
              title="Remove image"
            >
              <CloseIcon size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={styles.visionUploadButton}
            onClick={handleFileClick}
            disabled={isFeatureDisabled}
          >
            <PlusIcon size={20} />
            Upload image
          </button>
        )}
      </div>

      <ChatFeed
        messages={messages}
        isProcessing={isProcessing}
        processingText={processingText}
        chatFeedRef={chatFeedRef}
        modelLoading={modelLoading}
        modelProgress={modelProgress}
      />

      <div className="sticky bottom-0 left-0 right-0 py-2 pb-3 flex-shrink-0 z-10">
        <div className="max-w-[1200px] mx-auto w-full">
          <div className="relative rounded-2xl border border-gray-200/80 overflow-hidden transition-all bg-gradient-to-br from-slate-50 via-white to-slate-50/80 shadow-lg shadow-gray-300/40 backdrop-blur-sm">
            <textarea
              ref={inputRef}
              className="w-full min-h-[60px] max-h-[300px] py-[18px] px-6 pt-5 border-none bg-transparent text-gray-900 text-[15px] resize-none relative z-[2] overflow-y-auto focus:outline-none font-[family-name:var(--font-aspekta)]"
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder="Describe what you want from the image..."
              disabled={pending || isFeatureDisabled}
              onKeyDown={handleEnterSend}
              rows={1}
              autoFocus
            />
            <div className="flex items-center justify-between py-2 px-3">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="w-8 h-8 rounded-lg border border-transparent flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleFileClick}
                  disabled={isFeatureDisabled || pending}
                  title="Add image"
                >
                  <PlusIcon size={16} />
                </button>
                <SectionToggleButton />
                <ModelSelector
                  modelId={modelId}
                  onModelChange={onModelChange}
                  activeSection={activeSection}
                  disabled={pending || isFeatureDisabled}
                />
              </div>
              <div className="flex items-center gap-1.5">
                {pending && (
                  <button
                    type="button"
                    className="w-8 h-8 rounded-lg border border-gray-200 bg-transparent text-gray-500 flex items-center justify-center flex-shrink-0 hover:bg-gray-100 transition-colors"
                    onClick={onStop}
                    title="Stop generation"
                  >
                    <StopIcon size={16} />
                  </button>
                )}
                <button
                  type="button"
                  className="w-8 h-8 rounded-lg border-none bg-violet-600 text-white flex items-center justify-center flex-shrink-0 hover:bg-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={onSend}
                  disabled={pending || !input.trim() || isFeatureDisabled}
                  title="Send message"
                >
                  {pending ? (
                    <LoadingIcon size={18} />
                  ) : (
                    <SendIcon size={18} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
