import { useState, useEffect } from "react";
import { AppLayout } from "../components/layout/AppLayout";
import { GameService } from "../services/game.service";
import type { FullUserProfileDTO } from "../types";
import { MOCK_VENUES } from "../data/mockDB"; 
import { ReportModal } from "../components/ReportModal";
import { 
  Mail, Phone, Calendar, 
  Settings, Shield, Users, Heart, Edit2, LogOut, Save, AlertCircle, CheckCircle 
} from "lucide-react";
import { IconAlertTriangle } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";

const SkillBadge = ({ level, onChange }: { level: string, onChange: (l: any) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const levels = ["Beginner", "Intermediate", "Advanced", "Expert"];
  const getColor = (l: string) => {
    switch(l) {
      case "Beginner": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "Intermediate": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "Advanced": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "Expert": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default: return "bg-neutral-800 text-neutral-400";
    }
  };
  if (isEditing) {
    return (
      <select 
        value={level}
        onChange={(e) => { onChange(e.target.value); setIsEditing(false); }}
        onBlur={() => setIsEditing(false)}
        autoFocus
        className="bg-neutral-900 border border-white/20 text-white text-xs rounded-lg px-2 py-1 outline-none"
      >
        {levels.map(l => <option key={l} value={l}>{l}</option>)}
      </select>
    );
  }
  return (
    <button onClick={() => setIsEditing(true)} className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 transition-all hover:brightness-125 ${getColor(level)}`}>
      <Shield size={12} /> {level}
    </button>
  );
};

export default function MyProfilePage() {
  const [profile, setProfile] = useState<FullUserProfileDTO | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  
  // --- Toast State ---
  const [showToast, setShowToast] = useState(false);

  // --- Bio 编辑状态 ---
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [tempBio, setTempBio] = useState("");
  const [bioError, setBioError] = useState<string | null>(null);

  useEffect(() => {
    GameService.getMyFullProfile().then(data => {
      setProfile(data);
      setTempBio(data.bio || ""); 
    });
  }, []);

  const triggerToast = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleSkillChange = (newLevel: string) => {
    if (!profile) return;
    setProfile({ ...profile, skillLevel: newLevel as any });
    GameService.updateSkillLevel(newLevel);
    triggerToast();
  };

  const handleSaveBio = () => {
    if (/[<>]/.test(tempBio)) {
      setBioError("Invalid characters detected (< or >). Please remove them.");
      return;
    }
    
    if (tempBio.length > 200) {
      setBioError("Bio is too long (max 200 chars).");
      return;
    }

    setBioError(null);
    if (profile) {
      setProfile({ ...profile, bio: tempBio });
      GameService.updateBio(tempBio);
      setIsEditingBio(false);
      triggerToast();
    }
  };

  const getVenueName = (vid: string) => MOCK_VENUES.find(v => v.id === vid)?.name || "Unknown Place";

  if (!profile) return <AppLayout><div className="p-10 text-neutral-500">Loading profile...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="h-full w-full overflow-y-auto p-6 md:p-10 custom-scrollbar relative">
        
        {/* Toast Notification */}
        <AnimatePresence>
          {showToast && (
            <motion.div 
              initial={{ opacity: 0, y: 50, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 20, x: "-50%" }}
              className="fixed bottom-10 left-1/2 z-[200] flex items-center gap-2 px-6 py-3 bg-neutral-900 border border-green-500/30 rounded-full shadow-2xl backdrop-blur-md"
            >
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-white font-bold text-sm tracking-wide">Submitted</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Report Modal */}
        <ReportModal 
          isOpen={isReportOpen} 
          onClose={() => setIsReportOpen(false)} 
          onSuccess={triggerToast}
          targetType="User"
          targetName={profile.username}
        />

        {/* --- HEADER SECTION --- */}
        <div className="flex flex-col md:flex-row gap-6 items-start mb-10">
          
          <div className="relative group shrink-0">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-neutral-800 shadow-2xl">
              <img 
                src={profile.avatarUrl || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            </div>
            <button className="absolute bottom-0 right-0 p-2 bg-neutral-800 rounded-full border border-neutral-700 text-neutral-400 hover:text-white transition-colors">
              <Edit2 size={14} />
            </button>
          </div>

          <div className="flex-1 w-full">
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
              <h1 className="text-3xl font-bold text-white">{profile.username}</h1>
              <div className="flex items-center gap-2">
                <SkillBadge level={profile.skillLevel || "Beginner"} onChange={handleSkillChange} />
                
                {/* Report User Button */}
                <button 
                  onClick={() => setIsReportOpen(true)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-neutral-400 hover:text-red-500 transition-all flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                  title="Report User"
                >
                  <IconAlertTriangle size={12} />
                  <span>Report</span>
                </button>
              </div>
            </div>
            
            <div className="mb-6 max-w-xl">
              {isEditingBio ? (
                <div className="bg-neutral-900/50 p-3 rounded-xl border border-white/10 animate-in fade-in zoom-in duration-200">
                  <textarea 
                    value={tempBio}
                    onChange={(e) => {
                      setTempBio(e.target.value);
                      if (!/[<>]/.test(e.target.value)) setBioError(null);
                    }}
                    placeholder="Tell us about yourself..."
                    className="w-full bg-transparent text-neutral-300 text-sm focus:outline-none resize-none h-20 placeholder:text-neutral-600"
                  />
                  
                  {bioError && (
                    <div className="text-red-400 text-xs flex items-center gap-1 mb-2">
                      <AlertCircle size={12} /> {bioError}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 mt-2">
                    <button 
                      onClick={() => { setIsEditingBio(false); setTempBio(profile.bio || ""); setBioError(null); }}
                      className="px-3 py-1 rounded-lg text-xs font-bold text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveBio}
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-white text-black hover:bg-neutral-200 transition-colors flex items-center gap-1"
                    >
                      <Save size={12} /> Save Bio
                    </button>
                  </div>
                </div>
              ) : (
                <div className="group relative">
                  <p className="text-neutral-400 leading-relaxed pr-8">
                    {profile.bio || "No bio yet. Just a villager trying to survive the night."}
                  </p>
                  <button 
                    onClick={() => { setIsEditingBio(true); setTempBio(profile.bio || ""); }}
                    className="absolute top-0 right-full md:right-auto md:left-full md:ml-2 p-1.5 text-neutral-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                    title="Edit Bio"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-6 border-t border-b border-white/5 py-3 mb-4">
              <div className="text-center">
                <div className="text-xl font-bold text-white">{profile.followersCount}</div>
                <div className="text-xs text-neutral-500 uppercase tracking-wider">Followers</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-white">{profile.followingCount}</div>
                <div className="text-xs text-neutral-500 uppercase tracking-wider">Following</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-white">{profile.pastEvents.length}</div>
                <div className="text-xs text-neutral-500 uppercase tracking-wider">Games</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-white">{profile.likedGamesCount}</div>
                <div className="text-xs text-neutral-500 uppercase tracking-wider">Likes</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-neutral-400">
              <div className="flex items-center gap-1.5">
                <Mail size={14} /> {profile.email}
              </div>
              {profile.contactNumber && (
                 <div className="flex items-center gap-1.5">
                   <Phone size={14} /> {profile.contactNumber}
                 </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button className="p-2 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white transition-colors">
              <Settings size={20} />
            </button>
            <button className="p-2 rounded-lg bg-neutral-800 text-red-400 hover:bg-red-500/10 transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* --- CONTENT GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
          
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Calendar size={20} className="text-red-500" /> Match History
            </h2>
            
            <div className="bg-neutral-900/50 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
              {profile.pastEvents.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {profile.pastEvents.map(event => {
                    const dateObj = new Date(event.date);
                    const dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); 
                    
                    return (
                      <div key={event.id} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors group">
                        <div className="font-mono text-neutral-500 font-bold text-sm w-16 text-right shrink-0">
                          {dateStr}
                        </div>
                        
                        <div className="text-neutral-600">@</div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium truncate flex items-center gap-2">
                            {getVenueName(event.venueId)}
                          </div>
                          <div className="text-xs text-neutral-500 truncate">{event.title}</div>
                        </div>

                        {event.myInteraction?.result && (
                          <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border
                            ${event.myInteraction.result === 'win' 
                              ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' 
                              : 'bg-neutral-800 text-neutral-500 border-neutral-700'}
                          `}>
                            {event.myInteraction.result}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-neutral-500">No games played yet.</div>
              )}
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Users size={20} className="text-blue-500" /> Following
              </h2>
              <div className="bg-neutral-900/50 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                 {profile.followedUsers.length > 0 ? (
                   <div className="flex flex-col gap-3">
                     {profile.followedUsers.map(u => (
                       <div key={u.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer">
                          <div className="w-8 h-8 rounded-full bg-neutral-700 overflow-hidden">
                             <img src={u.avatarUrl || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                             <div className="text-sm font-bold text-white truncate">{u.username}</div>
                             <div className="text-xs text-neutral-500">{u.role}</div>
                          </div>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <div className="text-sm text-neutral-500 text-center py-4">Not following anyone.</div>
                 )}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Heart size={20} className="text-red-500" /> Saved Places
              </h2>
              <div className="grid grid-cols-1 gap-3">
                 {profile.followedVenues.length > 0 ? (
                   profile.followedVenues.map(v => (
                     <div key={v.id} className="bg-neutral-900/50 border border-white/10 rounded-xl p-3 flex gap-3 hover:border-white/20 transition-all cursor-pointer">
                        <div className="w-12 h-12 rounded-lg bg-neutral-800 overflow-hidden shrink-0">
                           <img src={v.imageUrl} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                           <div className="text-sm font-bold text-white truncate">{v.name}</div>
                           <div className="text-xs text-neutral-500 flex items-center gap-1 truncate">
                              <Heart size={10} className="text-red-500 fill-red-500" /> {v.averageRating}
                           </div>
                        </div>
                     </div>
                   ))
                 ) : (
                   <div className="text-sm text-neutral-500 bg-neutral-900/50 border border-white/10 rounded-xl p-4 text-center">No saved places.</div>
                 )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}