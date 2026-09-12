"use client";

import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface VoiceOrbProps {
  assistantIsSpeaking: boolean;
  volumeLevel: number;
  onEndCallClick?: () => void;
  compact?: boolean;
  sphereOnly?: boolean;
  size?: number;
}

export function VoiceOrb({
  assistantIsSpeaking,
  volumeLevel,
  onEndCallClick,
  compact = false,
  sphereOnly = false,
  size,
}: VoiceOrbProps) {
  const orbRef = useRef<HTMLDivElement>(null);

  // Create a more responsive volume level with smoother transitions
  const [smoothVolume, setSmoothVolume] = React.useState(0);
  const [rotation, setRotation] = React.useState({ x: 0, y: 0 });

  // Smooth out volume changes for more natural animations
  useEffect(() => {
    setSmoothVolume(prev => {
      const target = Math.min(volumeLevel * 1.5, 1);
      return prev + (target - prev) * 0.3; // Smooth transition
    });
  }, [volumeLevel]);

  // Slow rotation effect to enhance 3D illusion
  useEffect(() => {
    const interval = setInterval(() => {
      setRotation({
        x: Math.sin(Date.now() / 3000) * 5,
        y: Math.cos(Date.now() / 4000) * 5
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Adjusted colors - Keeping vibrant orb colors, but aligning text/button styles
  const speakingColor = "#6366f1"; // indigo-500
  const listeningColor = "#06b6d4"; // cyan-500
  const speakingGlow = "rgba(99, 102, 241, 0.2)"; // indigo-400
  const listeningGlow = "rgba(34, 211, 238, 0.2)"; // cyan-400
  const speakingParticle = "#a5b4fc"; // indigo-300
  const listeningParticle = "#67e8f9"; // cyan-300

  // Animation for the entire component entrance
  const componentVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
  };

  // Define base size and calculate related dimensions
  const baseSize = size ?? (compact ? 110 : 180);
  const glowBase = baseSize * 0.97; // Approx 232
  const glowPulse = baseSize * 0.08; // Approx 20 (was 30)
  const particleRadius = baseSize * 0.43; // Approx 104 (was 130)

  const orbSphere = (
    <div className={`relative flex items-center justify-center ${sphereOnly ? "" : compact ? "mb-3" : "mb-12"}`}>
        {/* Outer glow effect - Adjusted sizes */}
        <motion.div
          className="absolute rounded-full bg-blue-500/5"
          animate={{
            width: assistantIsSpeaking
              ? [`${baseSize * 0.9}px`, `${baseSize * 0.95}px`, `${baseSize * 0.925}px`, `${baseSize * 0.975}px`, `${baseSize * 0.9}px`]
              : [glowBase, glowBase + 5 + (smoothVolume * glowPulse), glowBase],
            height: assistantIsSpeaking
              ? [`${baseSize * 0.9}px`, `${baseSize * 0.95}px`, `${baseSize * 0.925}px`, `${baseSize * 0.975}px`, `${baseSize * 0.9}px`]
              : [glowBase, glowBase + 5 + (smoothVolume * glowPulse), glowBase],
            boxShadow: assistantIsSpeaking
              ? [
                `0 0 60px 30px ${speakingGlow}`,
                `0 0 70px 40px ${speakingGlow}`,
                `0 0 60px 30px ${speakingGlow}`
              ]
              : [
                `0 0 50px 25px ${listeningGlow}`,
                `0 0 60px 35px ${listeningGlow}`,
                `0 0 50px 25px ${listeningGlow}`
              ]
          }}
          transition={{
            width: { duration: assistantIsSpeaking ? 4 : 1, repeat: Infinity, ease: "easeInOut" },
            height: { duration: assistantIsSpeaking ? 4 : 1, repeat: Infinity, ease: "easeInOut" },
            boxShadow: { duration: 3, repeat: Infinity, ease: "easeInOut" }
          }}
        />

        {/* 3D rotation container - Reduced size */}
        <motion.div
          className="relative transform-gpu"
          style={{
            width: `${baseSize}px`,
            height: `${baseSize}px`,
            perspective: 1000,
            transformStyle: "preserve-3d",
          }}
          animate={{
            rotateX: rotation.x,
            rotateY: rotation.y
          }}
          transition={{ duration: 0.3 }}
        >
          {/* Main Siri-like orb */}
          <motion.div
            ref={orbRef}
            className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center overflow-hidden shadow-xl"
            animate={{
              background: assistantIsSpeaking
                ? [
                  "radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.9) 0%, rgba(99, 102, 241, 0.8) 50%, rgba(129, 140, 248, 0.7) 100%)",
                  "radial-gradient(circle at 40% 40%, rgba(99, 102, 241, 0.9) 0%, rgba(129, 140, 248, 0.8) 50%, rgba(165, 180, 252, 0.7) 100%)",
                  "radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.9) 0%, rgba(99, 102, 241, 0.8) 50%, rgba(129, 140, 248, 0.7) 100%)"
                ]
                : [
                  "radial-gradient(circle at 30% 30%, rgba(14, 165, 233, 0.9) 0%, rgba(56, 189, 248, 0.8) 50%, rgba(103, 232, 249, 0.7) 100%)",
                  "radial-gradient(circle at 40% 40%, rgba(34, 211, 238, 0.9) 0%, rgba(103, 232, 249, 0.8) 50%, rgba(165, 229, 243, 0.7) 100%)",
                  "radial-gradient(circle at 30% 30%, rgba(14, 165, 233, 0.9) 0%, rgba(56, 189, 248, 0.8) 50%, rgba(103, 232, 249, 0.7) 100%)"
                ]
            }}
            transition={{
              background: { duration: 5, repeat: Infinity, ease: "easeInOut" }
            }}
          >
            {/* 3D Highlight effect */}
            <div
              className="absolute inset-0 rounded-full bg-gradient-to-br from-white/15 to-transparent"
              style={{
                background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 15%, transparent 60%)"
              }}
            />

            {/* Deep interior effect */}
            <motion.div
              className="absolute w-[85%] h-[85%] left-[7.5%] top-[7.5%] rounded-full"
              style={{
                background: assistantIsSpeaking
                  ? "radial-gradient(circle at 60% 60%, rgba(129, 140, 248, 0.5) 0%, rgba(99, 102, 241, 0.3) 50%, transparent 100%)"
                  : "radial-gradient(circle at 60% 60%, rgba(56, 189, 248, 0.5) 0%, rgba(14, 165, 233, 0.3) 50%, transparent 100%)",
                filter: "blur(5px)"
              }}
              animate={{
                opacity: [0.8, 0.6, 0.8]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />

            {/* Foreground flowing blobs */}
            <div className="absolute inset-0 overflow-hidden rounded-full">
              {[...Array(8)].map((_, i) => {
                // Scale blob dimensions based on baseSize
                const blobWidth = (50 + i * 15) * (baseSize / 300);
                const blobHeight = (50 + i * 12) * (baseSize / 300);
                const initialX = -(25 + i * 8) * (baseSize / 300);
                const initialY = -(25 + i * 6) * (baseSize / 300);
                const volumeEffectX = smoothVolume * 25 * (baseSize / 300);
                const volumeEffectY = smoothVolume * 20 * (baseSize / 300);

                return (
                  <motion.div
                    key={i}
                    className="absolute rounded-full z-20"
                    style={{
                      background: assistantIsSpeaking
                        ? `rgba(255, 255, 255, ${0.05 + (i % 3) * 0.02})`
                        : `rgba(255, 255, 255, ${0.04 + (i % 3) * 0.02})`,
                      filter: `blur(${5 + (i % 3) * 2}px)`,
                      width: `${blobWidth}px`,
                      height: `${blobHeight}px`,
                      x: `${initialX}px`,
                      y: `${initialY}px`,
                      zIndex: 10 - i,
                    }}
                    animate={{
                      x: assistantIsSpeaking
                        ? [
                          `${initialX}px`,
                          `${(10 - i * 5) * (baseSize / 300)}px`,
                          `${(-15 - i * 5) * (baseSize / 300)}px`,
                          `${(5 - i * 4) * (baseSize / 300)}px`,
                          `${initialX}px`
                        ]
                        : [
                          `${initialX}px`,
                          `${initialX + volumeEffectX}px`,
                          `${initialX}px`
                        ],
                      y: assistantIsSpeaking
                        ? [
                          `${initialY}px`,
                          `${(-10 - i * 8) * (baseSize / 300)}px`,
                          `${(5 - i * 4) * (baseSize / 300)}px`,
                          `${(-15 - i * 5) * (baseSize / 300)}px`,
                          `${initialY}px`
                        ]
                        : [
                          `${initialY}px`,
                          `${initialY - volumeEffectY}px`,
                          `${initialY}px`
                        ],
                      scale: assistantIsSpeaking
                        ? [1, 1.06, 0.97, 1.03, 1]
                        : [1, 1 + smoothVolume / 5, 1],
                      opacity: [0.5, 0.7, 0.5]
                    }}
                    transition={{
                      x: {
                        duration: assistantIsSpeaking ? 6 + i : 0.8,
                        repeat: Infinity,
                        ease: "easeInOut"
                      },
                      y: {
                        duration: assistantIsSpeaking ? 7 + i : 0.8,
                        repeat: Infinity,
                        ease: "easeInOut"
                      },
                      scale: {
                        duration: assistantIsSpeaking ? 5 : 0.4,
                        repeat: Infinity,
                        ease: "easeInOut"
                      },
                      opacity: {
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }
                    }}
                  />
                );
              })}
            </div>

            {/* Background flowing blobs */}
            <div className="absolute inset-0 overflow-hidden rounded-full">
              {[...Array(8)].map((_, i) => {
                // Scale blob dimensions based on baseSize
                const blobWidth = (70 + i * 15) * (baseSize / 300);
                const blobHeight = (70 + i * 15) * (baseSize / 300);
                const initialX = -(35 + i * 8) * (baseSize / 300);
                const initialY = -(35 + i * 8) * (baseSize / 300);
                const volumeEffectX = smoothVolume * 18 * (baseSize / 300);
                const volumeEffectY = smoothVolume * 18 * (baseSize / 300);

                return (
                  <motion.div
                    key={i + 8}
                    className="absolute rounded-full"
                    style={{
                      background: assistantIsSpeaking
                        ? `rgba(255, 255, 255, ${0.04 + (i % 3) * 0.015})`
                        : `rgba(255, 255, 255, ${0.03 + (i % 3) * 0.01})`,
                      filter: `blur(${7 + (i % 4) * 2}px)`,
                      width: `${blobWidth}px`,
                      height: `${blobHeight}px`,
                      right: `${initialX}px`,
                      bottom: `${initialY}px`,
                      zIndex: 2 - i,
                    }}
                    animate={{
                      x: assistantIsSpeaking
                        ? [
                          0,
                          `${(-10 - i * 3) * (baseSize / 300)}px`,
                          `${(5 + i * 4) * (baseSize / 300)}px`,
                          `${(-8 - i * 4) * (baseSize / 300)}px`,
                          0
                        ]
                        : [
                          0,
                          volumeEffectX * Math.sin(i * 0.8),
                          0
                        ],
                      y: assistantIsSpeaking
                        ? [
                          0,
                          `${(8 + i * 4) * (baseSize / 300)}px`,
                          `${(-5 - i * 4) * (baseSize / 300)}px`,
                          `${(10 + i * 3) * (baseSize / 300)}px`,
                          0
                        ]
                        : [
                          0,
                          volumeEffectY * Math.cos(i * 0.8),
                          0
                        ],
                      scale: assistantIsSpeaking
                        ? [1, 1.05, 0.98, 1.02, 1]
                        : [1, 1 + smoothVolume / 4, 1],
                      opacity: [0.4, 0.6, 0.4]
                    }}
                    transition={{
                      x: {
                        duration: assistantIsSpeaking ? 6.5 + i : 0.7,
                        repeat: Infinity,
                        ease: "easeInOut"
                      },
                      y: {
                        duration: assistantIsSpeaking ? 7.5 + i : 0.7,
                        repeat: Infinity,
                        ease: "easeInOut"
                      },
                      scale: {
                        duration: assistantIsSpeaking ? 4.5 : 0.4,
                        repeat: Infinity,
                        ease: "easeInOut"
                      },
                      opacity: {
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }
                    }}
                  />
                );
              })}
            </div>

            {/* Orbiting particles */}
            {/* Orbiting particles */}
            {[...Array(12)].map((_, i) => {
              const angle = (i / 12) * Math.PI * 2;
              const radius = particleRadius;
              const initialX = Math.cos(angle) * radius;
              const initialY = Math.sin(angle) * radius;

              return (
                <motion.div
                  key={`particle-${i}`}
                  className="absolute rounded-full"
                  style={{
                    width: `${2 + (i % 2)}px`, // Add px units here
                    height: `${2 + (i % 2)}px`, // Add px units here
                    x: initialX, // Remove string template & px - use raw number
                    y: initialY, // Remove string template & px - use raw number
                    background: assistantIsSpeaking ? speakingParticle : listeningParticle,
                    boxShadow: assistantIsSpeaking
                      ? `0 0 3px 1px ${speakingGlow}`
                      : `0 0 3px 1px ${listeningGlow}`,
                    zIndex: 30
                  }}
                  animate={{
                    x: [
                      initialX, // Use raw numbers without px units
                      Math.cos(angle + 0.5) * radius,
                      Math.cos(angle + 1) * radius,
                      Math.cos(angle + 1.5) * radius,
                      Math.cos(angle + 2) * radius,
                      initialX
                    ],
                    y: [
                      initialY, // Use raw numbers without px units
                      Math.sin(angle + 0.5) * radius,
                      Math.sin(angle + 1) * radius,
                      Math.sin(angle + 1.5) * radius,
                      Math.sin(angle + 2) * radius,
                      initialY
                    ],
                    opacity: [0.7, 1, 0.7],
                    scale: assistantIsSpeaking
                      ? [1, 1.5, 1]
                      : [1, 1 + smoothVolume / 2, 1]
                  }}
                  transition={{
                    x: { duration: 8 + (i % 4), repeat: Infinity, ease: "linear" },
                    y: { duration: 8 + (i % 4), repeat: Infinity, ease: "linear" },
                    opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                    scale: { duration: assistantIsSpeaking ? 1.5 : 0.3, repeat: Infinity }
                  }}
                />
              );
            })}

            {/* Center pulsing glow */}
            <motion.div
              className="rounded-full absolute"
              style={{
                background: assistantIsSpeaking
                  ? "radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(199,210,254,0.1) 40%, rgba(165,180,252,0.0) 70%)"
                  : "radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(186,230,253,0.1) 40%, rgba(103,232,249,0.0) 70%)",
                filter: "blur(6px)"
              }}
              animate={{
                width: assistantIsSpeaking
                  ? ["40%", "48%", "44%", "50%", "40%"]
                  : ["40%", `${40 + smoothVolume * 20}%`, "40%"],
                height: assistantIsSpeaking
                  ? ["40%", "48%", "44%", "50%", "40%"]
                  : ["40%", `${40 + smoothVolume * 20}%`, "40%"],
                opacity: [0.6, 0.8, 0.6]
              }}
              transition={{
                width: { duration: assistantIsSpeaking ? 3.5 : 0.4, repeat: Infinity, ease: "easeInOut" },
                height: { duration: assistantIsSpeaking ? 3.5 : 0.4, repeat: Infinity, ease: "easeInOut" },
                opacity: { duration: 2, repeat: Infinity }
              }}
            />
          </motion.div>
        </motion.div>
      </div>
  );

  if (sphereOnly) return orbSphere;

  return (
    <div className="flex flex-col items-center justify-center h-full w-full text-slate-800">
      {!compact && (
        <div className="text-2xl font-semibold text-slate-800 mb-8 drop-shadow-sm">AI Health Assistant</div>
      )}

      {orbSphere}

      {/* Status indicator - Updated text style and margin */}
      <motion.div
        className={`flex items-center font-medium text-slate-600 ${compact ? "text-sm mb-3" : "text-lg mb-8"}`}
        animate={{
          color: assistantIsSpeaking
            ? [speakingColor, "#818cf8", speakingColor] // Animation overrides base color
            : [listeningColor, "#38bdf8", listeningColor] // Animation overrides base color
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <motion.span
          className="inline-block w-3 h-3 rounded-full mr-2"
          style={{
            background: assistantIsSpeaking ? speakingColor : listeningColor
          }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
        {assistantIsSpeaking
          ? "Atlas is speaking..."
          : "Listening..."}
      </motion.div>

      {/* End call button - Updated styles */}
      <motion.button
        onClick={onEndCallClick}
        className={`bg-red-500 rounded-full text-white font-medium shadow-md hover:bg-red-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2 ${
          compact ? "px-4 py-2 text-sm" : "px-6 py-3"
        }`}
        whileHover={{
          scale: 1.05,
        }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.2 }} // Keep scale/tap transition short
      >
        End session
      </motion.button>
    </div>
  );
}