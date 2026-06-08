import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import { GameService } from "../services/game.service";
import { AuthService } from "../services/auth.service";
import type { GameVenue } from "../types";
import { VENUE_TYPE_LABELS, getDisplayAddress } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Star, Heart, Bell, BellOff, Search, Plus, CheckCircle, BadgeCheck, Lock, Settings } from "lucide-react";
import { IconAlertTriangle } from "@tabler/icons-react";
import { AppLayout } from "../components/layout/AppLayout";
import { CreateSpaceModal } from "../components/CreateSpaceModal";
import { ReportModal } from "../components/ReportModal";
import { AuthModal } from "../components/AuthModal";
import { useAuthGate } from "../hooks/useAuthGate";

type VenueUI = GameVenue & { isLiked?: boolean; isSubscribed?: boolean; pendingApplicationsCount?: number };

const MAX_SPACES_PER_USER = 3;

export default function GameSpacePage() {
  const [venues, setVenues] = useState<VenueUI[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [reportData, setReportData] = useState<{ isOpen: boolean; name: string } | null>(null);
  const [showToast, setShowToast] = useState(false);
  const navigate = useNavigate();
  const { t, lang } = useLang();

  const currentUser = AuthService.getCurrentUser();
  // Guests can browse spaces freely, but liking/subscribing/creating require
  // an account — requireAuth() opens the login modal instead of letting the
  // action through (it would otherwise 401 or, for purely-local toggles like
  // handleLike, silently "succeed" in the UI without persisting anything).
  const { isAuthOpen, setAuthOpen, requireAuth } = useAuthGate();

  const loadVenues = () => {
    GameService.getAllVenues().then(data => {
      setVenues(data.map(v => ({
        ...v,
        isLiked:                  v.myInteraction?.isLiked     ?? false,
        isSubscribed:             v.myInteraction?.isSubscribed ?? false,
        pendingApplicationsCount: v.pendingApplicationsCount,
      })));
    });
  };

  useEffect(() => { loadVenues(); }, []);

  const triggerToast = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleLike = (e: React.MouseEvent, venueId: string) => {
    e.stopPropagation();
    if (!requireAuth()) return;
    setVenues(prev => prev.map(v => {
      if (v.id !== venueId) return v;
      const liked = v.isLiked || false;
      return { ...v, isLiked: !liked, totalLikes: liked ? (v.totalLikes || 1) - 1 : (v.totalLikes || 0) + 1 };
    }));
  };

  const handleSubscribe = async (e: React.MouseEvent, venueId: string) => {
    e.stopPropagation();
    if (!requireAuth()) return;
    setVenues(prev => prev.map(v =>
      v.id === venueId ? { ...v, isSubscribed: !v.isSubscribed } : v
    ));
    try {
      await GameService.subscribeVenue(venueId);
    } catch {
      // revert on error
      setVenues(prev => prev.map(v =>
        v.id === venueId ? { ...v, isSubscribed: !v.isSubscribed } : v
      ));
    }
  };

  // ── Derived lists ──────────────────────────────────────────────────────────

  const myVenues = useMemo(
    () => currentUser ? venues.filter(v => v.ownerId === currentUser.id) : [],
    [venues, currentUser]
  );

  const isAdmin     = currentUser?.role === 'admin' || currentUser?.role === 'web_admin';
  const slotsUsed   = myVenues.length;
  // Admins are not bound by the per-user space limit
  const slotsLeft   = isAdmin ? 0 : Math.max(0, MAX_SPACES_PER_USER - slotsUsed);
  const canAddMore  = isAdmin || slotsLeft > 0;

  const q = searchQuery.trim().toLowerCase();
  const filteredVenues = useMemo(() => {
    const others = venues.filter(v => v.ownerId !== currentUser?.id);
    if (!q) return others;
    return others.filter(v =>
      v.name.toLowerCase().includes(q) ||
      v.address.toLowerCase().includes(q) ||
      (v.area ?? "").toLowerCase().includes(q) ||
      (v.type ? VENUE_TYPE_LABELS[v.type].toLowerCase().includes(q) : false) ||
      v.amenities.some(a => a.toLowerCase().includes(q))
    );
  }, [venues, q, currentUser]);

  // ── Shared card renderer ───────────────────────────────────────────────────

  const VenueCard = ({ venue, index, isOwned = false }: { venue: VenueUI; index: number; isOwned?: boolean }) => {
   const subscribed = venue.isSubscribed ?? false;
   return (
    <motion.div
      key={venue.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      whileHover={{ y: -4 }}
      className={`backdrop-blur-md border rounded-2xl overflow-hidden cursor-pointer group transition-all shadow-lg hover:shadow-xl relative flex flex-col ${
        isOwned
          ? "bg-amber-950/20 border-amber-500/25 hover:border-amber-400/50"
          : "bg-neutral-900/40 border-white/10 hover:border-white/30"
      }`}
    >
      {/* Image */}
      <div className="h-44 overflow-hidden relative" onClick={() => navigate(`/gamespace/${venue.id}`)}>
        <img
          src={venue.imageUrl}
          alt={venue.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute top-3 right-3 flex gap-1.5">
          <div className="bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
            <Star size={12} className="text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-bold text-white">{venue.averageRating}</span>
          </div>
        </div>
        {/* Pending badge (owner only) */}
        {isOwned && venue.pendingApplicationsCount && venue.pendingApplicationsCount > 0 ? (
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/gamespace/${venue.id}#pending-approvals`); }}
            className="absolute top-3 left-3 flex items-center gap-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-lg animate-pulse transition-colors cursor-pointer"
          >
            {venue.pendingApplicationsCount} Pending
          </button>
        ) : null}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-1.5">
          <h3
            onClick={() => navigate(`/gamespace/${venue.id}`)}
            className={`font-bold text-white transition-colors flex items-center gap-1.5 text-base leading-snug ${
              isOwned ? "group-hover:text-amber-400" : "group-hover:text-blue-400"
            }`}
          >
            {venue.name}
            {venue.isVerified && (
              <BadgeCheck size={16} className="text-green-400 shrink-0" aria-label="Verified Space" />
            )}
          </h3>

          <div className="flex items-center gap-1 shrink-0">
            {isOwned && (
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/gamespace/${venue.id}`); }}
                className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 transition-all"
                title="Edit Space"
              >
                <Settings size={13} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setReportData({ isOpen: true, name: venue.name }); }}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-neutral-500 hover:text-red-500 transition-all"
              title="Report Space"
            >
              <IconAlertTriangle size={13} />
            </button>
          </div>
        </div>

        <p className="text-neutral-500 text-xs mb-2.5 flex items-center gap-1 truncate">
          {venue.privacy && venue.privacy !== 'public'
            ? <Lock size={11} className="shrink-0 text-amber-500/70" />
            : <MapPin size={12} className="shrink-0" />
          }
          <span className="truncate">{getDisplayAddress(venue)}</span>
        </p>

        <div className="flex gap-1.5 mb-2.5 flex-wrap">
          {venue.type && (
            <span className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
              isOwned
                ? "bg-amber-500/15 border-amber-500/25 text-amber-400"
                : "bg-amber-500/10 border-amber-500/20 text-amber-400"
            }`}>
              {VENUE_TYPE_LABELS[venue.type]}
            </span>
          )}
          {venue.maxPax && (
            <span className="text-[10px] bg-white/5 border border-white/10 text-neutral-400 px-2 py-0.5 rounded">
              Up to {venue.maxPax} pax
            </span>
          )}
        </div>

        <div className="flex gap-1.5 mb-3 flex-wrap">
          {venue.amenities.slice(0, 3).map(am => (
            <span key={am} className="text-[10px] bg-white/5 border border-white/10 text-neutral-300 px-2 py-0.5 rounded">
              {am}
            </span>
          ))}
          {venue.amenities.length > 3 && (
            <span className="text-[10px] text-neutral-500 py-0.5">+{venue.amenities.length - 3}</span>
          )}
        </div>

        <div className="mt-auto border-t border-white/5 pt-3 flex items-center justify-between gap-2">
          {/* Like */}
          <button
            onClick={(e) => handleLike(e, venue.id)}
            className={`flex items-center gap-1 text-xs font-medium transition-colors p-1 -ml-1 rounded-lg active:scale-95 ${
              venue.isLiked ? 'text-red-400 hover:bg-red-500/10' : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
            }`}
          >
            <Heart size={13} className={`transition-all duration-300 ${
              venue.isLiked ? 'text-red-500 fill-red-500 scale-110' : 'text-red-500/50 group-hover:text-red-500'
            }`} />
            <span>{venue.totalLikes || 0}</span>
          </button>

          {/* Subscribe */}
          <button
            onClick={(e) => handleSubscribe(e, venue.id)}
            title={subscribed ? "Unsubscribe" : "Subscribe for updates"}
            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg border transition-all active:scale-95 ${
              subscribed
                ? "bg-sky-500/15 border-sky-500/30 text-sky-400 hover:bg-sky-500/20"
                : "bg-white/5 border-white/10 text-neutral-400 hover:bg-sky-500/10 hover:border-sky-500/25 hover:text-sky-400"
            }`}
          >
            {subscribed
              ? <BellOff size={12} />
              : <Bell size={12} />
            }
            <span>{subscribed ? t("Subscribed") : t("Subscribe")}</span>
          </button>

          {/* Price */}
          {venue.pricePerHour !== undefined && (
            <span className="text-xs font-bold text-green-400 shrink-0">
              {venue.pricePerHour === 0
                ? t("Free")
                : venue.priceType === "per_person"
                  ? `$${venue.pricePerHour}/${t('person/hr')}`
                  : `$${venue.pricePerHour}/hr`}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
 };

  // ── "Add Space" slot card ──────────────────────────────────────────────────

  const AddSlotCard = ({ slotIndex }: { slotIndex: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: slotIndex * 0.07 }}
      onClick={() => { if (requireAuth()) setIsCreateModalOpen(true); }}
      className="border-2 border-dashed border-amber-500/25 hover:border-amber-500/50 rounded-2xl cursor-pointer group transition-all flex flex-col items-center justify-center min-h-[260px] gap-3 bg-amber-500/5 hover:bg-amber-500/10"
    >
      <div className="w-12 h-12 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
        <Plus size={22} className="text-amber-400" />
      </div>
      <div className="text-center px-4">
        <p className="text-amber-400 font-semibold text-sm">{t('Add a Space')}</p>
        <p className="text-neutral-500 text-xs mt-0.5">
          {lang === 'zh'
            ? `第 ${slotIndex + 1} / ${MAX_SPACES_PER_USER} 个空位`
            : `Slot ${slotIndex + 1} of ${MAX_SPACES_PER_USER} available`}
        </p>
      </div>
    </motion.div>
  );

  return (
    <AppLayout>
      <div className="h-full w-full overflow-y-auto p-6 md:p-8 relative custom-scrollbar">

        {/* Toast */}
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: 50, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 20, x: "-50%" }}
              className="fixed bottom-10 left-1/2 z-[200] flex items-center gap-2 px-6 py-3 bg-neutral-900 border border-green-500/30 rounded-full shadow-2xl backdrop-blur-md pointer-events-none"
            >
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-white font-bold text-sm tracking-wide">Report Submitted</span>
            </motion.div>
          )}
        </AnimatePresence>

        <ReportModal
          isOpen={reportData?.isOpen || false}
          onClose={() => setReportData(null)}
          onSuccess={triggerToast}
          targetType="Space"
          targetName={reportData?.name || ""}
        />

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">{t('Game Spaces')}</h1>
            <p className="text-neutral-400 text-sm">{t('Discover the best places to hunt in Singapore.')}</p>
          </div>

          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
            {/* Search */}
            <div className="relative group w-full md:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={15} className="text-neutral-500 group-focus-within:text-white transition-colors" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('Search name, area, amenities…')}
                className="w-full bg-neutral-900/50 border border-neutral-700 text-white rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-neutral-500 focus:bg-neutral-800 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-3 flex items-center text-neutral-500 hover:text-white"
                >×</button>
              )}
            </div>

            {/* Add Space button — shows remaining slots when logged in */}
            {currentUser ? (
              <button
                onClick={() => canAddMore && setIsCreateModalOpen(true)}
                disabled={!canAddMore}
                className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 whitespace-nowrap text-sm ${
                  canAddMore
                    ? "bg-blue-600 hover:bg-blue-500 text-white"
                    : "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-white/10"
                }`}
              >
                <Plus size={16} />
                {canAddMore ? t('Add Space') : t('Limit Reached')}
                {!isAdmin && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    canAddMore ? "bg-white/20" : "bg-white/5"
                  }`}>
                    {slotsUsed}/{MAX_SPACES_PER_USER}
                  </span>
                )}
              </button>
            ) : (
              <button
                onClick={() => requireAuth()}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 whitespace-nowrap text-sm"
              >
                <Plus size={16} /> {t('Add Space')}
              </button>
            )}
          </div>
        </div>

        {/* ── My Spaces section (owner only, no search filter) ── */}
        {currentUser && myVenues.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings size={18} className="text-amber-400" />
                {t('My Spaces')}
              </h2>
              {isAdmin ? (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
                  {slotsUsed} {t('spaces')} · {t('Unlimited (Admin)')}
                </span>
              ) : (
                <>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
                    {slotsUsed} / {MAX_SPACES_PER_USER} {t('used')}
                  </span>
                  {!canAddMore && (
                    <span className="text-xs text-neutral-500">Limit reached</span>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {myVenues.map((venue, i) => (
                <VenueCard key={venue.id} venue={venue} index={i} isOwned />
              ))}
              {/* Empty slots to fill up to MAX_SPACES_PER_USER */}
              {Array.from({ length: slotsLeft }).map((_, i) => (
                <AddSlotCard key={`slot-${i}`} slotIndex={slotsUsed + i} />
              ))}
            </div>
          </div>
        )}

        {/* ── All Spaces ── */}
        <div>
          {myVenues.length > 0 && (
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-bold text-white">{t('All Spaces')}</h2>
              {q && (
                <span className="text-xs text-neutral-400">
                  {filteredVenues.length} result{filteredVenues.length !== 1 ? "s" : ""} for "{searchQuery}"
                </span>
              )}
            </div>
          )}

          {filteredVenues.length === 0 && q ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-neutral-500">
              <Search size={32} className="opacity-30" />
              <p className="text-sm">{t('No spaces match')} "<span className="text-white">{searchQuery}</span>"</p>
              <button onClick={() => setSearchQuery("")} className="text-xs text-blue-400 hover:underline">{t('Clear search')}</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-20">
              {filteredVenues.map((venue, i) => (
                <VenueCard key={venue.id} venue={venue} index={i} />
              ))}
            </div>
          )}
        </div>

        <CreateSpaceModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={loadVenues}
        />
        <AuthModal isOpen={isAuthOpen} onClose={() => setAuthOpen(false)} initialView="login" />
      </div>
    </AppLayout>
  );
}
