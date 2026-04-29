import { useState, useEffect } from "react";
import { AppLayout } from "../components/layout/AppLayout";
import { GameService } from "../services/game.service";
import type { GameSessionDTO } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, MapPin, Clock, Share2, Star, Heart, Copy, Check, User, Plus , CheckCircle } from "lucide-react";
import { CreateEventModal } from "../components/CreateEventModal";
import { ReportModal } from "../components/ReportModal";
import { IconAlertTriangle } from "@tabler/icons-react";

// --- COMPONENT: Share Button ---
const ShareButton = ({ platform, text, url }: { platform: 'whatsapp' | 'telegram' | 'wechat', text: string, url: string }) => {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(url);
    
    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodedText}%0A${encodedUrl}`, '_blank');
    } else if (platform === 'telegram') {
      window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, '_blank');
    } else if (platform === 'wechat') {
      navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getIcon = () => {
    if (platform === 'wechat') return copied ? <Check size={14} /> : <Copy size={14} />;
    return <Share2 size={14} />;
  };

  const getLabel = () => {
    if (platform === 'whatsapp') return "WhatsApp";
    if (platform === 'telegram') return "Telegram";
    return copied ? "Copied!" : "WeChat";
  };

  const getColor = () => {
    if (platform === 'whatsapp') return "bg-[#25D366] hover:bg-[#128C7E]";
    if (platform === 'telegram') return "bg-[#0088cc] hover:bg-[#0077b5]";
    return "bg-[#07C160] hover:bg-[#06ad56]"; 
  };

  return (
    <button 
      onClick={handleShare}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-bold transition-all shadow-md active:scale-95 ${getColor()}`}
    >
      {getIcon()} {getLabel()}
    </button>
  );
};

// --- HELPER: Date Formatter ---
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const dayNum = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  return {
    dayNum,
    month,
    fullString: `${dayNum} ${month} ${time}, ${dayName}`
  };
};

