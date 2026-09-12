import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@elevenlabs/client": path.resolve(
          __dirname,
          "node_modules/@elevenlabs/client/dist/platform/web/index.js"
        ),
      };
      config.resolve.conditionNames = ["browser", "import", "module", "require", "default"];
    }
    return config;
  },
};

export default nextConfig;
