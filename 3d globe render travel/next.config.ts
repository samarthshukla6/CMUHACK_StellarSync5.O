import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The globe (three.js / WebGL) isn't safe to mount-unmount-remount instantly,
  // which is what React Strict Mode does in dev — it can leave the canvas stuck.
  reactStrictMode: false,
};

export default nextConfig;