export default function MyEventsPage() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "history">("upcoming");
  const [events, setEvents] = useState<GameSessionDTO[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // --- Report & Toast State ---
  const [reportData, setReportData] = useState<{ isOpen: boolean; name: string } | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    GameService.getMyEvents().then(setEvents);
  }, []);

  const triggerToast = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleRate = (sessionId: string, rating: number) => {
    setEvents(prev => prev.map(e => {
      if (e.id === sessionId) {
        const prevInteraction = e.myInteraction || { userId: "", sessionId: "", status: "registered", isLiked: false };
        return { 
          ...e, 
          myInteraction: { ...prevInteraction, myRating: rating } 
        };
      }
      return e;
    }));
    GameService.rateGame(sessionId, rating);
  };

  const handleLike = (sessionId: string) => {
    setEvents(prev => prev.map(e => {
      if (e.id === sessionId) {
        // Ensure myInteraction exists before toggling
        const prevInteraction = e.myInteraction || { userId: "", sessionId: "", status: "registered", isLiked: false };
        return { 
          ...e, 
          myInteraction: { ...prevInteraction, isLiked: !prevInteraction.isLiked } 
        };
      }
      return e;
    }));
  };

  const displayedEvents = events.filter(e => {
    if (activeTab === "upcoming") return e.status === "open" || e.status === "playing";
    return e.status === "finished"; 
  });

  return (
    <AppLayout>
      <div className="h-full w-full overflow-y-auto p-6 md:p-10 relative">
        
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
              <span className="text-white font-bold text-sm tracking-wide">Report Submitted</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Report Modal */}
        <ReportModal 
          isOpen={reportData?.isOpen || false} 
          onClose={() => setReportData(null)} 
          onSuccess={triggerToast}
          targetType="Event"
          targetName={reportData?.name || ""}
        />

        {/* Header & Tabs */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-white">My Events</h1>
          
          <div className="flex flex-col-reverse sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="bg-neutral-900/80 p-1 rounded-xl flex gap-1 border border-white/10 backdrop-blur-sm w-full sm:w-auto">
              {(["upcoming", "history"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                    activeTab === tab 
                    ? "bg-red-600 text-white shadow-lg" 
                    : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Create Event Button */}
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex w-full sm:w-auto items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 whitespace-nowrap"
            >
              <Plus size={18} /> Host Event
            </button>
          </div>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
          <AnimatePresence mode="popLayout">
            {displayedEvents.map((event) => {
              const { dayNum, month, fullString } = formatDate(event.date);
              
              // Safe access to interaction properties
              const isLiked = event.myInteraction?.isLiked || false;
              const myRating = event.myInteraction?.myRating || 0;
              const punctuality = event.myInteraction?.punctuality; // Extract new punctuality field

              return (
                <motion.div
                  key={event.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-neutral-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all group shadow-lg"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-neutral-800 rounded-xl p-3 text-center min-w-[60px] border border-white/5">
                      <div className="text-xs text-red-500 font-bold uppercase">{month}</div>
                      <div className="text-2xl font-bold text-white">{dayNum}</div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {/* Report Event Icon Button */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setReportData({ isOpen: true, name: event.title });
                        }}
                        className="p-2 text-neutral-500 hover:text-red-400 transition-colors rounded-full hover:bg-white/5"
                        title="Report Event"
                      >
                        <IconAlertTriangle size={18} />
                      </button>

                      {/* Like Button */}
                      <button 
                        onClick={() => handleLike(event.id)}
                        className={`p-2 rounded-full transition-all active:scale-90 ${
                          isLiked 
                          ? "text-red-500 bg-red-500/10" 
                          : "text-neutral-600 hover:text-red-500 hover:bg-neutral-800"
                        }`}
                      >
                        <Heart size={20} className={isLiked ? "fill-red-500" : ""} />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-1 group-hover:text-red-500 transition-colors">{event.title}</h3>
                  
                  <div className="flex flex-col gap-2 mb-6">
                    <div className="flex items-center gap-2 text-neutral-400 text-sm">
                      <Clock size={14} className="text-yellow-500" /> 
                      <span className="font-mono text-neutral-300">{fullString}</span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-400 text-sm">
                      <MapPin size={14} className="text-red-500" /> {event.venueName || event.venueId}
                    </div>
                  </div>

                  {/* --- UPCOMING: Share --- */}
                  {activeTab === "upcoming" && (
                    <div className="border-t border-white/10 pt-4 bg-neutral-800/30 -mx-6 -mb-6 p-4 rounded-b-2xl mt-4">
                      <div className="text-[10px] text-neutral-500 mb-2 font-bold uppercase tracking-wider">Invite Friends</div>
                      <div className="flex gap-2">
                        <ShareButton 
                          platform="whatsapp" 
                          text={`Join me for a game of Werewolf: ${event.title}!`} 
                          url={`https://werewolf.sg/game/${event.id}`} 
                        />
                        <ShareButton 
                          platform="telegram" 
                          text={`Join me for a game of Werewolf: ${event.title}!`} 
                          url={`https://werewolf.sg/game/${event.id}`} 
                        />
                         <ShareButton 
                          platform="wechat" 
                          text={`Join me for a game of Werewolf: ${event.title}!`} 
                          url={`https://werewolf.sg/game/${event.id}`} 
                        />
                      </div>
                    </div>
                  )}

                  {/* --- HISTORY: Rate & Host Info (带金框) --- */}
                  {activeTab === "history" && (
                    <div className="border-t border-white/10 pt-4 flex justify-between items-end mt-4">
                      {/* Left: Star Rating and Punctuality Badge */}
                      <div className="flex flex-col gap-3">
                        <div>
                          <div className="text-[10px] text-neutral-500 mb-1 font-bold uppercase tracking-wider">Your Rating</div>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button 
                                key={star}
                                onClick={() => handleRate(event.id, star)}
                                className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                              >
                                <Star 
                                  size={18} 
                                  className={`${myRating >= star ? "text-yellow-400 fill-yellow-400" : "text-neutral-700"}`} 
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {/* New Punctuality Badge */}
                        {punctuality && (
                          <span className={`w-fit text-[10px] px-2 py-1 rounded-md font-bold border uppercase tracking-wider ${punctuality === 'punctual' ? 'text-green-400 bg-green-400/10 border-green-400/20' : 'text-orange-400 bg-orange-400/10 border-orange-400/20'}`}>
                            {punctuality === 'punctual' ? 'Punctual' : 'Late'}
                          </span>
                        )}
                      </div>

                      {/* Right: Host Name with Golden Border Style */}
                      <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border shadow-sm bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                        <User size={14} />
                        <span>Hosted by <span className="text-yellow-300 font-bold">{event.hostName || event.hostId}</span></span>
                      </div>
                    </div>
                  )}

                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {displayedEvents.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-neutral-500 opacity-60">
              <Calendar size={48} className="mb-4 text-neutral-700" />
              <p>No {activeTab} events found.</p>
              <p className="text-sm">Time to hunt some wolves!</p>
            </div>
          )}
        </div>

        {/* Create Event Modal */}
        <CreateEventModal 
          isOpen={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)} 
        />
      </div>
    </AppLayout>
  );
}