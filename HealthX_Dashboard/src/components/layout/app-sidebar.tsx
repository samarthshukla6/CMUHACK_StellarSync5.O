"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";

export function AppSidebar() {
  const pathname = usePathname();
  const isActive = pathname === "/";

  return (
    <aside className="w-16 md:w-20 h-screen bg-white border-r border-gray-200 flex flex-col items-center py-6">
      <div className="w-10 h-10 rounded-full bg-indigo-600 shadow-sm mb-8 flex items-center justify-center text-white font-bold text-sm">
        AT
      </div>
      <nav className="flex flex-col items-center gap-2">
        <Link
          href="/"
          className={`p-2 rounded-xl transition-colors ${
            isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-gray-100"
          }`}
          title="Trip planner"
        >
          <Home className="w-6 h-6" />
          <span className="sr-only">Trip planner</span>
        </Link>
      </nav>
    </aside>
  );
}
