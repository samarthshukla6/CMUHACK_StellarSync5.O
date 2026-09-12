"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChatIcon, VisionIcon } from "@/studio/_components/common/icons";

const SECTIONS = [
  { id: "chat", path: "/", label: "Chat", Icon: ChatIcon },
  { id: "vision", path: "/vision", label: "Vision", Icon: VisionIcon },
] as const;

export function SectionToggleButton() {
  const pathname = usePathname();
  const activeId = pathname === "/vision" ? "vision" : "chat";
  const target = SECTIONS.find((s) => s.id !== activeId)!;

  return (
    <Link
      href={target.path}
      prefetch
      className="w-8 h-8 rounded-lg border border-transparent flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors flex-shrink-0"
      title={`Switch to ${target.label}`}
      aria-label={`Switch to ${target.label}`}
    >
      <target.Icon size={16} />
    </Link>
  );
}
