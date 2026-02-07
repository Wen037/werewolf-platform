import { motion } from "framer-motion"; // Note: Use 'framer-motion', not 'motion/react'
import { Vortex } from "../components/ui/vortex";
import { HoverBorderGradient } from "../components/ui/hover-border-gradient";
import { TextRevealCard } from "../components/ui/text-reveal-card";
import { AuthModal } from "../components/AuthModal";
import { useState } from 'react';
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  // 1. State for the Modal
  const [isAuthOpen, setAuthOpen] = useState(false);
  const [authView, setAuthView] = useState<"login" | "register">("login");
  const navigate = useNavigate();
  // Helper to open specific view
  const openAuth = (view: "login" | "register") => {
    setAuthView(view);
    setAuthOpen(true);
  };

  return (
    <div className="w-full h-screen overflow-hidden bg-black">
      
      {/* --- 0. THE POPUP MODAL --- */}
      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setAuthOpen(false)} 
        initialView={authView}
      />

      <Vortex
        backgroundColor="#000000" // Canvas needs Hex, not Tailwind names
        rangeY={800}
        particleCount={200}
        baseRadius={1}
        rangeRadius={2}
        baseSpeed={0.2}
        rangeSpeed={1.0}
        className="flex items-center flex-col justify-center px-2 md:px-10 py-4 w-full h-full relative"
      >
        
        {/* --- 1. The Ghostly Image --- */}
        <motion.img
          src="/werewolf_logo.png" 
          alt="Werewolf Logo"
          className="absolute z-20 w-42 h-42 md:w-64 md:h-64 opacity-30 pointer-events-none left-1/2 -translate-x-1/2 top-[11%]"
          animate={{ 
            rotate: 360,           
            opacity: [0.0,0.1, 0.2, 0.3,0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.0, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4,0.3, 0.2, 0.1, 0.0], 
          }}
          transition={{
            rotate: { duration: 60, repeat: Infinity, ease: "linear" }, 
            opacity: { duration: 60, repeat: Infinity, ease: "linear" }, 
          }}
        />

        {/* --- 2. Main Content --- */}
        <div className="relative flex flex-col items-center justify-center gap-4 w-full top-[8%] z-30">
          
          {/* TITLE */}
          <h2 style={{ textShadow: "0px 0px 20px rgba(221, 28, 183, 0.88)" }}
            className="text-white text-4xl md:text-7xl font-bold text-center tracking-tighter drop-shadow-2xl mb-4">
            WEREWOLF SG
          </h2>
          
          {/* TEXT REVEAL CARD */}
          <div className="relative z-10 flex items-center justify-center bg-transparent h-[7.2rem] rounded-2xl w-full max-w-lg mb-8 mx-auto">
              <TextRevealCard
              text="Survive the vote"
              revealText="Trust no one ."
              className="bg-transparent border-none" 
            />
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row items-center gap-6">
            
            {/* Button 1: Triggers Modal (Register) */}
            <HoverBorderGradient
              containerClassName="rounded-full"
              as="button"
              duration={1}
              className="bg-black flex items-center space-x-2 px-6 py-3" 
              onClick={() => openAuth('register')} // <--- FIX: Opens Modal
            >
              
              <span>
                Login/Register</span>
            </HoverBorderGradient>

            {/* Button 2: Find a Game */}
              <HoverBorderGradient
                containerClassName="rounded-full"
                
                // Keep it as a button! It works best this way.
                as="button" 
                
                className="bg-black flex items-center space-x-2 px-6 py-3"
                
                // 3. ADD NAVIGATION HERE
                onClick={() => navigate("/lobby")}
              >
                <span>Find a Game</span>
              </HoverBorderGradient>

          </div>
        </div>
      </Vortex>
    </div>
  );
}