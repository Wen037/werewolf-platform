import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { GameService } from "../services/game.service";
import type { FullUserProfileDTO, User, GameVenue, GameSessionDTO } from "../types";
import { getCreditInfo, getUsernameColor } from "../types";
import { useLang } from "../context/LanguageContext";
import { formatEventDate, formatShortDate } from "../i18n";
import { ReportModal } from "../components/ReportModal";
import { CreateEventModal } from "../components/CreateEventModal";
import {
  Mail, Phone, Calendar,
  Settings, Shield, Users, Heart, Edit2, LogOut, Save, AlertCircle, CheckCircle, X, Star,
  MapPin, Clock, Trophy, Navigation, BadgeCheck, ChevronRight,
} from "lucide-react";
import { IconAlertTriangle, IconUsers } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Shared modal backdrop ──────────────────────────────────────────────────
function Backdrop({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[150]"
      onClick={onClick}
    />
  );
}

// ── User Detail Modal ──────────────────────────────────────────────────────
function UserDetailModal({ user, onClose }: { user: User | null; onClose: () => void }) {
  const ci = getCreditInfo(user?.creditScore ?? 100);
  const { t } = useLang();
  const navigate = useNavigate();
  return (
    <AnimatePresence>
      {user && (
        <>
          <Backdrop onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] w-full max-w-sm"
          >
            <div className={`bg-neutral-900 border ${ci.borderClass} rounded-2xl shadow-2xl overflow-hidden`}>
              {/* Tier-colored header bar with close button */}
              <div className={`h-9 ${ci.barColor} opacity-60 flex items-center justify-end px-3`}>
                <button onClick={onClose} className="p-1 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-colors">
                  <X size={14} />
                </button>
              </div>

              {/* Avatar + info */}
              <div className="px-5 pb-5 pt-4">
                <div className="flex items-end gap-4 mb-4">
                  <img
                    src={user.avatarUrl || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                    className={`w-16 h-16 rounded-full border-4 ${ci.borderClass} object-cover shrink-0`}
                  />
                  <div className="mb-1 min-w-0">
                    <h3 className={`text-lg font-bold leading-tight ${getUsernameColor(user)}`}>{user.username}</h3>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ci.bgColor} ${ci.color}`}>
                        {t(ci.label)}
                      </span>
                      {user.role === 'web_admin' && (
                        <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider">{t('Admin')}</span>
                      )}
                    </div>
                  </div>
                </div>

                {user.bio && (
                  <p className="text-neutral-400 text-sm leading-relaxed mb-4 border-l-2 border-white/10 pl-3">{user.bio}</p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="bg-neutral-800/40 rounded-xl py-2.5">
                    <div className="text-white font-bold text-sm">{user.followersCount ?? 0}</div>
                    <div className="text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">{t('Followers')}</div>
                  </div>
                  <div className="bg-neutral-800/40 rounded-xl py-2.5">
                    <div className="text-white font-bold text-sm">{user.followingCount ?? 0}</div>
                    <div className="text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">{t('Following')}</div>
                  </div>
                  <div className="bg-neutral-800/40 rounded-xl py-2.5">
                    <div className={`font-bold text-sm ${ci.color}`}>{user.skillLevel ? t(user.skillLevel) : '—'}</div>
                    <div className="text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">{t('Level')}</div>
                  </div>
                </div>

                <button
                  onClick={() => { onClose(); navigate(`/user/${user.id}`); }}
                  className="w-full py-2 rounded-xl text-sm font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 transition-colors"
                >
                  View Full Profile →
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Place Detail Modal ─────────────────────────────────────────────────────
function PlaceDetailModal({
  venue,
  onClose,
  onHostEvent,
}: {
  venue: GameVenue | null;
  onClose: () => void;
  onHostEvent: (venueId: string) => void;
}) {
  return (
    <AnimatePresence>
      {venue && (
        <>
          <Backdrop onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] w-full max-w-md"
          >
            <div className="bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              {/* Hero image */}
              <div className="relative h-40 shrink-0">
                <img src={venue.imageUrl} alt={venue.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/90 to-transparent" />
                <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors">
                  <X size={16} />
                </button>
                <div className="absolute bottom-3 left-4">
                  <h3 className="text-white font-bold text-lg flex items-center gap-2">
                    {venue.name}
                    {venue.isVerified && <BadgeCheck size={16} className="text-green-400" />}
                  </h3>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto custom-scrollbar space-y-4 flex-1">
                {/* Address + rating */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-1.5 text-neutral-400 text-sm">
                    <MapPin size={14} className="text-red-500 mt-0.5 shrink-0" />
                    <span>{venue.address}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Star size={13} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-white font-bold text-sm">{venue.averageRating}</span>
                  </div>
                </div>

                {/* Meta pills */}
                <div className="flex flex-wrap gap-2">
                  {venue.openingHours && (
                    <span className="flex items-center gap-1.5 text-xs text-neutral-300 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5">
                      <Clock size={11} className="text-amber-400" /> {venue.openingHours}
                    </span>
                  )}
                  {venue.pricePerHour !== undefined && (
                    <span className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border ${venue.pricePerHour === 0 ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-neutral-300 bg-white/5 border-white/10'}`}>
                      {venue.pricePerHour === 0 ? 'Free entry' : `$${venue.pricePerHour}/hr`}
                    </span>
                  )}
                  {venue.maxPax && (
                    <span className="flex items-center gap-1.5 text-xs text-neutral-300 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5">
                      <IconUsers size={11} className="text-green-400" /> Up to {venue.maxPax} pax
                    </span>
                  )}
                </div>

                {/* Description */}
                {venue.description && (
                  <p className="text-neutral-400 text-sm leading-relaxed">{venue.description}</p>
                )}

                {/* Amenities */}
                {venue.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {venue.amenities.map(a => (
                      <span key={a} className="text-[11px] bg-white/5 border border-white/10 text-neutral-400 px-2 py-0.5 rounded-md">{a}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className="px-5 pb-5 flex gap-3 shrink-0 border-t border-white/5 pt-4">
                <button
                  onClick={() => {
                    const q = encodeURIComponent(venue.address);
                    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank', 'noopener,noreferrer');
                  }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-neutral-800 hover:bg-neutral-700 text-white border border-white/10 flex items-center justify-center gap-2 transition-all"
                >
                  <Navigation size={15} /> Directions
                </button>
                <button
                  onClick={() => { onClose(); onHostEvent(venue.id); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-500 text-white flex items-center justify-center gap-2 transition-all"
                >
                  <Calendar size={15} /> Host Event Here
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Match Detail Modal ─────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  attended:  'text-green-400 bg-green-500/10 border-green-500/25',
  'no-show': 'text-red-400 bg-red-500/10 border-red-500/25',
  cancelled: 'text-neutral-400 bg-neutral-800 border-white/10',
  registered:'text-sky-400 bg-sky-500/10 border-sky-500/25',
};
const PROFICIENCY_STYLES: Record<string, string> = {
  'All Welcome':  'bg-green-500/15 text-green-400 border-green-500/25',
  'Newbie':       'bg-sky-500/15 text-sky-400 border-sky-500/25',
  'Intermediate': 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  'Advanced':     'bg-orange-500/15 text-orange-400 border-orange-500/25',
  'Expert':       'bg-red-500/15 text-red-400 border-red-500/25',
};

function MatchDetailModal({ event, onClose }: { event: GameSessionDTO | null; onClose: () => void }) {
  const { lang, t } = useLang();
  if (!event) return null;
  const { fullString: dateStr } = formatEventDate(event.date, lang);
  const timeStr = '';
  const myStatus = event.myInteraction?.status ?? 'registered';
  const myRating = event.myInteraction?.myRating ?? 0;
  const punctuality = event.myInteraction?.punctuality;
  const profCls = event.proficiency ? (PROFICIENCY_STYLES[event.proficiency] ?? 'bg-neutral-800 text-neutral-400 border-white/10') : '';

  return (
    <AnimatePresence>
      {event && (
        <>
          <Backdrop onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] w-full max-w-md"
          >
            <div className="bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="px-5 pt-5 pb-4 border-b border-white/5 flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-700/60 text-neutral-400 border border-white/8 uppercase">
                      Finished
                    </span>
                    {event.proficiency && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${profCls}`}>
                        {event.proficiency.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <h3 className="text-white font-bold text-lg leading-snug">{event.title}</h3>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors shrink-0">
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">

                {/* Time & Location */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm text-neutral-300">
                    <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
                      <Clock size={14} className="text-yellow-400" />
                    </div>
                    <div>
                      <div className="font-semibold">{dateStr}</div>
                      <div className="text-neutral-500 text-xs">{timeStr}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-neutral-300">
                    <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
                      <MapPin size={14} className="text-red-500" />
                    </div>
                    <div>
                      <div className="font-semibold">{event.venueName || 'Unknown venue'}</div>
                      {event.venueAddress && <div className="text-neutral-500 text-xs">{event.venueAddress}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-neutral-300">
                    <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
                      <Users size={14} className="text-blue-400" />
                    </div>
                    <div>
                      <div className="font-semibold">
                        {event.currentPlayers}/{event.maxPlayers} players
                      </div>
                      <div className="text-neutral-500 text-xs">Host: {event.hostName ?? 'Unknown'}</div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {event.description && (
                  <div className="bg-white/5 border border-white/8 rounded-xl p-3">
                    <p className="text-neutral-400 text-sm leading-relaxed">{event.description}</p>
                  </div>
                )}

                {/* Your attendance */}
                <div className="bg-neutral-800/60 rounded-xl p-4 space-y-3">
                  <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Your Attendance</div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border capitalize ${STATUS_STYLES[myStatus] ?? STATUS_STYLES['registered']}`}>
                      {myStatus === 'no-show' ? 'No-show' : myStatus.charAt(0).toUpperCase() + myStatus.slice(1)}
                    </span>
                    {punctuality && (
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${punctuality === 'punctual' ? 'text-green-400 bg-green-500/10 border-green-500/25' : 'text-orange-400 bg-orange-500/10 border-orange-500/25'}`}>
                        {punctuality === 'punctual' ? t('● Completed') : t('● Left Early')}
                      </span>
                    )}
                  </div>
                  {myRating > 0 && (
                    <div>
                      <div className="text-[10px] text-neutral-500 mb-1 uppercase tracking-wider">Your Rating</div>
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} size={14} className={s <= myRating ? 'text-yellow-400 fill-yellow-400' : 'text-neutral-700'} />
                        ))}
                      </div>
                    </div>
                  )}
                  {event.totalLikes > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                      <Trophy size={12} className="text-yellow-600" />
                      {event.totalLikes} players liked this event
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// --- PREDEFINED AVATARS ---
const PREDEFINED_AVATARS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Alpha",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Beta",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Gamma",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Delta",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Echo",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Leo",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Mia"
];

const SkillBadge = ({ level, onChange }: { level: string, onChange: (l: any) => void }) => {
  const { t } = useLang();
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
      <Shield size={12} /> {t(level)}
    </button>
  );
};

export default function MyProfilePage() {
  const [profile, setProfile] = useState<FullUserProfileDTO | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // --- Detail modal state ---
  const [selectedUser,  setSelectedUser]  = useState<User | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<GameVenue | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<GameSessionDTO | null>(null);
  const [createEventVenueId, setCreateEventVenueId] = useState<string | undefined>();
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  
  // --- Toast State ---
  const [showToast, setShowToast] = useState(false);

  // --- Modals State ---
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ email: "", phone: "" });

  const { t, lang } = useLang();

  // --- Bio edit state ---
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

  // --- Handle Updates ---
  const handleSelectAvatar = (url: string) => {
    if (profile) {
      setProfile({ ...profile, avatarUrl: url });
      // GameService.updateAvatar(url);
      setIsAvatarModalOpen(false);
      triggerToast();
    }
  };

  const handleSaveContact = () => {
    if (profile) {
      setProfile({ ...profile, email: editForm.email, contactNumber: editForm.phone });
      // GameService.updateContactInfo(editForm.email, editForm.phone);
      setIsContactModalOpen(false);
      triggerToast();
    }
  };


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
              <span className="text-white font-bold text-sm tracking-wide">Saved successfully</span>
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

        {/* Detail Modals */}
        <UserDetailModal  user={selectedUser}   onClose={() => setSelectedUser(null)} />
        <PlaceDetailModal venue={selectedVenue} onClose={() => setSelectedVenue(null)}
          onHostEvent={(id) => { setCreateEventVenueId(id); setIsCreateEventOpen(true); }} />
        <MatchDetailModal event={selectedMatch} onClose={() => setSelectedMatch(null)} />
        <CreateEventModal isOpen={isCreateEventOpen} onClose={() => setIsCreateEventOpen(false)} defaultVenueId={createEventVenueId} />

        {/* Avatar Selection Modal */}
        <AnimatePresence>
          {isAvatarModalOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsAvatarModalOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150]"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] w-full max-w-sm bg-neutral-900 border border-white/10 rounded-2xl p-6 shadow-2xl"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white">Choose Avatar</h3>
                  <button onClick={() => setIsAvatarModalOpen(false)} className="text-neutral-500 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {PREDEFINED_AVATARS.map((url, i) => (
                    <button 
                      key={i} 
                      onClick={() => handleSelectAvatar(url)}
                      className="aspect-square rounded-full overflow-hidden bg-neutral-800 border-2 border-transparent hover:border-blue-500 transition-all hover:scale-110"
                    >
                      <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Edit Contact Modal */}
        <AnimatePresence>
          {isContactModalOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsContactModalOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150]"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] w-full max-w-sm bg-neutral-900 border border-white/10 rounded-2xl p-6 shadow-2xl"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white">{t('Contact Settings')}</h3>
                  <button onClick={() => setIsContactModalOpen(false)} className="text-neutral-500 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1 block">{t('Email Address')}</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder={t('Enter your email')}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1 block">{t('Phone Number')}</label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder={t('Enter your phone number')}
                    />
                  </div>
                  <button 
                    onClick={handleSaveContact}
                    className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all"
                  >
                    {t('Save Changes')}
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* --- HEADER SECTION --- */}
        <div className="flex flex-col md:flex-row gap-6 items-start mb-10">
          
          {(() => {
            const _ci = getCreditInfo(profile.creditScore ?? 100);
            return (
          <div className="relative group shrink-0">
            <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 ${_ci.borderClass} shadow-2xl`}>
              <img
                src={profile.avatarUrl || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Avatar Edit Button */}
            <button 
              onClick={() => setIsAvatarModalOpen(true)}
              className="absolute bottom-0 right-0 p-2 bg-neutral-800 rounded-full border border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
            >
              <Edit2 size={14} />
            </button>
          </div>
            );
          })()}

          <div className="flex-1 w-full">
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
              <h1 className={`text-3xl font-bold ${getUsernameColor(profile)}`}>{profile.username}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <SkillBadge level={profile.skillLevel || "Beginner"} onChange={handleSkillChange} />

                {/* Credit rank title — hover to learn how credit works */}
                {(() => {
                  const ci = getCreditInfo(profile.creditScore ?? 100);
                  return (
                    <div className="relative group">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-bold cursor-default select-none transition-colors ${ci.bgColor} ${ci.color}`}>
                        {t(ci.label)}
                      </span>
                      <div className="absolute left-0 top-full mt-2 w-52 bg-neutral-900/95 border border-white/10 rounded-xl p-3 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Credit Score</p>
                        <div className="space-y-1.5">
                          <div className="flex items-start gap-2 text-xs text-neutral-300">
                            <span className="text-green-400 font-bold shrink-0">+1</span>
                            <span>Attend an event on time</span>
                          </div>
                          <div className="flex items-start gap-2 text-xs text-neutral-300">
                            <span className="text-red-400 font-bold shrink-0">−1</span>
                            <span>Quit within 24 hrs of event start</span>
                          </div>
                        </div>
                        {ci.rank === 'Flagged' && (
                          <p className="text-[10px] text-red-400/80 mt-2 pt-2 border-t border-white/5">Score below 100 is visible to hosts.</p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Report User Button */}
                <button
                  onClick={() => setIsReportOpen(true)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-neutral-400 hover:text-red-500 transition-all flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                  title="Report User"
                >
                  <IconAlertTriangle size={12} />
                  <span>{t('Report')}</span>
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

            <div className="flex gap-6 border-t border-white/5 py-3">
              <div className="text-center">
                <div className="text-xl font-bold text-white">{profile.followersCount}</div>
                <div className="text-xs text-neutral-500 uppercase tracking-wider">{t('Followers')}</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-white">{profile.followingCount}</div>
                <div className="text-xs text-neutral-500 uppercase tracking-wider">{t('Following')}</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-white">{profile.pastEvents.length}</div>
                <div className="text-xs text-neutral-500 uppercase tracking-wider">{t('Games')}</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-white">{profile.likedGamesCount}</div>
                <div className="text-xs text-neutral-500 uppercase tracking-wider">{t('Likes')}</div>
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
            {/* Settings Button -> Opens Edit Contact Modal */}
            <button 
              onClick={() => {
                setEditForm({ email: profile.email || "", phone: profile.contactNumber || "" });
                setIsContactModalOpen(true);
              }}
              className="p-2 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
              title="Edit Contact Info"
            >
              <Settings size={20} />
            </button>
            <button className="p-2 rounded-lg bg-neutral-800 text-red-400 hover:bg-red-500/10 transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* --- CONTENT GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">

          {/* Row 1 col 1: Following */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Users size={20} className="text-blue-500" /> {t('Following')}
            </h2>
            <div className="bg-neutral-900/50 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
               {profile.followedUsers.length > 0 ? (
                 <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                   {profile.followedUsers.map(u => {
                     const ci = getCreditInfo(u.creditScore ?? 100);
                     const isFlagged = ci.rank === 'Flagged';
                     return (
                       <button key={u.id} onClick={() => setSelectedUser(u)} className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${isFlagged ? 'bg-red-500/5 hover:bg-red-500/10 border border-red-500/15' : 'hover:bg-white/5'}`}>
                         <div className="w-8 h-8 rounded-full bg-neutral-700 overflow-hidden shrink-0">
                           <img src={u.avatarUrl || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} className="w-full h-full object-cover" />
                         </div>
                         <div className="flex-1 min-w-0">
                           <div className={`text-sm font-bold truncate ${getUsernameColor(u)}`}>{u.username}</div>
                           <div className="flex items-center gap-1.5">
                             <span className={`text-[10px] font-bold ${ci.color}`}>{t(ci.label)}</span>
                           </div>
                         </div>
                         {isFlagged && (
                           <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded shrink-0">{t('⚠ Caution')}</span>
                         )}
                         <ChevronRight size={13} className="text-neutral-600 ml-auto shrink-0" />
                       </button>
                     );
                   })}
                 </div>
               ) : (
                 <div className="text-sm text-neutral-500 text-center py-4">{t('Not following anyone.')}</div>
               )}
            </div>
          </div>

          {/* Row 1 col 2-3: Saved Places */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Heart size={20} className="text-red-500" /> {t('Saved Places')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[352px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
               {profile.followedVenues.length > 0 ? (
                 profile.followedVenues.map(v => (
                   <button
                     key={v.id}
                     onClick={() => setSelectedVenue(v)}
                     className="w-full bg-neutral-900/50 border border-white/10 rounded-xl p-3 flex gap-3 hover:border-white/20 hover:bg-white/5 transition-all text-left group"
                   >
                     <div className="w-12 h-12 rounded-lg bg-neutral-800 overflow-hidden shrink-0">
                       <img src={v.imageUrl} className="w-full h-full object-cover" />
                     </div>
                     <div className="flex-1 min-w-0">
                       <div className="text-sm font-bold text-white truncate">{v.name}</div>
                       <div className="text-xs text-neutral-500 flex items-center gap-1 truncate">
                         <Heart size={10} className="text-red-500 fill-red-500" /> {v.averageRating}
                       </div>
                     </div>
                     <ChevronRight size={14} className="text-neutral-600 group-hover:text-neutral-400 transition-colors self-center shrink-0" />
                   </button>
                 ))
               ) : (
                 <div className="text-sm text-neutral-500 bg-neutral-900/50 border border-white/10 rounded-xl p-4 text-center sm:col-span-2">{t('No saved places.')}</div>
               )}
            </div>
          </div>

          {/* Row 2: Match History — full width, below fold */}
          <div className="lg:col-span-3">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Calendar size={20} className="text-red-500" /> {t('Match History')}
            </h2>
            <div className="bg-neutral-900/50 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
              {profile.pastEvents.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {profile.pastEvents.map(event => {
                    const dateStr = formatShortDate(event.date, lang);
                    return (
                      <button
                        key={event.id}
                        onClick={() => setSelectedMatch(event)}
                        className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors group text-left"
                      >
                        <div className="font-mono text-neutral-500 font-bold text-sm w-16 text-right shrink-0">
                          {dateStr}
                        </div>
                        <div className="text-neutral-600">@</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium truncate">
                            {event.venueName || event.venueId}
                          </div>
                          <div className="text-xs text-neutral-500 truncate">{event.title}</div>
                        </div>
                        {event.myInteraction?.punctuality && (
                          <span className={`w-fit text-[10px] px-2 py-1 rounded-md font-bold border uppercase tracking-wider shrink-0 ${event.myInteraction.punctuality === 'punctual' ? 'text-green-400 bg-green-400/10 border-green-400/20' : 'text-orange-400 bg-orange-400/10 border-orange-400/20'}`}>
                            {event.myInteraction.punctuality === 'punctual' ? t('● Completed') : t('● Left Early')}
                          </span>
                        )}
                        <ChevronRight size={14} className="text-neutral-600 group-hover:text-neutral-400 transition-colors shrink-0" />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-neutral-500">{t('No games played yet.')}</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}