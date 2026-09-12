"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { VisionSection } from "@/studio/_components/features/vision/vision-section";
import { ErrorBoundary } from "@/studio/_components/common/error-boundary";
import { useChatSection } from "@/hooks/useChatSection";
import { getPageTitle } from "@/lib/page-titles";

export default function VisionPage() {
  const pathname = usePathname();
  const { auth, model, vision, chat } = useChatSection("vision");

  useEffect(() => {
    document.title = getPageTitle(pathname ?? "/vision");
  }, [pathname]);

  const handleResetChat = () => {
    chat.resetChat();
    vision.setVisionImage(null);
  };

  return (
    <ErrorBoundary>
      <VisionSection
        messages={chat.messages}
        input={chat.input}
        onInputChange={chat.setInput}
        onSend={() => chat.sendChat()}
        pending={chat.pending}
        isProcessing={chat.isProcessing}
        processingText={chat.processingText}
        onReset={handleResetChat}
        onStop={chat.stop}
        visionImage={vision.visionImage}
        onVisionFileChange={vision.handleVisionFile}
        chatFeedRef={chat.chatFeedRef}
        isFeatureDisabled={auth.isFeatureDisabled}
        modelId={model.modelId}
        onModelChange={model.setModelId}
        activeSection="vision"
        modelLoading={model.modelLoading}
        modelProgress={model.modelProgress}
      />
    </ErrorBoundary>
  );
}
