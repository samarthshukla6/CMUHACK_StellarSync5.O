import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppSidebar } from "@/components/layout/app-sidebar";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Atlas Travel",
  description: "Voice travel planner — destination, itinerary, and on-the-ground decisions",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex h-screen bg-gray-50">
          <AppSidebar />
          <main className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">{children}</main>
        </div>
      </body>
    </html>
  );
}
