"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

export const FireflyBackground = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => {
  // --- 1. 萤火虫逻辑 (修复: 移入 useState 以保持纯函数) ---
  const [fireflies] = useState(() => {
    return [...Array(30)].map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      duration: Math.random() * 10 + 10, // 慢速移动 (10-20s)
      delay: Math.random() * 5,
      size: Math.random() * 6 + 2, // 大小 1px - 5px
      moveX: Math.random() * 50 - 25, // 左右漂浮距离
    }));
  });

  // --- 2. 闪电逻辑 ---
  const [lightning, setLightning] = useState<{
    active: boolean;
    x: number; // 随机水平位置
    scale: number; // 随机大小
    rotate: number; // 随机角度
  }>({ active: false, x: 50, scale: 1, rotate: 0 });

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const triggerLightning = () => {
      // 随机触发时间 (4秒 - 16秒之间)
      const nextDelay = Math.random() * 12000 + 4000;
      
      // 触发闪电
      setLightning({
        active: true,
        x: Math.random() * 80 + 10, // 屏幕宽度的 10% - 90% 之间
        scale: Math.random() * 0.5 + 0.8, // 0.8倍 - 1.3倍大小
        rotate: Math.random() * 30 - 15, // -15度 到 +15度 倾斜
      });

      // 闪电持续时间 (300ms 后消失，制造瞬间劈下的感觉)
      setTimeout(() => {
        setLightning((prev) => ({ ...prev, active: false }));
      }, 500);

      // 循环调用
      timeoutId = setTimeout(triggerLightning, nextDelay);
    };

    // 启动循环
    timeoutId = setTimeout(triggerLightning, 5000);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className={cn("relative w-full h-full overflow-hidden bg-neutral-950", className)}>
      
      {/* --- LAYER 0: 深色背景渐变 --- */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-neutral-950 to-black z-0" />

      {/* --- LAYER 1: 萤火虫 (Particle Effects) --- */}
      {fireflies.map((fly) => (
        <motion.div
          key={fly.id}
          className="absolute rounded-full bg-red-500 blur-[1px] z-0"
          style={{
            top: fly.top,
            left: fly.left,
            width: fly.size,
            height: fly.size,
            boxShadow: "10 10 10px 2px rgba(220, 38, 38, 0.4)",
          }}
          animate={{
            y: [0, -100, 0],
            x: [0, fly.moveX, 0], // 使用 state 中预先计算好的 moveX
            opacity: [0, 0.8, 0],
            scale: [0, 1.2, 0],
          }}
          transition={{
            duration: fly.duration,
            repeat: Infinity,
            delay: fly.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* --- LAYER 2: 闪电 + 屏幕闪光 --- */}
      <AnimatePresence>
        {lightning.active && (
          <>
            {/* A. 全屏闪光 (Flash) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.15, 0] }} // 瞬间闪到 15% 透明度然后消失
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-blue-100 z-10 pointer-events-none mix-blend-overlay"
            />

            {/* B. Z字形闪电实体 (The Bolt) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: [0, 1, 0.5, 1, 0], // 闪烁效果： 出现 -> 暗 -> 亮 -> 消失
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, times: [0, 0.1, 0.3, 0.5, 1] }}
              style={{
                left: `${lightning.x}%`,
                top: "-10%", // 从屏幕上方延伸下来
                scale: lightning.scale,
                rotate: lightning.rotate,
              }}
              className="absolute z-10 pointer-events-none w-[200px] h-[600px] origin-top"
            >
              {/* SVG 绘制 Z 字形 */}
              <svg
                viewBox="0 0 100 300"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] filter"
              >
                {/* 核心闪电路径：锯齿状 */}
                <path
                  d="M50 0 L20 80 L60 80 L10 180 L50 180 L0 300"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* 外部发光晕 */}
                <path
                  d="M50 0 L20 80 L60 80 L10 180 L50 180 L0 300"
                  stroke="#47c1f1" // 浅蓝色光晕
                  strokeWidth="8"
                  strokeOpacity="0.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- LAYER 3: 你的页面内容 (Sidebar/Header 等) --- */}
      <div className="relative z-20 w-full h-full">
        {children}
      </div>
    </div>
  );
};