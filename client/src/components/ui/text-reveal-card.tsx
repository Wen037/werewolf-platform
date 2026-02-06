"use client";
import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { twMerge } from "tailwind-merge";
import { cn } from "../../lib/utils";

export const TextRevealCard = ({
  text,
  revealText,
  children,
  className,
}: {
  text: string;
  revealText: string;
  children?: React.ReactNode;
  className?: string;
}) => {
  const [widthPercentage, setWidthPercentage] = useState(0);
  const cardRef = useRef<HTMLDivElement >(null);
  const [left, setLeft] = useState(0);
  const [localWidth, setLocalWidth] = useState(0);
  const [isMouseOver, setIsMouseOver] = useState(false);

  // UPDATED useEffect to handle window resizing
  useEffect(() => {
    function updatePosition() {
      if (cardRef.current) {
        const { left, width } = cardRef.current.getBoundingClientRect();
        setLeft(left);
        setLocalWidth(width);
      }
    }

    // 1. Calculate position immediately
    updatePosition();

    // 2. Recalculate whenever the window resizes (Fixes full screen issue)
    window.addEventListener("resize", updatePosition);

    // 3. Cleanup listener when component is removed
    return () => {
      window.removeEventListener("resize", updatePosition);
    };
  }, []);

  function mouseMoveHandler(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();

    const { clientX } = event;
    if (cardRef.current) {
      const relativeX = clientX - left;
      setWidthPercentage((relativeX / localWidth) * 100);
    }
  }

  function mouseLeaveHandler() {
    setIsMouseOver(false);
    setWidthPercentage(0);
  }
  function mouseEnterHandler() {
    setIsMouseOver(true);
  }
  function touchMoveHandler(event: React.TouchEvent<HTMLDivElement>) {
    event.preventDefault();
    const clientX = event.touches[0]!.clientX;
    if (cardRef.current) {
      const relativeX = clientX - left;
      setWidthPercentage((relativeX / localWidth) * 100);
    }
  }

  const rotateDeg = (widthPercentage - 40) * 0.1;
  return (
    <div
      onMouseEnter={mouseEnterHandler}
      onMouseLeave={mouseLeaveHandler}
      onMouseMove={mouseMoveHandler}
      onTouchStart={mouseEnterHandler}
      onTouchEnd={mouseLeaveHandler}
      onTouchMove={touchMoveHandler}
      ref={cardRef}
      className={cn(
        "bg-[#1d1c20] border border-white/[0.08] w-[40rem] rounded-lg p-8 relative overflow-hidden",
        className
      )}
    >
      {children}

      <div className="h-40 relative flex items-center overflow-hidden">
        
        {/* --- 1. THE REVEAL TEXT (Survive the vote) --- */}
        <motion.div
          style={{
            width: "100%",
          }}
          animate={
            isMouseOver
              ? {
                  opacity: widthPercentage > 0 ? 1 : 0,
                  clipPath: `inset(0 ${100 - widthPercentage}% 0 0)`,
                }
              : {
                  clipPath: `inset(0 ${100 - widthPercentage}% 0 0)`,
                }
          }
          transition={isMouseOver ? { duration: 0 } : { duration: 0.4 }}
          className="absolute bg-black z-20 will-change-transform"
        >
          <p
            style={{
              fontFamily: "'Special Elite', system-ui",
              // Optional: Add a glow effect here
              textShadow: "4px 4px 15px rgba(220, 38, 38, 0.5)", 
            }}
            // UPDATED:
            // 1. Changed size: sm:text-[3rem] -> sm:text-[2.4rem] (80% size)
            // 2. Changed color: text-red-600 (Red for danger/reveal)
            className="text-base text-center w-full sm:text-[3rem] py-10 font-bold text-red-600 bg-clip-text text-transparent bg-gradient-to-b from-red-500 to-red-800"
          >
            {revealText}
          </p>
        </motion.div>

        {/* The Reveal Line Animation */}
        <motion.div
          animate={{
            left: `${widthPercentage}%`,
            rotate: `${rotateDeg}deg`,
            opacity: widthPercentage > 0 ? 1 : 0,
          }}
          transition={isMouseOver ? { duration: 0 } : { duration: 0.4 }}
          className="h-40 w-[8px] bg-gradient-to-b from-transparent via-neutral-800 to-transparent absolute z-50 will-change-transform"
        ></motion.div>

        {/* --- 2. THE HIDDEN TEXT (Trust no one) --- */}
        <div className="overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,white,transparent)]">
          <p 
            // UPDATED:
            // 1. Changed size: sm:text-[3rem] -> sm:text-[2.4rem] (80% size)
            // 2. Changed color: text-gray-500 (Dimmed color for unrevealed state)
            className="text-base sm:text-[2.4rem] py-10 font-bold bg-clip-text text-transparent bg-[#323238]"
          >
            {text}
          </p>
          
    
        </div>
      </div>
    </div>
  );
};

export const TextRevealCardTitle = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <h2 className={twMerge("text-white text-lg mb-2", className)}>
      {children}
    </h2>
  );
};

export const TextRevealCardDescription = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <p className={twMerge("text-[#a9a9a9] text-sm", className)}>{children}</p>
  );
};

// REMOVED: Stars component definition was here