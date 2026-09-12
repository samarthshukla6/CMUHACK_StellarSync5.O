"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ChatSection } from "@/studio/_components/features/chat/chat-section";
import { ErrorBoundary } from "@/studio/_components/common/error-boundary";
import { useChatSection } from "@/hooks/useChatSection";
import { getPageTitle } from "@/lib/page-titles";

export default function HomePage() {
  const pathname = usePathname();
  const { auth, model, vision, chat } = useChatSection("chat");

  useEffect(() => {
    document.title = getPageTitle(pathname ?? "/");
  }, [pathname]);

  const handleResetChat = () => {
    chat.resetChat();
    vision.setVisionImage(null);
  };

  return (
    <ErrorBoundary>
      <ChatSection
        messages={chat.messages}
        input={chat.input}
        onInputChange={chat.setInput}
        onSend={() => chat.sendChat()}
        pending={chat.pending}
        isProcessing={chat.isProcessing}
        processingText={chat.processingText}
        onReset={handleResetChat}
        onStop={chat.stop}
        chatFeedRef={chat.chatFeedRef}
        isFeatureDisabled={auth.isFeatureDisabled}
        modelId={model.modelId}
        onModelChange={model.setModelId}
        activeSection="chat"
        modelLoading={model.modelLoading}
        modelProgress={model.modelProgress}
      />
    </ErrorBoundary>
  );
}
