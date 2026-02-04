import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BackgroundBeams } from '../components/ui/BackgroundBeams';
import { ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  
  // Timer State
  const [cooldown, setCooldown] = useState(0);

  // Timer Logic: Decrement cooldown every second
  useEffect(() => {
    if (cooldown > 0) {
      const timerId = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timerId);
    }
  }, [cooldown]);

  const handleSendOtp = () => {
    // Mock Sending Email
    if (!email) return alert("Please enter an email");
    
    // Start 10s Countdown
    setCooldown(10); 
    setStep(2);
  };

  const handleResendOtp = () => {
    setCooldown(10);
    alert("New code sent!");
  };

  return (
    <div className="min-h-screen w-full rounded-md bg-neutral-950 relative flex flex-col items-center justify-center antialiased">
      
      {/* Background Effect */}
      <BackgroundBeams className="opacity-40" />

      <div className="max-w-2xl mx-auto p-4 relative z-10 w-full">
        <h1 className="text-4xl md:text-5xl bg-clip-text text-transparent bg-gradient-to-b from-neutral-200 to-neutral-600 text-center font-bold mb-2">
          Join the Village
        </h1>
        <p className="text-neutral-500 text-center text-sm mb-8">
          Survive the night. protect your identity.
        </p>

        {/* Card */}
        <div className="bg-black/60 backdrop-blur-md border border-neutral-800 rounded-xl p-6 shadow-2xl">
          
          {/* Progress Steps */}
          <div className="flex gap-2 mb-8 justify-center">
            {[1, 2, 3].map(n => (
              <div key={n} className={`h-1 w-16 rounded-full transition-all duration-500 ${step >= n ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'bg-neutral-800'}`} />
            ))}
          </div>

          {/* --- STEP 1: EMAIL --- */}
          {step === 1 && (
             <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
               <label className="text-xs text-neutral-400 ml-1">WEREWOLF'S EMAIL</label>
               <input 
                 type="email" 
                 placeholder="name@example.com" 
                 className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-teal-500 outline-none transition-all placeholder-neutral-600"
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
               />
               <button 
                 onClick={handleSendOtp}
                 className="w-full bg-teal-600 text-white p-3 rounded-lg font-bold hover:bg-teal-500 transition-all flex items-center justify-center gap-2 hover:translate-y-[-1px]"
               >
                 Send Verification Code <ArrowRight size={16}/>
               </button>
             </div>
          )}

          {/* --- STEP 2: OTP --- */}
          {step === 2 && (
             <div className="space-y-5 text-center animate-in fade-in slide-in-from-right-4 duration-300">
               <p className="text-neutral-400 text-sm">
                 We sent a magical code to <span className="text-teal-400">{email}</span>
               </p>
               
               <input 
                 type="text" 
                 placeholder="1 2 3 4 5 6" 
                 maxLength={6}
                 className="w-full bg-neutral-900 border border-neutral-700 text-white text-center tracking-[0.5em] text-2xl rounded-lg p-3 focus:ring-2 focus:ring-teal-500 outline-none transition-all placeholder-neutral-700 font-mono"
               />
               
               <button onClick={() => setStep(3)} className="w-full bg-teal-600 text-white p-3 rounded-lg font-bold hover:bg-teal-500 transition-all shadow-lg shadow-teal-900/20">
                 Verify Code
               </button>

               {/* Resend Timer Logic */}
               <div className="text-sm">
                 {cooldown > 0 ? (
                   <span className="text-neutral-600">Resend code in {cooldown}s</span>
                 ) : (
                   <button onClick={handleResendOtp} className="text-teal-500 hover:text-teal-400 hover:underline">
                     Resend Code
                   </button>
                 )}
               </div>

               <button onClick={() => setStep(1)} className="text-xs text-neutral-500 hover:text-white">Change Email</button>
             </div>
          )}

          {/* --- STEP 3: PASSWORD --- */}
          {step === 3 && (
             <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
               <div>
                 <label className="text-xs text-neutral-400 ml-1">ENTER PASSWORD</label>
                 <input type="password" placeholder="••••••••" className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-lg p-3 outline-none focus:border-purple-500 transition-colors mt-1"/>
               </div>
               <div>
                 <label className="text-xs text-neutral-400 ml-1">CONFIRM PASSWORD</label>
                 <input type="password" placeholder="••••••••" className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-lg p-3 outline-none focus:border-purple-500 transition-colors mt-1"/>
               </div>
               
               <button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-3 rounded-lg font-bold hover:opacity-90 transition-all shadow-lg mt-2">
                 Join the Village
               </button>
             </div>
          )}

        </div>
        
        <div className="text-center mt-6">
          <Link to="/login" className="text-neutral-500 hover:text-white text-sm transition-colors">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}