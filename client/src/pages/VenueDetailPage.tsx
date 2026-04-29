import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GameService } from "../services/game.service";
import type { GameVenueDTO, GameSessionDTO } from "../types";
import { AppLayout } from "../components/layout/AppLayout";
import { ReportModal } from "../components/ReportModal";
import { CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconArrowLeft,
  IconMapPin,
  IconStar,
  IconHeart,
  IconCircleCheck,
  IconNavigation,
  IconAlertTriangle,
  IconPlus,
  IconCalendarEvent,
  IconHistory,
  IconUsers,
  IconClock,
  IconTrophy,
  IconX,
  IconCurrencyDollar,
} from "@tabler/icons-react";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatEventDate(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })
  );
}

const PROFICIENCY_STYLES: Record<string, string> = {
  "All Welcome":  "bg-green-500/15 text-green-400 border-green-500/25",
  "Newbie":       "bg-sky-500/15 text-sky-400 border-sky-500/25",
  "Intermediate": "bg-amber-500/15 text-amber-400 border-amber-500/25",
  "Advanced":     "bg-orange-500/15 text-orange-400 border-orange-500/25",
  "Expert":       "bg-red-500/15 text-red-400 border-red-500/25",
};

function ProficiencyBadge({ value }: { value?: string }) {
  if (!value) return null;
  const cls = PROFICIENCY_STYLES[value] ?? "bg-neutral-700/60 text-neutral-400 border-white/10";
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cls}`}>
      {value.toUpperCase()}
    </span>
  );
}

// ── Upcoming Event Card ────────────────────────────────────────────────────

function UpcomingCard({ event, index }: { event: GameSessionDTO; index: number }) {
  const isFull = event.currentPlayers >= event.maxPlayers;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="p-4 rounded-2xl bg-white/5 border border-white/8 hover:bg-white/8 transition-colors space-y-3"
    >
      {/* Top row: status + proficiency + date */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
          isFull ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" : "bg-green-500/10 text-green-400 border-green-500/20"
        }`}>
          {isFull ? "FULL" : "OPEN"}
        </span>
        <ProficiencyBadge value={event.proficiency} />
        <span className="text-xs text-neutral-500 flex items-center gap-1 ml-auto">
          <IconClock size={11} /> {formatEventDate(event.date)}
        </span>
      </div>

      {/* Title */}
      <p className="text-white font-bold text-sm leading-snug">{event.title}</p>

      {/* Host */}
      <p className="text-neutral-500 text-xs">
        Host: <span className="text-neutral-300">{event.hostName ?? "Unknown"}</span>
      </p>

      {/* Description */}
      {event.description && (
        <p className="text-neutral-400 text-xs leading-relaxed border-t border-white/5 pt-2">
          {event.description}
        </p>
      )}

      {/* Footer: players + join */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5 text-neutral-400 text-xs">
          <IconUsers size={14} />
          <span className={isFull ? "text-yellow-400 font-bold" : ""}>
            {event.currentPlayers}/{event.maxPlayers} players
          </span>
        </div>
        <button
          disabled={isFull}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
            isFull
              ? "bg-neutral-800 text-neutral-600 cursor-not-allowed"
              : "bg-red-600 hover:bg-red-500 text-white"
          }`}
        >
          {isFull ? "Full" : "Join"}
        </button>
      </div>
    </motion.div>
  );
}

// ── Past Event Card ────────────────────────────────────────────────────────

function PastCard({ event, index }: { event: GameSessionDTO; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="p-4 rounded-2xl bg-white/[0.03] border border-white/8 hover:bg-white/5 transition-colors space-y-3"
    >
      {/* Top row: FINISHED + proficiency + date */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-700/60 text-neutral-500 border border-white/8">
          FINISHED
        </span>
        <ProficiencyBadge value={event.proficiency} />
        <span className="text-xs text-neutral-600 flex items-center gap-1 ml-auto">
          <IconClock size={11} /> {formatEventDate(event.date)}
        </span>
      </div>

      {/* Title */}
      <p className="text-neutral-200 font-bold text-sm leading-snug">{event.title}</p>

      {/* Venue address + price */}
      {(event.venueAddress || event.pricePerHour !== undefined) && (
        <div className="flex items-center gap-3 text-xs text-neutral-500 flex-wrap">
          {event.venueAddress && (
            <span className="flex items-center gap-1">
              <IconMapPin size={12} className="text-red-500/70 flex-shrink-0" />
              {event.venueAddress}
            </span>
          )}
          {event.pricePerHour !== undefined && (
            <span className="flex items-center gap-1 flex-shrink-0 ml-auto">
              <IconCurrencyDollar size={12} className="text-neutral-500" />
              ${event.pricePerHour}/hr
            </span>
          )}
        </div>
      )}

      {/* Host */}
      <p className="text-neutral-600 text-xs">
        Host: <span className="text-neutral-500">{event.hostName ?? "Unknown"}</span>
      </p>

      {/* Description */}
      {event.description && (
        <p className="text-neutral-500 text-xs leading-relaxed border-t border-white/5 pt-2">
          {event.description}
        </p>
      )}

      {/* Footer: attendance + likes */}
      <div className="flex items-center justify-between pt-1 text-neutral-500 text-xs border-t border-white/5">
        <div className="flex items-center gap-1">
          <IconUsers size={13} />
          <span>{event.currentPlayers}/{event.maxPlayers} attended</span>
        </div>
        <div className="flex items-center gap-1">
          <IconTrophy size={13} className="text-yellow-600/70" />
          <span>{event.totalLikes} likes</span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Slide-over Drawer ──────────────────────────────────────────────────────

interface DrawerProps {
  kind: "upcoming" | "past";
  events: GameSessionDTO[];
  onClose: () => void;
}

function EventsDrawer({ kind, events, onClose }: DrawerProps) {
  const isUpcoming = kind === "upcoming";

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        className="fixed inset-0 bg-black/60 z-[100]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        key="panel"
        className="fixed right-0 top-0 h-full w-full max-w-md bg-neutral-950 border-l border-white/10 z-[101] flex flex-col"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-6 py-5 border-b border-white/8 bg-neutral-950/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            {isUpcoming
              ? <IconCalendarEvent size={20} className="text-red-400" />
              : <IconHistory size={20} className="text-neutral-400" />
            }
            <h2 className="text-lg font-bold text-white">
              {isUpcoming ? "Coming Events" : "Event History"}
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/5 text-neutral-400 border border-white/10">
              {events.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-3">
          {events.length === 0 ? (
            <p className="text-neutral-500 text-sm text-center mt-12">
              {isUpcoming ? "No upcoming events scheduled here yet." : "No past events recorded here."}
            </p>
          ) : isUpcoming ? (
            events.map((ev, i) => <UpcomingCard key={ev.id} event={ev} index={i} />)
          ) : (
            events.map((ev, i) => <PastCard key={ev.id} event={ev} index={i} />)
          )}
        </div>
      </motion.div>
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function VenueDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [venue, setVenue]       = useState<GameVenueDTO | null>(null);
  const [sessions, setSessions] = useState<GameSessionDTO[]>([]);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [showToast, setShowToast]       = useState(false);
  const [drawer, setDrawer]             = useState<"upcoming" | "past" | null>(null);

  useEffect(() => {
    if (!id) return;
    GameService.getVenueById(id).then(data => {
      if (data) setVenue(data);
    });
    GameService.getSessionsByVenue(id).then(setSessions);
  }, [id]);

  const now = Date.now();
  const comingEvents  = useMemo(() => sessions.filter(s => s.status !== "finished" || new Date(s.date).getTime() > now), [sessions, now]);
  const historyEvents = useMemo(() => sessions.filter(s => s.status === "finished"), [sessions]);

  const triggerToast = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleLike = async () => {
    if (!venue || !id) return;
    const prev = venue.myInteraction?.isLiked ?? false;
    setVenue(v => v ? {
      ...v,
      totalLikes: prev ? v.totalLikes - 1 : v.totalLikes + 1,
      myInteraction: {
        userId: v.myInteraction?.userId ?? "",
        venueId: id,
        isLiked: !prev,
        isSubscribed: v.myInteraction?.isSubscribed ?? false,
        myRating: v.myInteraction?.myRating,
      },
    } : v);
    try {
      await GameService.likeVenue(id);
    } catch {
      // revert on error
      setVenue(v => v ? {
        ...v,
        totalLikes: prev ? v.totalLikes + 1 : v.totalLikes - 1,
        myInteraction: {
          userId: v.myInteraction?.userId ?? "",
          venueId: id,
          isLiked: prev,
          isSubscribed: v.myInteraction?.isSubscribed ?? false,
          myRating: v.myInteraction?.myRating,
        },
      } : v);
    }
  };

  if (!venue) {
    return (
      <AppLayout>
        <div className="p-10 text-white flex items-center justify-center h-full">
          <p className="text-neutral-400">Loading details...</p>
        </div>
      </AppLayout>
    );
  }

  const isLiked = venue.myInteraction?.isLiked ?? false;

  return (
    <AppLayout>
      <div className="h-full w-full overflow-y-auto p-6 md:p-10 custom-scrollbar relative">

        {/* Toast */}
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
              className="fixed top-24 left-10 z-[200] flex items-center gap-2 px-6 py-3 bg-neutral-900 border border-green-500/30 rounded-full shadow-2xl backdrop-blur-md"
            >
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-white font-bold text-sm tracking-wide">Submitted</span>
            </motion.div>
          )}
        </AnimatePresence>

        <ReportModal
          isOpen={isReportOpen} onClose={() => setIsReportOpen(false)}
          onSuccess={triggerToast} targetType="Space" targetName={venue.name}
        />

        {/* Slide-over Drawer */}
        <AnimatePresence>
          {drawer && (
            <EventsDrawer
              kind={drawer}
              events={drawer === "upcoming" ? comingEvents : historyEvents}
              onClose={() => setDrawer(null)}
            />
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors group">
            <IconArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back to Directory</span>
          </button>
          <button onClick={() => setIsReportOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-sm font-bold">
            <IconAlertTriangle size={16} /><span>Report Space</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">

          {/* ── Left column ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Hero image */}
            <div className="w-full h-64 md:h-96 rounded-3xl overflow-hidden relative shadow-2xl border border-white/5">
              <img src={venue.imageUrl} alt={venue.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <div className="absolute bottom-6 left-6 md:left-10">
                <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">{venue.name}</h1>
                <p className="text-neutral-300 flex items-center gap-2 text-lg">
                  <IconMapPin size={20} className="text-red-500" /> {venue.address}
                </p>
              </div>
            </div>

            {/* About */}
            <div className="bg-neutral-900/40 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
              <h2 className="text-xl font-bold text-white mb-4">About this Place</h2>
              <p className="text-neutral-400 leading-relaxed mb-8">
                {venue.description || "A mysterious gathering place for werewolves and villagers alike."}
              </p>
              <h3 className="text-lg font-bold text-white mb-4">Amenities</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {venue.amenities.map(am => (
                  <div key={am} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 text-neutral-300">
                    <IconCircleCheck size={18} className="text-green-500 flex-shrink-0" />
                    <span className="text-sm">{am}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Coming Events ── */}
            <div className="bg-neutral-900/40 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
              <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
                <IconCalendarEvent size={22} className="text-red-400" />
                Coming Events
                {comingEvents.length > 0 && (
                  <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                    {comingEvents.length}
                  </span>
                )}
              </h2>

              {comingEvents.length === 0 ? (
                <p className="text-neutral-500 text-sm">No upcoming events scheduled here yet.</p>
              ) : (
                <div className="space-y-3">
                  {comingEvents.map((event, i) => {
                    const isFull = event.currentPlayers >= event.maxPlayers;
                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/5 border border-white/8 hover:bg-white/8 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isFull ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" : "bg-green-500/10 text-green-400 border-green-500/20"}`}>
                              {isFull ? "FULL" : "OPEN"}
                            </span>
                            <ProficiencyBadge value={event.proficiency} />
                            <span className="text-xs text-neutral-500 flex items-center gap-1">
                              <IconClock size={11} /> {formatEventDate(event.date)}
                            </span>
                          </div>
                          <p className="text-white font-semibold text-sm truncate">{event.title}</p>
                          <p className="text-neutral-500 text-xs mt-0.5">
                            Host: <span className="text-neutral-300">{event.hostName ?? "Unknown"}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="flex items-center gap-1 text-neutral-400 text-xs">
                            <IconUsers size={13} />
                            <span className={isFull ? "text-yellow-400 font-bold" : ""}>
                              {event.currentPlayers}/{event.maxPlayers}
                            </span>
                          </div>
                          <button
                            disabled={isFull}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              isFull
                                ? "bg-neutral-700 text-neutral-500 cursor-not-allowed"
                                : "bg-red-600 hover:bg-red-500 text-white active:scale-95"
                            }`}
                          >
                            {isFull ? "Full" : "Join"}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Event History ── */}
            <div className="bg-neutral-900/40 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
              <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
                <IconHistory size={22} className="text-neutral-400" />
                Event History
                {historyEvents.length > 0 && (
                  <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-white/5 text-neutral-400 border border-white/10">
                    {historyEvents.length}
                  </span>
                )}
              </h2>

              {historyEvents.length === 0 ? (
                <p className="text-neutral-500 text-sm">No events have been held here yet.</p>
              ) : (
                <div className="space-y-3">
                  {historyEvents.map((event, i) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-700/60 text-neutral-400 border border-white/5">
                            FINISHED
                          </span>
                          <ProficiencyBadge value={event.proficiency} />
                          <span className="text-xs text-neutral-600 flex items-center gap-1">
                            <IconClock size={11} /> {formatEventDate(event.date)}
                          </span>
                        </div>
                        <p className="text-neutral-300 font-semibold text-sm truncate">{event.title}</p>
                        <p className="text-neutral-600 text-xs mt-0.5">
                          Host: <span className="text-neutral-500">{event.hostName ?? "Unknown"}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0 text-neutral-500 text-xs">
                        <div className="flex items-center gap-1">
                          <IconUsers size={13} />
                          <span>{event.currentPlayers}/{event.maxPlayers}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <IconTrophy size={13} className="text-yellow-600/70" />
                          <span>{event.totalLikes}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* ── Right column: Action card ── */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md sticky top-6 shadow-xl">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-2">
                  <IconStar size={28} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-3xl font-bold text-white leading-none">{venue.averageRating}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleLike}
                    className={`p-2 rounded-full transition-all active:scale-90 ${isLiked ? "bg-red-500/10 border border-red-500/20" : "bg-white/5 hover:bg-white/10 border border-white/10"}`}
                  >
                    <IconHeart size={24} className={`transition-colors ${isLiked ? "text-red-500 fill-red-500" : "text-neutral-400 hover:text-red-400"}`} />
                  </button>
                  <div className="text-right">
                    <div className="text-xl font-bold text-white">{venue.totalLikes}</div>
                    <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Likes</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                  <IconPlus size={20} /> Book Now
                </button>
                <button className="w-full py-4 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-2xl border border-white/10 flex items-center justify-center gap-2 transition-all">
                  <IconNavigation size={20} /> Directions
                </button>
              </div>

              {/* Quick stats — clickable to open drawer */}
              {(comingEvents.length > 0 || historyEvents.length > 0) && (
                <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 gap-3 text-center">
                  <button
                    onClick={() => setDrawer("upcoming")}
                    className="bg-white/5 hover:bg-white/10 rounded-xl p-3 cursor-pointer transition-colors group"
                  >
                    <div className="text-xl font-bold text-red-400 group-hover:text-red-300 transition-colors">
                      {comingEvents.length}
                    </div>
                    <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5">Upcoming</div>
                  </button>
                  <button
                    onClick={() => setDrawer("past")}
                    className="bg-white/5 hover:bg-white/10 rounded-xl p-3 cursor-pointer transition-colors group"
                  >
                    <div className="text-xl font-bold text-neutral-300 group-hover:text-white transition-colors">
                      {historyEvents.length}
                    </div>
                    <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5">Past Events</div>
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
