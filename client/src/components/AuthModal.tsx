import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, ArrowRight } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: "login" | "register";
}

export const AuthModal = ({ isOpen, onClose, initialView = "login" }: AuthModalProps) => {
  const [view, setView] = useState<"login" | "register">(initialView);
  
  // Register Logic States
  const [regStep, setRegStep] = useState(1);
  const [regEmail, setRegEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Sync internal state if prop changes
  useEffect(() => { setView(initialView); }, [initialView]);
// 2. NEW: Reset State when closing
  useEffect(() => {
    if (!isOpen) {
      // Wait 500ms for the "fade out" animation to finish before resetting
      const timer = setTimeout(() => {
        setRegStep(1);
        setRegEmail("");
        setCooldown(0);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  // Timer Logic
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSendOtp = () => {
    if (!regEmail) return;
    setCooldown(10);
    setRegStep(2);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 1. Backdrop (Blurry & Dark) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* 2. The Modal Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-neutral-900/90 border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[90vh]">
              
              {/* Header: Close Button & Tabs */}
              <div className="flex justify-between items-center p-4 border-b border-white/5">
                <div className="flex gap-4 text-sm font-bold">
                  <button 
                    onClick={() => setView("login")} 
                    className={`${view === "login" ? "text-white" : "text-neutral-500 hover:text-neutral-300"}`}
                  >
                    LOGIN
                  </button>
                  <button 
                    onClick={() => setView("register")} 
                    className={`${view === "register" ? "text-white" : "text-neutral-500 hover:text-neutral-300"}`}
                  >
                    REGISTER
                  </button>
                </div>
                <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Content Area */}
              <div className="p-6 overflow-y-auto">
                
                {/* --- LOGIN VIEW --- */}
                {view === "login" && (
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <h2 className="text-2xl font-bold text-white mb-6">Welcome Back, <br/><span className="text-neutral-400 text-lg font-normal">The village awaits.</span></h2>
                    
                    <div className="space-y-3">
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 text-neutral-500" size={18} />
                        <input type="email" placeholder="Email" className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 pl-10 text-white focus:border-blue-500 outline-none" />
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 text-neutral-500" size={18} />
                        <input type="password" placeholder="Password" className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 pl-10 text-white focus:border-blue-500 outline-none" />
                      </div>
                    </div>

                    <button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-lg shadow-lg mt-2">
                      Enter Village
                    </button>

                    {/* NEW: Register Socials */}
                        <div className="relative my-4">
                          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                          <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#171717] px-2 text-neutral-500">Or login with</span></div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <button className="flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white py-2.5 rounded-lg transition-all text-sm font-medium">
                            <span className="text-red-500 font-bold">G</span> Google
                          </button>
                          <button className="flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white py-2.5 rounded-lg transition-all text-sm font-medium">
                            <span className="text-green-500 font-bold">💬</span> WeChat
                          </button>
                        </div>
                  </motion.div>
                )}

                {/* --- REGISTER VIEW --- */}
                {view === "register" && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <h2 className="text-2xl font-bold text-white mb-2">Join the Pack</h2>
                    
                    {/* Progress Dots */}
                    <div className="flex gap-2 mb-6">
                       {[1,2,3].map(s => <div key={s} className={`h-1 w-8 rounded-full ${regStep >= s ? 'bg-blue-500' : 'bg-neutral-800'}`}/>)}
                    </div>

                    {/* Step 1: Email + Socials */}
                    {regStep === 1 && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <input 
                          type="email" placeholder="Your Email" 
                          value={regEmail} onChange={e => setRegEmail(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-blue-500" 
                        />
                        <button onClick={handleSendOtp} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2">
                          Send Code <ArrowRight size={16}/>
                        </button>

                        {/* NEW: Register Socials */}
                        <div className="relative my-4">
                          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                          <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#171717] px-2 text-neutral-500">Or join with</span></div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <button className="flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white py-2.5 rounded-lg transition-all text-sm font-medium">
                            <span className="text-red-500 font-bold">G</span> Google
                          </button>
                          <button className="flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white py-2.5 rounded-lg transition-all text-sm font-medium">
                            <span className="text-green-500 font-bold">💬</span> WeChat
                          </button>
                        </div>
                      </div>
                    )}

                    {regStep === 2 && (
                      <div className="space-y-4 text-center">
                        <p className="text-xs text-neutral-400">Code sent to {regEmail}</p>
                        <input type="text" placeholder="123456" className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-center tracking-widest text-xl text-white outline-none focus:border-blue-500" />
                        <button onClick={() => setRegStep(3)} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold">Verify</button>
                        <div className="text-xs text-neutral-500">{cooldown > 0 ? `Resend in ${cooldown}s` : <span className="text-blue-400 cursor-pointer">Resend</span>}</div>
                      </div>
                    )}

                    {regStep === 3 && (
                      <div className="space-y-4">
                        <input type="password" placeholder="New Password" className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white outline-none" />
                        <input type="password" placeholder="Confirm Password" className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white outline-none" />
                        <button className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-lg font-bold">Complete Registration</button>
                      </div>
                    )}
                  </motion.div>
                )}

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};