import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Globe — Fly Anywhere",
  description: "A cinematic 3D globe you can fly to any place on Earth.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Fetch the globe textures immediately, in parallel with JS, instead
            of waiting for three.js to request them after hydration. */}
        <link rel="preload" as="image" href="/textures/earth-blue-marble.jpg" />
        <link rel="preload" as="image" href="/textures/earth-topology.png" />
      </head>
      <body className="h-full w-full overflow-hidden">{children}</body>
    </html>
  );
}
