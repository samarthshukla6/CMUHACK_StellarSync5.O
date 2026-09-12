import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    remotePatterns: [
      {
        hostname: 'cdn.auth0.com',
      },
      {
        hostname: 's.gravatar.com',
      },
      {
        hostname: 'avatars.githubusercontent.com',
      },
      {
        hostname: 'avatar.vercel.sh',
      },
      {
        hostname: 'lh3.googleusercontent.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  
  // Exclude large AI packages from file tracing to keep serverless function size manageable
  // Embeddings now run client-side in the browser, so server-side exclusions are safe
  outputFileTracingExcludes: {
    '*': [
      // Exclude @built-in-ai - dynamically imported, models downloaded at runtime
      'node_modules/@built-in-ai/**',
      // Exclude @huggingface from server bundle - embeddings run client-side in browser
      'node_modules/@huggingface/**',
      // Exclude other non-essential packages
      'node_modules/@mlc-ai/**',
      'node_modules/@napi-rs/**',
      'node_modules/@tybys/**',
      'node_modules/@unrs/**',
      'node_modules/@emnapi/**',
    ],
  },

  // Webpack configuration for browser transformers.js
  // Aliases Node.js-specific modules that aren't needed in the browser
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Browser-specific webpack config for transformers.js
      config.resolve.alias = {
        ...config.resolve.alias,
        // Disable Node.js-specific modules in browser
        'sharp': false,
        'onnxruntime-node': false,
        'canvas': false,
      };

      // Handle @huggingface/transformers in browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
  
  // Strategy for embeddings (client-side approach):
  // 1. Embeddings run entirely in the browser using @huggingface/transformers
  // 2. Models are downloaded and cached in browser's IndexedDB/cache
  // 3. No server-side bundle size issues - everything runs client-side
  // 4. @huggingface/transformers is excluded from server bundle but available in browser
  // 5. Better user experience - models cached locally after first download
  
  // Security headers
  async headers() {
    const isolationHeaders = [
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on'
      },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload'
      },
      // No X-Frame-Options here: this app is embedded via <iframe> by the
      // HealthX_Dashboard host, and XFO only supports a single fixed origin.
      // CSP frame-ancestors below is what actually controls who may frame us.
      {
        key: 'Content-Security-Policy',
        value: "frame-ancestors 'self' http://localhost:3000"
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff'
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block'
      },
      {
        key: 'Referrer-Policy',
        value: 'origin-when-cross-origin'
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()'
      },
    ];
    return [
      { source: "/", headers: isolationHeaders },
      { source: "/:path*", headers: isolationHeaders },
    ];
  },
};

export default nextConfig;
