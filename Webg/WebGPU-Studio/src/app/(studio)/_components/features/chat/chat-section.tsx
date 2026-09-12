"use client";

// AUTH DISABLED: no session lookup, so the greeting no longer personalises by name.
// import { useEffect } from "react";
// import { useProfile } from "@/hooks/useProfile";
// import { useUser } from "@auth0/nextjs-auth0/client";
import { ChatFeed } from "./chat-feed";
import { ChatMessage } from "./types";
import { ModelSelector } from "@/studio/_components/common/model-selector";
import { SectionToggleButton } from "@/studio/_components/common/section-toggle-button";
import { PlusIcon, StopIcon, LoadingIcon, SendIcon } from "@/studio/_components/common/icons";
import { useFocusWhen } from "@/hooks/use-focus-when";
import styles from "@/app/page.module.css";

interface ChatSectionProps {
  messages: ChatMessage[];
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  pending: boolean;
  isProcessing: boolean;
  processingText: string;
  onReset: () => void;
  onStop: () => void;
  chatFeedRef: React.RefObject<HTMLDivElement | null>;
  isFeatureDisabled: boolean;
  modelId: string;
  onModelChange: (modelId: string) => void;
  activeSection: string;
  modelLoading?: boolean;
  modelProgress?: number;
}

export function ChatSection({
  messages,
  input,
  onInputChange,
  onSend,
  pending,
  isProcessing,
  processingText,
  onReset,
  onStop,
  chatFeedRef,
  isFeatureDisabled,
  modelId,
  onModelChange,
  activeSection,
  modelLoading,
  modelProgress,
}: ChatSectionProps) {
  // AUTH DISABLED: profile-based greeting turned off.
  // const { profile, fetchProfile } = useProfile();
  // const { user } = useUser();
  // const isAuthenticated = !!user;
  //
  // useEffect(() => {
  //   if (isAuthenticated && !profile) {
  //     fetchProfile();
  //   }
  // }, [isAuthenticated, profile, fetchProfile]);
  //
  // const getFirstName = () => {
  //   if (profile?.name) {
  //     return profile.name.split(' ')[0];
  //   }
  //   if (user?.name) {
  //     return user.name.split(' ')[0];
  //   }
  //   return null;
  // };

  const firstName: string | null = null;

  const handleEnterSend = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  };

  const showWelcome = messages.length === 0 && !pending;
  const inputRef = useFocusWhen(!pending);

  return (
    <div className={styles.chatSection}>
      {showWelcome && (
        <div className={styles.chatWelcome}>
          <h1
            className="text-center text-[34px] sm:text-[44px] leading-[1.05] tracking-[-0.01em] bg-gradient-to-b from-neutral-900 to-neutral-700 bg-clip-text text-transparent"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 650,
              fontVariationSettings: '"opsz" 96, "wdth" 100',
            }}
          >
            K2 Horizon Studio
          </h1>
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
            {!isFeatureDisabled && firstName && !input && (
              <label className="absolute top-[18px] left-6 pointer-events-none text-[15px] text-gray-500 z-[1] font-[family-name:var(--font-aspekta)]">
                <span className="bg-gradient-to-r from-violet-500 to-cyan-400 bg-clip-text text-transparent">
                  Hello {firstName}
                </span>
                , How can I help you today?
              </label>
            )}
            <textarea
              ref={inputRef}
              className="w-full min-h-[60px] max-h-[300px] py-[18px] px-6 pt-5 border-none bg-transparent text-gray-900 text-[15px] resize-none relative z-[2] overflow-y-auto focus:outline-none font-[family-name:var(--font-aspekta)]"
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder={!firstName ? "How can I help you today?" : ""}
              disabled={pending || isFeatureDisabled}
              onKeyDown={handleEnterSend}
              rows={1}
              autoFocus
            />
            <div className="flex items-center justify-between py-2 px-3">
              <div className="flex items-center gap-1.5">
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
