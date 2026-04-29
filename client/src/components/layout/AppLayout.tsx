"use client";
import React, { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "../ui/sidebar";
import { IconLogin, IconLogout, IconMail } from "@tabler/icons-react";
import { useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { FireflyBackground } from "../ui/firefly-background";
import { motion } from "framer-motion";

import { ContactModal } from "../ContactModal";
import { AuthModal } from "../AuthModal";
import { AuthService } from "../../services/auth.service";

// ── Debug mock users (dev only) ───────────────────────────────────────────
const DEBUG_USERS = [
  { label: "AlphaWolf (Expert)",       id: "u1",  username: "AlphaWolf",    email: "alpha@wolf.sg",   role: "player" as const, skillLevel: "Expert" as const,       isVerified: true  },
  { label: "SeerSally (Advanced)",      id: "u2",  username: "SeerSally",    email: "sally@seer.sg",   role: "player" as const, skillLevel: "Advanced" as const,     isVerified: true  },
  { label: "ModeratorMike (Admin)",     id: "u8",  username: "ModeratorMike",email: "mike@host.sg",    role: "admin"  as const, skillLevel: "Expert" as const,       isVerified: true  },
  { label: "NoobHunter (Beginner)",     id: "u3",  username: "NoobHunter",   email: "hunter@game.sg",  role: "player" as const, skillLevel: "Beginner" as const,     isVerified: false },
];

function DebugPanel() {
  const [open, setOpen] = React.useState(false);
  if (!import.meta.env.DEV) return null;

  const loginAs = (u: typeof DEBUG_USERS[number]) => {
    localStorage.setItem("token", "debug-fake-token-" + u.id);
    localStorage.setItem("user", JSON.stringify({
      id: u.id, username: u.username, email: u.email,
      role: u.role, skillLevel: u.skillLevel, isVerified: u.isVerified,
    }));
    window.location.reload();
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.reload();
  };

  const current = AuthService.getCurrentUser();

  return (
    <div className="fixed bottom-4 right-4 z-[300] flex flex-col items-end gap-2">
      {open && (
        <div className="bg-neutral-900 border border-yellow-500/40 rounded-2xl p-4 shadow-2xl w-56 space-y-2">
          <p className="text-yellow-400 text-xs font-bold uppercase tracking-wider mb-1">🐛 Debug — Quick Login</p>
          {current && (
            <p className="text-neutral-400 text-[11px] truncate">
              Logged in as <span className="text-white font-semibold">{current.username}</span>
            </p>
          )}
          <div className="space-y-1.5">
            {DEBUG_USERS.map(u => (
              <button
                key={u.id}
                onClick={() => loginAs(u)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  current?.id === u.id
                    ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                    : "bg-white/5 text-neutral-300 hover:bg-white/10"
                }`}
              >
                {current?.id === u.id ? "✓ " : ""}{u.label}
              </button>
            ))}
          </div>
          {current && (
            <button
              onClick={logout}
              className="w-full text-center px-3 py-2 rounded-xl text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors mt-1"
            >
              Logout
            </button>
          )}
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        className="px-3 py-1.5 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-xs font-bold hover:bg-yellow-500/30 transition-colors shadow-lg"
      >
        🐛 Debug
      </button>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const isLoggedIn = AuthService.isLoggedIn();
  const currentUser = AuthService.getCurrentUser();
  const userName = currentUser?.username ?? "Guest";
  
  const [isContactOpen, setContactOpen] = useState(false);
  const [isAuthOpen, setAuthOpen] = useState(false);

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
      visible: isLoggedIn,
    },
    {
      label: "My Profile",
      href: "/myprofile",
      icon: (
        <img src="/logo_white.png" alt="Profile" className="h-6 w-6 flex-shrink-0 rounded-full" />
      ),
      visible: isLoggedIn,
    },
  ];

  return (
    <FireflyBackground className="h-screen w-full">

      <DebugPanel />

      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setContactOpen(false)}
      />
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setAuthOpen(false)}
      />

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
            
            {/* 5. ADDED FLEX COLUMN TO STACK LOGOUT & CONTACT US */}
            <div className="border-t border-white/5 pt-4 flex flex-col gap-2">
               {isLoggedIn ? (
                 <SidebarLink
                   link={{ label: "Logout", href: "#", icon: <IconLogout className="h-6 w-6 text-neutral-200" /> }}
                   onClick={() => AuthService.logout()}
                 />
               ) : (
                 <SidebarLink
                   link={{ label: "Login", href: "#", icon: <IconLogin className="h-6 w-6 text-neutral-200" /> }}
                   onClick={(e) => { e.preventDefault(); setAuthOpen(true); }}
                 />
               )}
               
               {/* 6. ADDED CONTACT US SIDEBAR LINK */}
               <SidebarLink
                 link={{ label: "Contact Us", href: "#", icon: <IconMail className="h-6 w-6 text-neutral-200" /> }}
                 onClick={(e) => {
                   e.preventDefault(); // Prevents href="#" from jumping to top of page
                   setContactOpen(true);
                 }}
               />
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
                    {isLoggedIn ? (
                      <>Welcome back, <span className="text-white font-medium">{userName}</span></>
                    ) : (
                      "Guest View"
                    )}
                </span>
                {isLoggedIn && (
                  <div className="h-8 w-8 rounded-full bg-red-900/40 border border-red-500/30 flex items-center justify-center text-red-100 text-xs font-bold shadow-[0_0_10px_rgba(220,38,38,0.3)]">
                      {userName.substring(0, 2).toUpperCase()}
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