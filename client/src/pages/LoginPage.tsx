import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { Spotlight } from '../components/ui/Spotlight';

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen w-full flex md:items-center md:justify-center bg-black relative overflow-hidden text-white">
      
      {/* Spotlight Effect */}
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />

      <div className="p-4 max-w-md mx-auto relative z-10 w-full">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">
            WEREWOLF
          </h1>
          <p className="text-neutral-400 text-lg">
            Night is falling...
          </p>
        </div>

        {/* Card */}
        <div className="bg-neutral-900/50 backdrop-blur-md border border-neutral-800 rounded-2xl p-8 shadow-2xl">
          <div className="space-y-5">
            
            {/* Email */}
            <div className="group relative">
               <Mail className="absolute left-4 top-3.5 h-5 w-5 text-neutral-400" />
               <input 
                 type="email" 
                 placeholder="Werewolf's Email" 
                 className="w-full bg-neutral-950 border border-neutral-700 rounded-lg py-3 pl-12 text-white placeholder-neutral-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                 value={email} 
                 onChange={(e) => setEmail(e.target.value)}
               />
            </div>

            {/* Password */}
            <div className="group relative">
               <Lock className="absolute left-4 top-3.5 h-5 w-5 text-neutral-400" />
               <input 
                 type="password" 
                 placeholder="Password" 
                 className="w-full bg-neutral-950 border border-neutral-700 rounded-lg py-3 pl-12 text-white placeholder-neutral-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                 value={password} 
                 onChange={(e) => setPassword(e.target.value)}
               />
            </div>

            {/* Main Action */}
            <button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-purple-500/30 transition-all transform hover:-translate-y-1">
              Enter Village
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-800"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-neutral-900 px-2 text-neutral-500">Or login via</span></div>
          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-2 gap-3">
             <button className="flex items-center justify-center gap-2 bg-neutral-950 border border-neutral-800 hover:bg-neutral-800 text-white py-2 rounded-lg transition-all text-sm font-medium">
               <span className="text-red-500 font-bold">G</span> Gmail
             </button>
             <button className="flex items-center justify-center gap-2 bg-neutral-950 border border-neutral-800 hover:bg-neutral-800 text-white py-2 rounded-lg transition-all text-sm font-medium">
               <span className="text-green-500 font-bold">💬</span> WeChat
             </button>
          </div>
          
          <div className="mt-6 text-center">
             <Link to="/register" className="text-sm text-neutral-500 hover:text-white transition-colors">
               First time here? <span className="text-purple-400 hover:underline">Join the Village</span>
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}