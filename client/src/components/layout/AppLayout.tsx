"use client";
import React, { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "../ui/sidebar";
import { IconLogin, IconLogout, IconMail, IconShieldCheck } from "@tabler/icons-react";
import { useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { FireflyBackground } from "../ui/firefly-background";
import { motion } from "framer-motion";

import { ContactModal } from "../ContactModal";
import { AuthModal } from "../AuthModal";
import { AuthService } from "../../services/auth.service";
import { getUsernameColor } from "../../types";
import { useLang } from "../../context/LanguageContext";

// ── Debug mock users (dev only) ───────────────────────────────────────────
const DEBUG_USERS = [
  { label: "AlphaWolf (Grandmaster 152cr)", id: "u1",  username: "AlphaWolf",    email: "alpha@wolf.sg",     role: "player"    as const, skillLevel: "Expert"       as const, isVerified: true,  creditScore: 152 },
  { label: "SeerSally (Advanced)",      id: "u2",  username: "SeerSally",    email: "sally@seer.sg",     role: "player"    as const, skillLevel: "Advanced"     as const, isVerified: true,  creditScore: 138 },
  { label: "ModeratorMike (Admin)",     id: "u8",  username: "ModeratorMike",email: "mike@host.sg",      role: "admin"     as const, skillLevel: "Expert"       as const, isVerified: true,  creditScore: 200 },
  { label: "NoobHunter (Newbie 100cr)", id: "u3",  username: "NoobHunter",   email: "hunter@game.sg",    role: "player"    as const, skillLevel: "Beginner"     as const, isVerified: false, creditScore: 100 },
  { label: "JesterJack (⚠ Flagged 96cr)",id:"u14", username: "JesterJack",  email: "jack@fool.sg",      role: "player"    as const, skillLevel: "Beginner"     as const, isVerified: false, creditScore: 96  },
  { label: "WolfDenOwner (Wolf's Den)", id: "u16", username: "WolfDenOwner", email: "owner@wolfsden.sg", role: "player"    as const, skillLevel: "Intermediate" as const, isVerified: true,  creditScore: 120 },
  { label: "Wen037 (Web Admin 👑)",     id: "u17", username: "Wen037",       email: "e1062715@u.nus.edu",role: "web_admin" as const, skillLevel: "Expert"       as const, isVerified: true,  creditScore: 999 },
];

function DebugPanel() {
  const [open, setOpen] = React.useState(false);
  if (!import.meta.env.DEV) return null;

  const loginAs = (u: typeof DEBUG_USERS[number]) => {
    localStorage.setItem("token", "debug-fake-token-" + u.id);
    localStorage.setItem("user", JSON.stringify({
      id: u.id, username: u.username, email: u.email,
      role: u.role, skillLevel: u.skillLevel, isVerified: u.isVerified, creditScore: u.creditScore,
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
  const { lang, toggle, t } = useLang();

  const getPageTitle = (path: string) => {
    switch (path) {
      case "/lobby":     return t("Game Map");
      case "/gamespace": return t("Game Space");
      case "/my-events": return t("My Events");
      case "/profile":   return t("My Profile");
      default:           return t("Dashboard");
    }
  };

  const currentTitle = getPageTitle(location.pathname);

  const links = [
    {
      label: t("Find Games"),
      href: "/lobby",
      icon: (
        <img src="/findGame.png" alt="Wolf" className="h-6 w-6 flex-shrink-0 rounded-full bg-white/10 p-0.5" />
      ),
      visible: true,
    },
    {
      label: t("Game Space"),
      href: "/gamespace",
      icon: (
        <img src="/Space.png" alt="Village" className="h-6 w-6 flex-shrink-0 rounded-full bg-white/10 p-0.5" />
      ),
      visible: true,
    },
    {
      label: t("My Events"),
      href: "/myevents",
      icon: (
        <img src="/myEvents.png" alt="Scroll" className="h-6 w-6 flex-shrink-0 rounded-full bg-white/10 p-0.5" />
      ),
      visible: isLoggedIn,
    },
    {
      label: t("My Profile"),
      href: "/myprofile",
      icon: (
        <img src="/logo_white.png" alt="Profile" className="h-6 w-6 flex-shrink-0 rounded-full" />
      ),
      visible: isLoggedIn,
    },
    {
      label: t("Admin"),
      href: "/admin",
      icon: <IconShieldCheck className="h-6 w-6 text-amber-400" />,
      visible: isLoggedIn && (currentUser?.role === "admin" || currentUser?.role === "web_admin"),
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
                   link={{ label: t("Logout"), href: "#", icon: <IconLogout className="h-6 w-6 text-neutral-200" /> }}
                   onClick={() => AuthService.logout()}
                 />
               ) : (
                 <SidebarLink
                   link={{ label: t("Login"), href: "#", icon: <IconLogin className="h-6 w-6 text-neutral-200" /> }}
                   onClick={(e) => { e.preventDefault(); setAuthOpen(true); }}
                 />
               )}

               <SidebarLink
                 link={{ label: t("Contact Us"), href: "#", icon: <IconMail className="h-6 w-6 text-neutral-200" /> }}
                 onClick={(e) => {
                   e.preventDefault();
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
                {/* Language toggle */}
                <button
                  onClick={toggle}
                  className="px-2.5 py-1 rounded-full border border-white/15 text-neutral-400 hover:text-white hover:border-white/30 text-xs font-semibold transition-colors tracking-wide"
                  title={lang === 'en' ? 'Switch to Chinese' : '切换英文'}
                >
                  {lang === 'en' ? 'CN' : 'EN'}
                </button>
                <span className="text-neutral-300 text-sm hidden md:inline">
                    {isLoggedIn ? (
                      <>{t('Welcome back,')} <span className={`font-medium ${currentUser ? getUsernameColor(currentUser) : 'text-white'}`}>{userName}</span></>
                    ) : (
                      t("Guest View")
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