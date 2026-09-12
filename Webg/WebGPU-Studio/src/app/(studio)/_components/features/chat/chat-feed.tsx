import { useEffect, useRef, type RefObject } from "react";
import { MarkdownRenderer } from "@/studio/_components/common/markdown-renderer";
import { ChatMessage } from "./types";
import { Loader3D } from "@/studio/_components/common/loader-3d";
import styles from "@/app/page.module.css";

interface ChatFeedProps {
  messages: ChatMessage[];
  isProcessing: boolean;
  processingText: string;
  chatFeedRef: RefObject<HTMLDivElement | null>;
  modelLoading?: boolean;
  modelProgress?: number;
}

export function ChatFeed({ messages, isProcessing, processingText, chatFeedRef, modelLoading, modelProgress }: ChatFeedProps) {
  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const previousMessagesLengthRef = useRef(0);

  useEffect(() => {
    const container = chatFeedRef.current;
    if (!container) return;

    const currentLength = messages.length;
    const lastMessage = messages[currentLength - 1];
    const isNewUserMessage =
      currentLength > previousMessagesLengthRef.current && lastMessage?.role === "user";

    previousMessagesLengthRef.current = currentLength;

    if (!isNewUserMessage) return;

    const lastUserMessageIndex = currentLength - 1;
    const scrollToMessage = () => {
      const el = messageRefs.current.get(lastUserMessageIndex);
      if (el && container) {
        const scrollTop = container.scrollTop + (el.getBoundingClientRect().top - container.getBoundingClientRect().top);
        container.scrollTop = scrollTop;
      }
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToMessage);
    });
  }, [messages, chatFeedRef]);

  function renderMessages() {
    if (messages.length === 0 && !isProcessing && !modelLoading) {
      return null;
    }
    
    return (
      <div>
        {messages.length > 0 && messages.map((m, i) => {
          const isUser = m.role === "user";
          return (
            <div 
              key={`${m.role}-${i}`} 
              ref={(el) => {
                if (el) {
                  messageRefs.current.set(i, el);
                } else {
                  messageRefs.current.delete(i);
                }
              }}
              className={`${styles.messageRow} ${isUser ? styles.messageRowUser : styles.messageRowAssistant}`}
            >
              {!isUser && (
                <div className={styles.messageIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                </div>
              )}
              <div className={`${styles.messageText} ${isUser ? styles.messageTextUser : styles.messageTextAssistant}`}>
                <MarkdownRenderer content={m.content || ""} />
              </div>
              {isUser && (
                <div className={styles.messageIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
              )}
            </div>
          );
        })}
        {(isProcessing || modelLoading) && (
          <Loader3D 
            message={modelLoading ? "" : (processingText || "response is being processed...")} 
            modelLoading={modelLoading}
            modelProgress={modelProgress}
          />
        )}
      </div>
    );
  }

  return (
    <div className={styles.chatFeed} ref={chatFeedRef}>
      {renderMessages()}
    </div>
  );
}
