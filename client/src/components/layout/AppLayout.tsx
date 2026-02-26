"use client";
import React, { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "../ui/sidebar";
import { IconLogin, IconLogout } from "@tabler/icons-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { FireflyBackground } from "../ui/firefly-background";
import { motion } from "framer-motion";

// Mock Data
const MOCK_IS_LOGGED_IN = true; 
const MOCK_USER_NAME = "Hunter_01";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const getPageTitle = (path: string) => {
    switch (path) {
      case "/lobby": return "Game Map";
      case "/gamespace": return "Game Space";
      case "/my-events": return "My Events";
      case "/profile": return "My Profile";
      default: return "Dashboard"; 
    }
  };

  const currentTitle = getPageTitle(location.pathname);

  const links = [
    {
      label: "Find Games",
      href: "/lobby",
      icon: (
        <img src="/findGame.png" alt="Wolf" className="h-6 w-6 flex-shrink-0 rounded-full bg-white/10 p-0.5" />
      ),
      visible: true,
    },
    {
      label: "Game Space",
      href: "/gamespace",
      icon: (
        <img src="/Space.png" alt="Village" className="h-6 w-6 flex-shrink-0 rounded-full bg-white/10 p-0.5" />
      ),
      visible: true,
    },
    {
      label: "My Events",
      href: "/myevents",
      icon: (
        <img src="/myEvents.png" alt="Scroll" className="h-6 w-6 flex-shrink-0 rounded-full bg-white/10 p-0.5" />
      ),
      visible: MOCK_IS_LOGGED_IN,
    },
    {
      label: "My Profile",
      href: "/myprofile",
      icon: (
        <img src="/logo_white.png" alt="Profile" className="h-6 w-6 flex-shrink-0 rounded-full" />
      ),
      visible: MOCK_IS_LOGGED_IN,
    },
  ];

  return (
    <FireflyBackground className="h-screen w-full">
      <div
        className={cn(
          "w-[95%] max-w-7xl h-[85vh]",
          "flex flex-col md:flex-row overflow-hidden",
          "rounded-3xl border border-white/10",
          "bg-black/40 backdrop-blur-md shadow-2xl mx-auto",
          "bg-transparent relative top-[7vh]" 
        )}
      >
        <Sidebar open={open} setOpen={setOpen}>
          <SidebarBody className="justify-between gap-20 bg-black/20 backdrop-blur-sm">
            <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
              
              <div className="mt-32 flex flex-col gap-2">
                {links.filter(link => link.visible).map((link, idx) => (
                    <SidebarLink key={idx} link={link} />
                ))}
              </div>
            </div>
            
            <div className="border-t border-white/5 pt-4">
               {MOCK_IS_LOGGED_IN ? (
                 <SidebarLink
                   link={{ label: "Logout", href: "#", icon: <IconLogout className="h-6 w-6 text-neutral-200" /> }}
                   onClick={() => navigate("/")}
                 />
               ) : (
                 <SidebarLink
                   link={{ label: "Login", href: "/login", icon: <IconLogin className="h-6 w-6 text-neutral-200" /> }}
                 />
               )}
            </div>
          </SidebarBody>
        </Sidebar>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="flex flex-1 flex-col h-full relative">
          
          {/* HEADER */}
          <div className="w-full h-16 border-b border-white/5 flex items-center justify-between px-6 bg-black/20 backdrop-blur-sm z-20">
              
              {/* Title & Rotating Logo */}
              <h1 className="text-white text-xl font-bold tracking-tight text-shadow-sm flex items-center gap-2">
                  <motion.img
                    src="/logo_red.png"   
                    alt="Rotating Logo"
                    className="h-8 w-8"   
                    animate={{ rotate: 360 }}
                    transition={{ 
                      duration: 20,       
                      repeat: Infinity,   
                      ease: "linear"      
                    }}
                  />
                  <span className="text-neutral font-extrabold hidden md:inline">Werewolf SG</span> 
                  <span className="text-neutral-500 hidden md:inline"> - </span> 
                  <span>{currentTitle}</span>
              </h1>

              {/* User Info */}
              <div className="flex items-center gap-3">
                <span className="text-neutral-300 text-sm hidden md:inline">
                    {MOCK_IS_LOGGED_IN ? (
                      <>Welcome back, <span className="text-white font-medium">{MOCK_USER_NAME}</span></>
                    ) : (
                      "Guest View"
                    )}
                </span>
                {MOCK_IS_LOGGED_IN && (
                  <div className="h-8 w-8 rounded-full bg-red-900/40 border border-red-500/30 flex items-center justify-center text-red-100 text-xs font-bold shadow-[0_0_10px_rgba(220,38,38,0.3)]">
                      {MOCK_USER_NAME.substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
          </div>

          {/* PAGE CONTENT SLOT */}
          <div className="p-0 flex flex-col flex-1 w-full h-full overflow-hidden relative">
            {children}
          </div>
        </div>
      </div>
    </FireflyBackground>
  );
}