import { cn } from "../../lib/utils";
import React, { useEffect, useRef } from "react";
import { createNoise3D } from "simplex-noise";
import { motion } from "framer-motion";

interface VortexProps {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  particleCount?: number;
  rangeY?: number;
  baseHue?: number;
  baseSpeed?: number;
  rangeSpeed?: number;
  baseRadius?: number;
  rangeRadius?: number;
  backgroundColor?: string;
}

export const Vortex = ({
  children,
  className,
  containerClassName,
  particleCount = 700,
  rangeY = 100,
  baseHue = 220,
  baseSpeed = 0.0,
  rangeSpeed = 1.5,
  baseRadius = 1,
  rangeRadius = 2,
  backgroundColor = "#000000",
}: VortexProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlePropCount = 9;
  const particlePropsLength = particleCount * particlePropCount;
  const rangeYRef = useRef(rangeY);
  const baseSpeedRef = useRef(baseSpeed);
  const rangeSpeedRef = useRef(rangeSpeed);
  const baseRadiusRef = useRef(baseRadius);
  const rangeRadiusRef = useRef(rangeRadius);
  const noise3D = createNoise3D();
  let tick = 0;
  const noiseSteps = 8;
  const xOff = 0.00125;
  const yOff = 0.00125;
  const zOff = 0.0005;

  useEffect(() => {
    rangeYRef.current = rangeY;
    baseSpeedRef.current = baseSpeed;
    rangeSpeedRef.current = rangeSpeed;
    baseRadiusRef.current = baseRadius;
    rangeRadiusRef.current = rangeRadius;
  }, [rangeY, baseSpeed, rangeSpeed, baseRadius, rangeRadius]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      // FIX: Reverted to Window size to guarantee visibility
      const { innerWidth, innerHeight } = window;
      canvas.width = innerWidth;
      canvas.height = innerHeight;
    };

    const particleProps = new Float32Array(particlePropsLength);

    const initParticle = (i: number) => {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const vx = 0;
      const vy = 0;
      const life = 0;
      const ttl = baseSpeedRef.current + Math.random() * rangeSpeedRef.current;
      const speed = baseSpeedRef.current + Math.random() * rangeSpeedRef.current;
      const radius = baseRadiusRef.current + Math.random() * rangeRadiusRef.current;
      const hue = baseHue + Math.random() * 100;

      particleProps.set([x, y, vx, vy, life, ttl, speed, radius, hue], i);
    };

    const drawParticle = (x: number, y: number, x2: number, y2: number, life: number, ttl: number, radius: number, hue: number, ctx: CanvasRenderingContext2D) => {
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineWidth = radius;
      ctx.strokeStyle = `hsla(${hue},100%,60%,${fadeInOut(life, ttl)})`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.closePath();
      ctx.restore();
    };

    const updateParticle = (i: number, ctx: CanvasRenderingContext2D) => {
      const i2 = 1 + i, i5 = 4 + i, i6 = 5 + i, i7 = 6 + i, i8 = 7 + i, i9 = 8 + i;
      const x = particleProps[i];
      const y = particleProps[i2];
      const n = noise3D(x * xOff, y * yOff, tick * zOff) * noiseSteps * Math.PI * 2;
      const vx = Math.cos(n);
      const vy = Math.sin(n);
      let life = particleProps[i5];
      const ttl = particleProps[i6];
      const speed = particleProps[i7];
      const x2 = x + vx * speed;
      const y2 = y + vy * speed;
      const radius = particleProps[i8];
      const hue = particleProps[i9];

      drawParticle(x, y, x2, y2, life, ttl, radius, hue, ctx);

      life++;
      particleProps[i] = x2;
      particleProps[i2] = y2;
      particleProps[i5] = life;

      if (checkBounds(x, y, canvas) || life > ttl) {
        initParticle(i);
      }
    };

    const checkBounds = (x: number, y: number, canvas: HTMLCanvasElement) => {
      return x > canvas.width || x < 0 || y > canvas.height || y < 0;
    };

    const fadeInOut = (t: number, m: number) => {
      const hm = 0.5 * m;
      return Math.abs((t + hm) % m - hm) / hm;
    };

    const draw = () => {
      tick++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      for (let i = 0; i < particlePropsLength; i += particlePropCount) {
        updateParticle(i, ctx);
      }
      
      requestAnimationFrame(draw);
    };

    resize();
    // Re-init particles on resize to fill the new space
    for (let i = 0; i < particlePropsLength; i += particlePropCount) {
      initParticle(i);
    }
    
    draw();

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
    };
  }, [backgroundColor, baseHue, particleCount, noise3D]); 

  return (
    <div className={cn("relative h-full w-full", containerClassName)} ref={containerRef}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        ref={containerRef}
        className="absolute inset-0 z-0 flex h-full w-full items-center justify-center bg-transparent"
      >
        <canvas ref={canvasRef} />
      </motion.div>
      <div className={cn("relative z-10", className)}>
        {children}
      </div>
    </div>
  );
};