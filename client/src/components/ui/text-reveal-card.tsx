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
  const cardRef = useRef<HTMLDivElement>(null);
  const [left, setLeft] = useState(0);
  const [localWidth, setLocalWidth] = useState(0);
  const [isMouseOver, setIsMouseOver] = useState(false);

  useEffect(() => {
    if (cardRef.current) {
      const { left, width: localWidth } =
        cardRef.current.getBoundingClientRect();
      setLeft(left);
      setLocalWidth(localWidth);
    }
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
      // CHANGE 1: Removed bg-[#1d1c20] and border. Set to bg-transparent.
      className={cn(
        "bg-transparent w-[40rem] rounded-lg p-8 relative overflow-hidden",
        className
      )}
    >
      {children}

      <div className="h-40 relative flex items-center overflow-hidden">
        
        {/* --- REVEAL LAYER (RED) --- */}
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
          // CHANGE 2: Removed "bg-black". It is now transparent.
          className="absolute z-20 will-change-transform"
        >
          <p
            style={{
              fontFamily: '"Special Elite", cursive', // Your font
              textShadow: "4px 4px 15px rgba(220, 38, 38, 0.5)",
            }}
            className="text-center w-full text-base sm:text-[2.4rem] py-10 font-bold text-red-600 bg-clip-text text-transparent bg-gradient-to-b from-red-500 to-red-800"
          >
            {revealText}
          </p>
        </motion.div>

        {/* The Reveal Line (Separator) */}
        <motion.div
          animate={{
            left: `${widthPercentage}%`,
            rotate: `${rotateDeg}deg`,
            opacity: widthPercentage > 0 ? 1 : 0,
          }}
          transition={isMouseOver ? { duration: 0 } : { duration: 0.4 }}
          className="h-40 w-[8px] bg-gradient-to-b from-transparent via-neutral-800 to-transparent absolute z-50 will-change-transform"
        ></motion.div>

        {/* --- HIDDEN LAYER (GREY) --- */}
        {/* CHANGE 3: Added motion.div wrapper with INVERSE clip-path */}
        {/* This hides the grey text as the red text appears, preventing overlap */}
        <motion.div 
            className="overflow-hidden w-full"
            animate={
                isMouseOver
                  ? {
                      // Hides the LEFT side as mouse moves right
                      clipPath: `inset(0 0 0 ${widthPercentage}%)`,
                    }
                  : {
                      clipPath: `inset(0 0 0 ${widthPercentage}%)`,
                    }
              }
            transition={isMouseOver ? { duration: 0 } : { duration: 0.4 }}
        >
          <p 
            style={{ 
                fontFamily: '"Special Elite", cursive', // Your font
                textShadow: "4px 4px 15px rgba(200, 19, 224, 0.5)", 
            }} 
            className="text-center w-full text-base sm:text-[2.4rem] py-10 font-bold bg-clip-text text-transparent bg-[#E6DEDC]"
          >
            {text}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

// ... Title and Description exports (Unchanged)
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