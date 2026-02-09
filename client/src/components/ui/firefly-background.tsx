"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

interface Firefly {
  id: number;
  top: string;
  left: string;
  duration: number;
  delay: number;
  size: number;
  isForeground: boolean;
  side: "top" | "bottom" | "left" | "right";
}

export const FireflyBackground = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => {
  // --- 1. Firefly Logic (Lazy Initialization) ---
  // 修改点：直接在 useState 里传入一个函数。
  // 这个函数只会在组件第一次加载时运行一次，绝对稳定，且不触发 ESLint 警告。
  const [fireflies] = useState<Firefly[]>(() => {
    return [...Array(80)].map((_, i) => {
      const isForeground = Math.random() < 0.3;
      const sideRandom = Math.floor(Math.random() * 4);
      let top = "0%";
      let left = "0%";
      let side: Firefly["side"] = "top";

      switch (sideRandom) {
        case 0: // Top
          side = "top";
          top = `${Math.random() * 5 + 8}%`;
          left = `${Math.random() * 100}%`;
          break;
        case 1: // Bottom
          side = "bottom";
          top = `${Math.random() * 5 + 82}%`;
          left = `${Math.random() * 100}%`;
          break;
        case 2: // Left
          side = "left";
          top = `${Math.random() * 100}%`;
          left = `${Math.random() * 3 + 10}%`;
          break;
        case 3: // Right
          side = "right";
          top = `${Math.random() * 100}%`;
          left = `${Math.random() * 3 + 90}%`;
          break;
      }

      return {
        id: i,
        top,
        left,
        side,
        duration: Math.random() * 5 + 5,
        delay: Math.random() * 5,
        size: isForeground ? Math.random() * 6 + 4 : Math.random() * 4 + 2,
        isForeground: isForeground,
      };
    });
  });

  // --- 2. Lightning Logic ---
  const [lightning, setLightning] = useState<{
    active: boolean;
    x: number;
    scale: number;
    rotate: number;
  }>({ active: false, x: 50, scale: 1, rotate: 0 });

  useEffect(() => {
    const triggerLightning = () => {
      const nextDelay = Math.random() * 12000 + 8000;
      setLightning({
        active: true,
        x: Math.random() * 80 + 10,
        scale: Math.random() * 0.5 + 0.8,
        rotate: Math.random() * 30 - 15,
      });
      setTimeout(() => {
        setLightning((prev) => ({ ...prev, active: false }));
      }, 300);
      setTimeout(triggerLightning, nextDelay);
    };
    const timer = setTimeout(triggerLightning, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={cn("relative w-full h-full overflow-hidden bg-neutral-950", className)}>
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-neutral-950 to-black z-0" />

      {fireflies.map((fly) => (
        <motion.div
          key={fly.id}
          className={cn(
            "absolute rounded-full blur-[1px] pointer-events-none",
            fly.isForeground ? "z-50 bg-red-500" : "z-0 bg-red-300/50"
          )}
          style={{
            top: fly.top,
            left: fly.left,
            width: fly.size,
            height: fly.size,
            boxShadow: fly.isForeground 
                ? "0 0 10px 2px rgba(231, 126, 102, 0.8)" 
                : "none",
          }}
          animate={{
            y: fly.side === "top" || fly.side === "bottom" 
               ? [0, -15, 15, 0] 
               : [0, -40, 0],
            x: fly.side === "left" || fly.side === "right"
               ? [0, -5, 5, 0]
               : [0, 50, -50, 0],
            opacity: fly.isForeground ? [0, 1, 0.5, 1, 0] : [0, 0.5, 0],
            scale: [0, 1.2, 0.8, 1, 0],
          }}
          transition={{
            duration: fly.duration,
            repeat: Infinity,
            delay: fly.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      <AnimatePresence>
        {lightning.active && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.15, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-blue-100 z-10 pointer-events-none mix-blend-overlay"
            />
            <motion.div
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{ opacity: [0, 1, 0.5, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, times: [0, 0.1, 0.3, 0.5, 1] }}
              style={{
                left: `${lightning.x}%`,
                top: "-10%",
                scale: lightning.scale,
                rotate: lightning.rotate,
              }}
              className="absolute z-10 pointer-events-none w-[200px] h-[600px] origin-top"
            >
              <svg viewBox="0 0 100 300" fill="none" className="w-full h-full drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] filter">
                <path d="M50 0 L20 80 L60 80 L10 180 L50 180 L0 300" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_10px_#cyan]" />
                <path d="M50 0 L20 80 L60 80 L10 180 L50 180 L0 300" stroke="#93c5fd" strokeWidth="8" strokeOpacity="0.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="relative z-20 w-full h-full">
        {children}
      </div>
    </div>
  );
};