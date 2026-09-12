"use client";

import React from "react";
import dynamic from "next/dynamic";
import { logger } from "@/lib/utils/logger";

const ReactMarkdown = dynamic(() => import("react-markdown"), { 
  ssr: false 
});

class MarkdownErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: string },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    logger.warn("Markdown rendering error:", error);
  }

  render() {
    if (this.state.hasError) {
      return <p>{this.props.fallback}</p>;
    }
    return this.props.children;
  }
}

export function MarkdownRenderer({ content }: { content: string }) {
  if (!content) return null;
  
  return (
    <MarkdownErrorBoundary fallback={content}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </MarkdownErrorBoundary>
  );
}
