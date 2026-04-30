import { useState, useEffect } from "react";
import { AppLayout } from "../components/layout/AppLayout";
import { GameService } from "../services/game.service";
import { AuthService } from "../services/auth.service";
import type { GameSessionDTO } from "../types";
import { getCreditInfo } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, MapPin, Clock, Share2, Star, Heart, User, Plus, CheckCircle, LogOut, AlertTriangle, X, Settings, ExternalLink, QrCode } from "lucide-react";
import { CreateEventModal } from "../components/CreateEventModal";
import { ReportModal } from "../components/ReportModal";
import { HostControlPanel } from "../components/HostControlPanel";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useLang } from "../context/LanguageContext";
import { formatEventDate } from "../i18n";

// --- COMPONENT: Quit Confirm Modal ---
interface QuitModalProps {
  event: GameSessionDTO | null;
  creditScore: number;
  onConfirm: () => void;
  onCancel: () => void;
}

function QuitConfirmModal({ event, creditScore, onConfirm, onCancel }: QuitModalProps) {
  const { t } = useLang();
  if (!event) return null;
  const hoursUntil = (new Date(event.date).getTime() - Date.now()) / 3_600_000;
  const isLate = hoursUntil < 24;
  const afterScore = creditScore + (isLate ? -1 : 0);
  const beforeInfo = getCreditInfo(creditScore);
  const afterInfo  = getCreditInfo(afterScore);
  const rankChanged = beforeInfo.rank !== afterInfo.rank;

  return (
    <AnimatePresence>
      {event && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[150]"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] w-full max-w-sm"
          >
            <div className="bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className={`px-5 pt-5 pb-4 border-b ${isLate ? 'border-red-500/20' : 'border-white/5'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${isLate ? 'bg-red-500/15' : 'bg-neutral-800'}`}>
                      <LogOut size={18} className={isLate ? 'text-red-400' : 'text-neutral-300'} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-base">{t('Quit Event?')}</h3>
                      <p className="text-neutral-500 text-xs mt-0.5 truncate max-w-[200px]">{event.title}</p>
                    </div>
                  </div>
                  <button onClick={onCancel} className="text-neutral-500 hover:text-white transition-colors p-1">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="px-5 py-4 space-y-4">
                {isLate ? (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={16} className="text-red-400 shrink-0" />
                      <span className="text-red-300 font-bold text-sm">{t('Late Cancellation Penalty')}</span>
                    </div>
                    <p className="text-neutral-300 text-sm leading-relaxed">
                      This event starts in <span className="text-white font-bold">{hoursUntil.toFixed(1)} hours</span>.
                      Quitting within 24 hours of the event will deduct <span className="text-red-300 font-bold">1 credit point</span>.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-neutral-300 text-sm leading-relaxed">
                      Event starts in <span className="text-white font-bold">{hoursUntil >= 48 ? `${Math.floor(hoursUntil / 24)} days` : `${hoursUntil.toFixed(0)} hours`}</span>.
                      You can quit without penalty.
                    </p>
                  </div>
                )}

                {/* Credit score impact */}
                <div className="bg-neutral-800/60 rounded-xl px-4 py-3 flex items-center justify-between relative">
                  <div className="text-center">
                    <div className="text-xs text-neutral-500 mb-1 uppercase tracking-wider">{t('Your Credit')}</div>
                    <div className={`text-lg font-bold ${beforeInfo.color}`}>{creditScore}</div>
                    <div className={`text-[10px] font-bold ${beforeInfo.color}`}>{t(beforeInfo.label)}</div>
                  </div>
                  <div className="text-neutral-600 text-lg">→</div>
                  <div className="text-center">
                    <div className="text-xs text-neutral-500 mb-1 uppercase tracking-wider">{t('After Quit')}</div>
                    <div className={`text-lg font-bold ${afterInfo.color}`}>{afterScore}</div>
                    <div className={`text-[10px] font-bold ${afterInfo.color}`}>{t(afterInfo.label)}</div>
                  </div>
                  {rankChanged && (
                    <div className="absolute right-3 -bottom-4 text-[10px] text-red-400 font-bold">⚠ {t('rank drop')}</div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 pb-5 flex gap-3">
                <button
                  onClick={onCancel}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-neutral-300 hover:text-white border border-white/10 hover:bg-white/5 transition-colors"
                >
                  {t('Keep My Spot')}
                </button>
                <button
                  onClick={onConfirm}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] ${
                    isLate
                      ? 'bg-red-600 hover:bg-red-500 text-white'
                      : 'bg-neutral-700 hover:bg-neutral-600 text-white'
                  }`}
                >
                  {isLate ? t('Quit (−1 credit)') : t('Quit Event')}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// --- COMPONENT: Share Button ---
const ShareButton = ({ platform, text, url }: { platform: 'whatsapp' | 'telegram' | 'wechat', text: string, url: string }) => {
  const [copied, setCopied] = useState(false);
  const { t } = useLang();

  const handleShare = () => {
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(url);
    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodedText}%0A${encodedUrl}`, '_blank');
    } else if (platform === 'telegram') {
      window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, '_blank');
    } else {
      navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getLabel = () => {
    if (platform === 'whatsapp') return "WhatsApp";
    if (platform === 'telegram') return "Telegram";
    return copied ? t('Copied!') : t('WeChat');
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
      <Share2 size={14} /> {getLabel()}
    </button>
  );
};


// ── Group link section shown to joined players ─────────────────────────────
const GROUP_COLORS: Record<string, string> = {
  telegram: "bg-[#0088cc]/15 border-[#0088cc]/30 text-[#29b6f6]",
  whatsapp: "bg-[#25D366]/15 border-[#25D366]/30 text-[#66bb6a]",
  wechat:   "bg-[#07C160]/15 border-[#07C160]/30 text-[#43a047]",
  facebook: "bg-[#1877F2]/15 border-[#1877F2]/30 text-[#5c8fef]",
};
const GROUP_LABELS: Record<string, string> = {
  telegram: "Telegram Group", whatsapp: "WhatsApp Group",
  wechat:   "WeChat Group",   facebook: "Facebook Group",
};

function GroupLinkSection({ groupLink, groupType }: { groupLink: string; groupType?: string }) {
  const [showQR, setShowQR] = useState(false);
  const color = GROUP_COLORS[groupType ?? ""] ?? "bg-neutral-700/20 border-white/20 text-neutral-300";
  const label = GROUP_LABELS[groupType ?? ""] ?? "Group";
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=8&data=${encodeURIComponent(groupLink)}`;

  return (
    <div className="border-t border-white/10 pt-4 bg-neutral-800/30 -mx-6 -mb-6 p-4 rounded-b-2xl mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Host's Group</span>
        <button
          onClick={() => setShowQR(p => !p)}
          className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-white transition-colors"
        >
          <QrCode size={11} /> {showQR ? "Hide QR" : "Show QR"}
        </button>
      </div>

      <a
        href={groupLink}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-sm transition-all hover:opacity-80 active:scale-95 ${color}`}
      >
        <ExternalLink size={14} className="shrink-0" />
        <span className="truncate">{label}</span>
        <span className="ml-auto text-[10px] opacity-60 truncate max-w-[120px]">{groupLink}</span>
      </a>

      {showQR && (
        <div className="flex justify-center">
          <div className="bg-white rounded-xl p-3">
            <img src={qrSrc} alt="QR Code" className="w-36 h-36" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyEventsPage() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "history">("upcoming");
  const [events, setEvents] = useState<GameSessionDTO[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [quitTarget, setQuitTarget] = useState<GameSessionDTO | null>(null);
  const [managingEvent, setManagingEvent] = useState<GameSessionDTO | null>(null);
  const { t, lang } = useLang();

  const currentUser = AuthService.getCurrentUser();
  const creditScore = currentUser?.creditScore ?? 100;

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

  const handleConfirmQuit = async () => {
    if (!quitTarget) return;
    const id = quitTarget.id;
    const isLate = (new Date(quitTarget.date).getTime() - Date.now()) / 3_600_000 < 24;
    setQuitTarget(null);
    setEvents(prev => prev.filter(e => e.id !== id));
    if (isLate && currentUser) {
      // Deduct credit locally so UI reflects immediately
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      stored.creditScore = (stored.creditScore ?? 100) - 1;
      localStorage.setItem("user", JSON.stringify(stored));
    }
    try {
      await GameService.leaveGame(id);
    } catch {
      // Revert removal on error
      GameService.getMyEvents().then(setEvents);
    }
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

  const handleHostPanelUpdate = (sessionId: string, updated: Partial<GameSessionDTO>) => {
    setEvents(prev => prev.map(e => e.id === sessionId ? { ...e, ...updated } : e));
    setManagingEvent(prev => prev && prev.id === sessionId ? { ...prev, ...updated } : prev);
  };

  const handleHostPanelCancel = (sessionId: string) => {
    setEvents(prev => prev.map(e => e.id === sessionId ? { ...e, status: "finished" } : e));
    setManagingEvent(null);
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

        {/* Quit Confirm Modal */}
        <QuitConfirmModal
          event={quitTarget}
          creditScore={creditScore}
          onConfirm={handleConfirmQuit}
          onCancel={() => setQuitTarget(null)}
        />

        {/* Header & Tabs */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-white">{t('My Events')}</h1>
          
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
                  {t(tab)}
                </button>
              ))}
            </div>

            {/* Create Event Button */}
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex w-full sm:w-auto items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 whitespace-nowrap"
            >
              <Plus size={18} /> {t('Host Event')}
            </button>
          </div>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
          <AnimatePresence mode="popLayout">
            {displayedEvents.map((event) => {
              const { dayNum, month, fullString } = formatEventDate(event.date, lang);
              
              // Safe access to interaction properties
              const isLiked = event.myInteraction?.isLiked || false;
              const myRating = event.myInteraction?.myRating || 0;
              const punctuality = event.myInteraction?.punctuality;
              const isHost = currentUser?.id === event.hostId;

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
                      {/* Host badge + single Manage button — host only, upcoming tab */}
                      {isHost && activeTab === "upcoming" && (
                        <>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border text-red-400 border-red-500/30 bg-red-500/10 uppercase tracking-wide mr-1">
                            HOST
                          </span>
                          {/* Single manage button — Settings (gear/screwdriver) icon */}
                          <button
                            onClick={() => setManagingEvent(event)}
                            className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-red-500/15 transition-all active:scale-90"
                            title="Manage Event"
                          >
                            <Settings size={18} />
                          </button>
                        </>
                      )}

                      {/* Report Event Icon Button — non-hosts only */}
                      {!isHost && (
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
                      )}

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

                      {/* Quit Button — non-hosts only on upcoming tab */}
                      {activeTab === "upcoming" && !isHost && (
                        <button
                          onClick={() => setQuitTarget(event)}
                          className="p-2 rounded-full text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-all active:scale-90"
                          title="Quit Event"
                        >
                          <LogOut size={18} />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-red-500 transition-colors">{event.title}</h3>

                  {/* Venue approval status — only for upcoming events */}
                  {activeTab === "upcoming" && event.venueApprovalStatus && (
                    <div className="mb-3">
                      {event.venueApprovalStatus === 'confirmed' ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border bg-green-500/10 border-green-500/25 text-green-400">
                          <CheckCircle size={10} /> {t('Venue Confirmed')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border bg-amber-500/10 border-amber-500/25 text-amber-400">
                          ● {t('Pending Space Approval')}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-2 mb-6">
                    <div className="flex items-center gap-2 text-neutral-400 text-sm">
                      <Clock size={14} className="text-yellow-500" />
                      <span className="font-mono text-neutral-300">{fullString}</span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-400 text-sm">
                      <MapPin size={14} className="text-red-500" /> {event.venueName || event.venueId}
                    </div>
                  </div>

                  {/* --- UPCOMING: footer --- */}
                  {activeTab === "upcoming" && (
                    <>
                      {/* Non-host: show group link if available, else invite friends */}
                      {!isHost && event.groupLink ? (
                        <GroupLinkSection groupLink={event.groupLink} groupType={event.groupType} />
                      ) : (
                        <div className="border-t border-white/10 pt-4 bg-neutral-800/30 -mx-6 -mb-6 p-4 rounded-b-2xl mt-4">
                          <div className="text-[10px] text-neutral-500 mb-2 font-bold uppercase tracking-wider">{t('Invite Friends')}</div>
                          <div className="flex gap-2">
                            <ShareButton platform="whatsapp" text={`Join me for a game of Werewolf: ${event.title}!`} url={`https://werewolf.sg/game/${event.id}`} />
                            <ShareButton platform="telegram" text={`Join me for a game of Werewolf: ${event.title}!`} url={`https://werewolf.sg/game/${event.id}`} />
                            <ShareButton platform="wechat"   text={`Join me for a game of Werewolf: ${event.title}!`} url={`https://werewolf.sg/game/${event.id}`} />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* History: Rate & Host Info */}
                  {activeTab === "history" && (
                    <div className="border-t border-white/10 pt-4 flex justify-between items-end mt-4">
                      {/* Left: Star Rating and Punctuality Badge */}
                      <div className="flex flex-col gap-3">
                        <div>
                          <div className="text-[10px] text-neutral-500 mb-1 font-bold uppercase tracking-wider">{t('Your Rating')}</div>
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
                            {punctuality === 'punctual' ? t('Punctual') : t('Late')}
                          </span>
                        )}
                      </div>

                      {/* Right: Host Name with Golden Border Style */}
                      <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border shadow-sm bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                        <User size={14} />
                        <span>{t('Hosted by')} <span className="text-yellow-300 font-bold">{event.hostName || event.hostId}</span></span>
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
              <p>{t(`No ${activeTab} events found.`)}</p>
              <p className="text-sm">{t('Time to hunt some wolves!')}</p>
            </div>
          )}
        </div>

        {/* Create Event Modal */}
        <CreateEventModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      </div>

      {/* Host Control Panel (Info + Manage combined — Bug 2 fix) */}
      {managingEvent && (
        <HostControlPanel
          event={managingEvent}
          onClose={() => setManagingEvent(null)}
          onEventUpdate={(updated) => handleHostPanelUpdate(managingEvent.id, updated)}
          onEventCancel={handleHostPanelCancel}
        />
      )}
    </AppLayout>
  );
}