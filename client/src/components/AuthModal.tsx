import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User, ArrowRight, AlertCircle } from "lucide-react";
import { AuthService } from "../services/auth.service";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: "login" | "register";
}

export const AuthModal = ({ isOpen, onClose, initialView = "login" }: AuthModalProps) => {
  const navigate = useNavigate();
  const [view, setView] = useState<"login" | "register">(initialView);

  // Register state
  const [regStep, setRegStep] = useState(1);
  const [regEmail, setRegEmail] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regOtp, setRegOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Shared UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setView(initialView); }, [initialView]);

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setRegStep(1); setRegEmail(""); setRegUsername(""); setRegPassword(""); setRegOtp("");
        setCooldown(0); setLoginEmail(""); setLoginPassword(""); setError(null); setLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [cooldown]);

  // ── Register Step 1: send OTP ──────────────────────────────────────────────
  const handleSendOtp = async () => {
    setError(null);
    if (!regEmail || !regUsername || !regPassword) {
      setError("All fields are required."); return;
    }
    setLoading(true);
    try {
      await AuthService.register(regEmail, regUsername, regPassword);
      setRegStep(2);
      setCooldown(60);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  // ── Register Step 2: verify OTP ───────────────────────────────────────────
  const handleVerifyOtp = async () => {
    setError(null);
    if (regOtp.length !== 6) { setError("Enter the 6-digit code."); return; }
    setLoading(true);
    try {
      await AuthService.verifyOtp(regEmail, regOtp);
      onClose();
      navigate("/lobby");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  // ── Google OAuth ───────────────────────────────────────────────────────────
  const handleGoogleLogin = () => {
    // In local dev, leave this relative so Vite's proxy (see vite.config.ts) forwards
    // /api/* to http://localhost:5000. In production builds, VITE_API_URL (or the
    // werewolf.sg API domain) is used so the redirect goes straight to the live API.
    const apiOrigin = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "" : "https://api.werewolf.sg");
    window.location.href = `${apiOrigin}/api/auth/google`;
  };

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    setError(null);
    if (!loginEmail || !loginPassword) { setError("Email and password required."); return; }
    setLoading(true);
    try {
      await AuthService.login(loginEmail, loginPassword);
      onClose();
      navigate("/lobby");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-neutral-900 border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[90vh]">

              {/* Tabs */}
              <div className="flex justify-between items-center p-4 border-b border-white/5">
                <div className="flex gap-4 text-sm font-bold">
                  <button
                    onClick={() => { setView("login"); setError(null); }}
                    className={view === "login" ? "text-white" : "text-neutral-500 hover:text-neutral-300"}
                  >LOGIN</button>
                  <button
                    onClick={() => { setView("register"); setError(null); }}
                    className={view === "register" ? "text-white" : "text-neutral-500 hover:text-neutral-300"}
                  >REGISTER</button>
                </div>
                <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">

                {/* Error banner */}
                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">
                    <AlertCircle size={14} className="shrink-0" /> {error}
                  </div>
                )}

                {/* ── LOGIN ── */}
                {view === "login" && (
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <h2 className="text-2xl font-bold text-white mb-6">
                      Welcome Back,<br />
                      <span className="text-neutral-400 text-lg font-normal">The village awaits.</span>
                    </h2>

                    <div className="space-y-3">
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 text-neutral-500" size={18} />
                        <input
                          type="email" placeholder="Email" value={loginEmail}
                          onChange={e => setLoginEmail(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleLogin()}
                          className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 pl-10 text-white focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 text-neutral-500" size={18} />
                        <input
                          type="password" placeholder="Password" value={loginPassword}
                          onChange={e => setLoginPassword(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleLogin()}
                          className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 pl-10 text-white focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleLogin} disabled={loading}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg shadow-lg mt-2 transition-all"
                    >
                      {loading ? "Logging in…" : "Enter Village"}
                    </button>

                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-[#171717] px-2 text-neutral-500">Or login with</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      className="w-full flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white py-2.5 rounded-lg text-sm font-medium transition-all"
                    >
                      <span className="text-red-500 font-bold">G</span> Google
                    </button>
                  </motion.div>
                )}

                {/* ── REGISTER ── */}
                {view === "register" && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <h2 className="text-2xl font-bold text-white mb-2">Join the Pack</h2>

                    <div className="flex gap-2 mb-6">
                      {[1, 2].map(s => (
                        <div key={s} className={`h-1 w-10 rounded-full ${regStep >= s ? "bg-blue-500" : "bg-neutral-800"}`} />
                      ))}
                    </div>

                    {/* Step 1: email + username + password */}
                    {regStep === 1 && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-right-4">
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 text-neutral-500" size={18} />
                          <input
                            type="email" placeholder="Email" value={regEmail}
                            onChange={e => setRegEmail(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 pl-10 text-white focus:border-blue-500 outline-none"
                          />
                        </div>
                        <div className="relative">
                          <User className="absolute left-3 top-3 text-neutral-500" size={18} />
                          <input
                            type="text" placeholder="Username (letters, numbers, _)" value={regUsername}
                            onChange={e => setRegUsername(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 pl-10 text-white focus:border-blue-500 outline-none"
                          />
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 text-neutral-500" size={18} />
                          <input
                            type="password" placeholder="Password (min 8 chars)" value={regPassword}
                            onChange={e => setRegPassword(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 pl-10 text-white focus:border-blue-500 outline-none"
                          />
                        </div>
                        <button
                          onClick={handleSendOtp} disabled={loading}
                          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
                        >
                          {loading ? "Sending…" : <><span>Send Verification Code</span><ArrowRight size={16} /></>}
                        </button>

                        <div className="relative my-4">
                          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-[#171717] px-2 text-neutral-500">Or join with</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleGoogleLogin}
                          className="w-full flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white py-2.5 rounded-lg text-sm font-medium transition-all"
                        >
                          <span className="text-red-500 font-bold">G</span> Google
                        </button>
                      </div>
                    )}

                    {/* Step 2: OTP */}
                    {regStep === 2 && (
                      <div className="space-y-4 text-center animate-in fade-in slide-in-from-right-4">
                        <p className="text-sm text-neutral-400">
                          A 6-digit code was sent to <span className="text-white font-medium">{regEmail}</span>
                        </p>
                        <input
                          type="text" inputMode="numeric" placeholder="123456"
                          value={regOtp} onChange={e => setRegOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          onKeyDown={e => e.key === "Enter" && handleVerifyOtp()}
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-center tracking-widest text-xl text-white outline-none focus:border-blue-500"
                        />
                        <button
                          onClick={handleVerifyOtp} disabled={loading}
                          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-lg font-bold transition-all"
                        >
                          {loading ? "Verifying…" : "Verify & Create Account"}
                        </button>
                        <div className="text-xs text-neutral-500">
                          {cooldown > 0
                            ? `Resend in ${cooldown}s`
                            : <span className="text-blue-400 cursor-pointer" onClick={handleSendOtp}>Resend Code</span>
                          }
                        </div>
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
