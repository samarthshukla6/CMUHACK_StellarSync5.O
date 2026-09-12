import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

// AUTH DISABLED: Auth0Provider/session lookup removed so the app renders without
// any Auth0 configuration. Original wiring preserved in comments below.
// import { Auth0Provider } from "@auth0/nextjs-auth0/client";
// import { auth0 } from "@/lib/auth0";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const displayFont = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz", "wdth"],
});

export const metadata: Metadata = {
  title: "WebGPU Studio - Local-First AI Playground",
  description: "WebGPU Studio: your sleek local-first AI copilot for chat and vision.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // const session = await auth0.getSession();
  // const user = session?.user ?? undefined;

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${displayFont.variable}`}>
        {/* <Auth0Provider user={user}> */}
        <Suspense fallback={null}>{children}</Suspense>
        {/* </Auth0Provider> */}
      </body>
    </html>
  );
}
