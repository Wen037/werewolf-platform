import { useState, useEffect } from "react";
import { useLang } from "../context/LanguageContext";
import { MapContainer, TileLayer, Marker, Tooltip, useMap, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GameService } from "../services/game.service";
import { AuthService } from "../services/auth.service";
import type { GameVenue, GameSession } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X, Navigation, Heart, Bell, Clock, CheckCircle, SlidersHorizontal, Pin, PinOff } from "lucide-react";
import { IconAlertTriangle } from "@tabler/icons-react";
import { ReportModal } from "../components/ReportModal";
import { AuthModal } from "../components/AuthModal";
import { useAuthGate } from "../hooks/useAuthGate";
import { useNavigate } from "react-router-dom";

// --- ICONS ---
const googleUserIcon = new L.DivIcon({
  className: "user-location-dot",
  iconSize: [20, 20],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
});

const eventsIcon = new L.Icon({
  iconUrl: "/mapEventIcon.png",
  iconSize: [45, 45],
  popupAnchor: [0, -20]
});

const placeIcon = new L.Icon({
  iconUrl: "/icon_werewolf.png",
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36]
});

// --- HELPER: Truncate venue/place name shown under map markers (max 10 chars) ---
const truncateMapLabel = (name: string | undefined | null, max = 10) => {
  if (!name) return "";
  return name.length > max ? `${name.slice(0, max)}...` : name;
};

// --- HELPER: Date Formatter ---
const formatGameTime = (dateString: string) => {
  const date = new Date(dateString);
  const dd = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleDateString('en-US', { month: 'short' }); 
  const day = date.toLocaleDateString('en-US', { weekday: 'short' }); 
  
  const time = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return `${dd} ${month} ${time}, ${day}`;
};

// --- HELPER: Map Updater ---
function MapUpdater({ userLoc, venues }: { userLoc: { lat: number, lng: number } | null, venues: any[] }) {
  const map = useMap();
  useEffect(() => {
    if (venues.length === 0) return;
    if (userLoc) {
      const sortedVenues = [...venues].sort((a, b) => {
        const distA = Math.sqrt(Math.pow(userLoc.lat - a.coordinates.lat, 2) + Math.pow(userLoc.lng - a.coordinates.lng, 2));
        const distB = Math.sqrt(Math.pow(userLoc.lat - b.coordinates.lat, 2) + Math.pow(userLoc.lng - b.coordinates.lng, 2));
        return distA - distB;
      });
      const nearest3 = sortedVenues.slice(0, 3);
      const bounds = L.latLngBounds([
        [userLoc.lat, userLoc.lng],
        ...nearest3.map(v => [v.coordinates.lat, v.coordinates.lng] as [number, number])
      ]);
      map.fitBounds(bounds, { padding: [80, 80], animate: true, duration: 1.5 });
    }
  }, [userLoc, venues, map]);
  return null;
}

// Extend Types Locally for UI State
type VenueUI = GameVenue & { isLiked?: boolean; isSubscribed?: boolean };
type GameUI = GameSession & { isLiked?: boolean; isSubscribed?: boolean; venueDetails?: GameVenue; joinedPlayerAvatars?: string[]; venueImageUrl?: string };

type JoinState = "idle" | "joining" | "joined" | "pending";

export default function GameMapPage() {
  const [venues, setVenues] = useState<VenueUI[]>([]);
  const [games, setGames] = useState<GameUI[]>([]);
  const [mode, setMode] = useState<"places" | "events">("places");
  const { t } = useLang();
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number, lng: number } | null>(null);
  const [reportData, setReportData] = useState<{ isOpen: boolean; name: string, type: "Space" | "Event" } | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [joinStates, setJoinStates] = useState<Record<string, JoinState>>({});
  const navigate = useNavigate();
  const currentUser = AuthService.getCurrentUser();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'web_admin';
  // Guests can browse the map (view spaces & events) freely; subscribing,
  // liking and joining require an account — gate behind a login prompt.
  const { isAuthOpen, setAuthOpen, requireAuth } = useAuthGate();

  // Event filters
  const [eventProfFilter, setEventProfFilter] = useState<string>("all");
  const [eventDateFilter, setEventDateFilter] = useState<string>("all");
  const [hideFullEvents, setHideFullEvents] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const triggerToast = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  useEffect(() => {
    // Events that started more than 1 hour ago are considered stale and hidden from the map.
    const ONE_HOUR_MS = 60 * 60 * 1000;
    const isFresh = (g: { date: string }) =>
      new Date(g.date).getTime() > Date.now() - ONE_HOUR_MS;

    Promise.all([GameService.getAllVenues(), GameService.getActiveGames()])
      .then(([vData, gData]) => {
        setVenues(vData.map(v => ({ ...v, isLiked: v.myInteraction?.isLiked ?? false })));
        // Filter out events that started more than 1 hour ago
        const freshGames = gData.filter(isFresh);
        setGames(freshGames.map(g => ({ ...g, isLiked: g.myInteraction?.isLiked ?? false })));
        // Initialize join states from existing interactions
        const initial: Record<string, JoinState> = {};
        for (const g of freshGames) {
          const s = (g as any).myInteraction?.status;
          if (s === "registered" || s === "attended") initial[g.id] = "joined";
          else if (s === "pending") initial[g.id] = "pending";
        }
        setJoinStates(initial);
      });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setUserLoc({ lat: position.coords.latitude, lng: position.coords.longitude }),
        (error) => console.log("Loc Error:", error)
      );
    }
  }, []);

  const openGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
  };

  const getVenueForGame = (venueId: string) => venues.find(v => v.id === venueId);

  // --- SUBSCRIBE HANDLERS ---
  const handleSubscribeVenue = (e: React.MouseEvent, venueId: string) => {
    e.stopPropagation();
    if (!requireAuth()) return;
    setVenues(prev => prev.map(v => {
      if (v.id !== venueId) return v;
      const updated = { ...v, isSubscribed: !v.isSubscribed };
      if (selectedItem?.id === venueId) setSelectedItem(updated);
      GameService.subscribeVenue(venueId).catch(() => {
        setVenues(p => p.map(x => x.id === venueId ? { ...x, isSubscribed: v.isSubscribed } : x));
      });
      return updated;
    }));
  };

  const handleSubscribeEvent = (e: React.MouseEvent, gameId: string) => {
    e.stopPropagation();
    if (!requireAuth()) return;
    setGames(prev => prev.map(g => {
      if (g.id !== gameId) return g;
      const updated = { ...g, isSubscribed: !g.isSubscribed };
      if (selectedItem?.id === gameId) setSelectedItem(updated);
      return updated;
    }));
  };

  // --- LIKE HANDLERS ---
  const handleLikeVenue = (e: React.MouseEvent, venueId: string) => {
    e.stopPropagation();
    if (!requireAuth()) return;
    setVenues(prev => prev.map(v => {
      if (v.id === venueId) {
        const updated = {
          ...v,
          isLiked: !v.isLiked,
          totalLikes: v.isLiked ? (v.totalLikes || 1) - 1 : (v.totalLikes || 0) + 1
        };
        if (selectedItem?.id === venueId) setSelectedItem(updated);
        return updated;
      }
      return v;
    }));
  };

  const handleLikeEvent = (e: React.MouseEvent, gameId: string) => {
    e.stopPropagation();
    if (!requireAuth()) return;
    setGames(prev => prev.map(g => {
      if (g.id === gameId) {
        const updated = {
          ...g,
          isLiked: !g.isLiked,
          totalLikes: g.isLiked ? (g.totalLikes || 1) - 1 : (g.totalLikes || 0) + 1
        };
        if (selectedItem?.id === gameId) setSelectedItem(updated);
        return updated;
      }
      return g;
    }));
  };

  // --- ADMIN PIN HANDLERS ---
  const handlePinGame = async (e: React.MouseEvent, gameId: string) => {
    e.stopPropagation();
    try {
      const { isPinned } = await GameService.pinGame(gameId);
      setGames(prev => prev.map(g => {
        const updated = g.id === gameId ? { ...g, isPinned } : g;
        if (selectedItem?.id === gameId) setSelectedItem({ ...selectedItem, isPinned });
        return updated;
      }));
    } catch { /* silent */ }
  };

  const handlePinVenueMap = async (e: React.MouseEvent, venueId: string) => {
    e.stopPropagation();
    try {
      const { isPinned } = await GameService.pinVenue(venueId);
      setVenues(prev => prev.map(v => {
        const updated = v.id === venueId ? { ...v, isPinned } : v;
        if (selectedItem?.id === venueId) setSelectedItem({ ...selectedItem, isPinned });
        return updated;
      }));
    } catch { /* silent */ }
  };

  const handleJoinGame = async (gameId: string) => {
    if (!requireAuth()) return;
    const current = joinStates[gameId] ?? "idle";
    if (current !== "idle") return;
    setJoinStates(prev => ({ ...prev, [gameId]: "joining" }));
    try {
      const result = await GameService.joinGame(gameId);
      const next: JoinState = result.wasWaitlisted ? "pending" : "joined";
      setJoinStates(prev => ({ ...prev, [gameId]: next }));
      setGames(prev => prev.map(g => {
        if (g.id !== gameId) return g;
        const updated = { ...g, currentPlayers: result.wasWaitlisted ? g.currentPlayers : g.currentPlayers + 1 };
        if (selectedItem?.id === gameId) setSelectedItem({ ...selectedItem, currentPlayers: updated.currentPlayers });
        return updated;
      }));
    } catch {
      setJoinStates(prev => ({ ...prev, [gameId]: "idle" }));
    }
  };

  const getJoinLabel = (gameId: string, approvalMode?: string, isFull?: boolean) => {
    const state = joinStates[gameId] ?? "idle";
    if (state === "joining") return t("Joining...");
    if (state === "joined") return t("Joined");
    if (state === "pending") return t("Pending Approval");
    if (isFull) return t("Full");
    if (approvalMode === "approval") return t("Apply to Join");
    return t("Join Game");
  };

  const getJoinBtnCls = (gameId: string, isFull?: boolean) => {
    const state = joinStates[gameId] ?? "idle";
    if (state === "joined") return "bg-green-600/80 text-white cursor-default";
    if (state === "pending") return "bg-amber-500/20 border border-amber-500/40 text-amber-300 cursor-default";
    if (isFull) return "bg-neutral-700 text-neutral-500 cursor-not-allowed";
    return "bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white";
  };

  const filteredGames = games.filter(g => {
    if (eventProfFilter !== "all" && g.proficiency !== eventProfFilter) return false;
    if (hideFullEvents && g.currentPlayers >= g.maxPlayers) return false;
    if (eventDateFilter !== "all") {
      const gameDate = new Date(g.date);
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (eventDateFilter === "today") {
        const endOfToday = new Date(startOfToday.getTime() + 86400000);
        if (gameDate < startOfToday || gameDate >= endOfToday) return false;
      } else if (eventDateFilter === "week") {
        const endOfWeek = new Date(startOfToday.getTime() + 7 * 86400000);
        if (gameDate < startOfToday || gameDate >= endOfWeek) return false;
      }
    }
    return true;
  });

  return (
    <div className="w-full h-full relative p-4 bg-transparent">
      
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className="fixed bottom-10 left-1/2 z-[200] flex items-center gap-2 px-6 py-3 bg-neutral-900 border border-green-500/30 rounded-full shadow-2xl backdrop-blur-md pointer-events-none"
          >
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-white font-bold text-sm tracking-wide">{t('Report Submitted')}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full h-full relative rounded-3xl overflow-hidden shadow-xl border border-neutral-200">
        <div className="absolute top-4 left-4 z-[500] max-w-[calc(100%-2rem)]">
          <div className="bg-black/45 backdrop-blur-md rounded-xl shadow-lg border border-white/15 p-1.5 flex flex-wrap items-center gap-1.5">
            {/* Mode toggle */}
            <div className="flex bg-black/30 rounded-lg p-0.5 shrink-0">
              <button
                onClick={() => { setMode("places"); setSelectedItem(null); }}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${mode === "places" ? "bg-white text-black shadow-md" : "text-neutral-300 hover:text-white"}`}
              >
                {t('Venues')}
              </button>
              <button
                onClick={() => { setMode("events"); setSelectedItem(null); }}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${mode === "events" ? "bg-red-600 text-white shadow-md" : "text-neutral-300 hover:text-white"}`}
              >
                {t('Events')}
              </button>
            </div>

            {/* Event filters — only visible in events mode, inline in the same bar */}
            {mode === "events" && (
              <>
                <div className="w-px h-6 bg-white/15 mx-0.5 shrink-0" />

                {/* Filters toggle */}
                <button
                  onClick={() => setFiltersOpen(v => !v)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg shrink-0 transition-all border ${
                    filtersOpen ? "bg-red-600/20 border-red-500/40 text-red-300" : "bg-black/30 border-white/10 text-neutral-400 hover:border-white/30"
                  }`}
                >
                  <SlidersHorizontal size={11} />
                  <span className="text-[10px] font-bold uppercase tracking-wide">{t('Filters')}</span>
                </button>

                {/* Results count — always visible */}
                <span className="text-[10px] text-neutral-400 bg-black/30 px-2 py-1 rounded-lg border border-white/10 shrink-0">
                  {filteredGames.length} {filteredGames.length !== 1 ? t("events") : t("event")}
                </span>
              </>
            )}

            {/* Expanded filter options — wraps onto its own row(s) when open */}
            {mode === "events" && filtersOpen && (
              <div className="w-full flex flex-wrap items-center gap-1.5 pt-1.5 mt-1.5 border-t border-white/10">
                {/* Proficiency */}
                {(["all", "All Welcome", "Newbie", "Intermediate", "Advanced"] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setEventProfFilter(p)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                      eventProfFilter === p
                        ? "bg-red-600 border-red-500 text-white"
                        : "bg-black/30 border-white/10 text-neutral-300 hover:border-white/30"
                    }`}
                  >
                    {p === "all" ? t("All Levels") : t(p)}
                  </button>
                ))}

                {/* Date */}
                {(["all", "today", "week"] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setEventDateFilter(d)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                      eventDateFilter === d
                        ? "bg-amber-600 border-amber-500 text-white"
                        : "bg-black/30 border-white/10 text-neutral-300 hover:border-white/30"
                    }`}
                  >
                    {d === "all" ? t("Any Date") : d === "today" ? t("Today") : t("This Week")}
                  </button>
                ))}

                {/* Hide full */}
                <button
                  onClick={() => setHideFullEvents(v => !v)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                    hideFullEvents
                      ? "bg-green-700 border-green-600 text-white"
                      : "bg-black/30 border-white/10 text-neutral-300 hover:border-white/30"
                  }`}
                >
                  {hideFullEvents ? t("Spots Available ✓") : t("Hide Full")}
                </button>

              </div>
            )}
          </div>
        </div>

        <MapContainer 
          center={[1.3521, 103.8198]} 
          zoom={11} 
          className="w-full h-full z-0 outline-none bg-neutral-100"
          zoomControl={false}
        >
          <TileLayer
            attribution='© CARTO'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <MapUpdater userLoc={userLoc} venues={venues} />
          <ZoomControl position="bottomleft" />
          {userLoc && <Marker position={[userLoc.lat, userLoc.lng]} icon={googleUserIcon} />}

          {mode === "places" && venues.map(venue => (
            <Marker
              key={venue.id} position={[venue.coordinates.lat, venue.coordinates.lng]} icon={placeIcon}
              eventHandlers={{ click: () => setSelectedItem(venue) }}
            >
              <Tooltip permanent direction="bottom" offset={[0, 6]} className="map-venue-label" interactive={false}>
                {truncateMapLabel(venue.name)}
              </Tooltip>
            </Marker>
          ))}

          {mode === "events" && filteredGames.map(game => {
            const venue = getVenueForGame(game.venueId);
            if (!venue) return null;
            return (
              <Marker
                key={game.id} position={[venue.coordinates.lat, venue.coordinates.lng]} icon={eventsIcon}
                eventHandlers={{ click: () => setSelectedItem({ ...game, venueDetails: venue }) }}
              >
                <Tooltip permanent direction="bottom" offset={[0, 14]} className="map-venue-label" interactive={false}>
                  {truncateMapLabel(venue.name)}
                </Tooltip>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-x-4 top-1/2 -translate-y-1/2 max-h-[75vh] md:translate-y-0 md:inset-x-auto md:top-4 md:right-4 md:bottom-4 md:max-h-full w-auto md:w-80 z-[600] pointer-events-none flex flex-col items-stretch justify-center md:justify-start"
          >
            <div className={`
                pointer-events-auto rounded-2xl shadow-2xl border overflow-hidden flex flex-col max-h-full md:h-auto md:max-h-full backdrop-blur-2xl md:backdrop-blur-xl transition-colors duration-300
                ${mode === 'places' ? 'bg-neutral-900/90 md:bg-white/10 border-white/30 md:border-white/40' : 'bg-neutral-900/90 md:bg-black/15 border-white/30 md:border-white/10'}
            `}>
                <div className="h-32 relative shrink-0 group">
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/50 text-white p-1 rounded-full backdrop-blur-sm transition-colors z-10"
                  >
                    <X size={16} />
                  </button>
                  <img
                    src={selectedItem.imageUrl || selectedItem.venueDetails?.imageUrl || selectedItem.venueImageUrl}
                    className={`w-full h-full object-cover transition-opacity ${mode === 'places' ? 'cursor-pointer hover:opacity-90' : 'cursor-pointer hover:opacity-90'}`}
                    alt="Detail"
                    onClick={() => {
                      if (mode === 'places') navigate(`/gamespace/${selectedItem.id}`);
                      else navigate(`/event/${selectedItem.id}`);
                    }}
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${mode === 'places' ? 'from-white/75' : 'from-black/75'} to-transparent pointer-events-none`}></div>
                </div>

                <div className={`p-4 flex-1 overflow-y-auto ${mode === 'places' ? 'text-neutral-900' : 'text-neutral-100'}`}>
                  
                  {mode === "places" ? (
                    <>
                      <div className="flex justify-between items-start mb-1">
                        <div className="pr-2">
                          {selectedItem.isPinned && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded mb-1">
                              <Pin size={9} />{t('Pinned')}
                            </span>
                          )}
                          <h3 className="text-lg font-bold leading-tight text-neutral-900">{selectedItem.name}</h3>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0 translate-x-2">
                          <button
                            onClick={(e) => handleLikeVenue(e, selectedItem.id)}
                            className="flex items-center gap-1 p-1.5 rounded-lg hover:bg-neutral-900/5 transition-all group"
                          >
                            <Heart size={18} className={`transition-all duration-300 ${selectedItem.isLiked ? 'text-red-500 fill-red-500 scale-110' : 'text-red-400 group-hover:text-red-400'}`} />
                            <span className="text-xs font-bold text-neutral-500">{selectedItem.totalLikes || 0}</span>
                          </button>
                          {isAdmin && (
                            <button
                              onClick={(e) => handlePinVenueMap(e, selectedItem.id)}
                              title={selectedItem.isPinned ? t('Unpin') : t('Pin')}
                              className={`p-1.5 rounded-lg border transition-all ${selectedItem.isPinned ? 'text-amber-500 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20' : 'text-neutral-500 border-transparent hover:bg-amber-500/10 hover:text-amber-400'}`}
                            >
                              {selectedItem.isPinned ? <PinOff size={18} /> : <Pin size={18} />}
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); setReportData({ isOpen: true, name: selectedItem.name, type: "Space" }); }}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/30 text-neutral-500 hover:text-red-500 transition-all"
                          >
                            <IconAlertTriangle size={18} />
                          </button>
                        </div>
                      </div>
                      <p className="text-neutral-600 text-xs mb-3 flex items-center gap-1">
                        <MapPin size={12} className="shrink-0" /> <span className="truncate">{selectedItem.address}</span>
                      </p>
                      <div className="flex gap-1.5 mb-4 flex-wrap">
                        {selectedItem.amenities?.map((am: string) => (
                          <span key={am} className="text-[10px] bg-white/50 border border-neutral-200 px-1.5 py-0.5 rounded font-medium text-neutral-600 backdrop-blur-sm">{am}</span>
                        ))}
                      </div>
                      <div className="space-y-2 mt-auto">
                        <button
                          onClick={(e) => handleSubscribeVenue(e, selectedItem.id)}
                          className={`w-full py-2.5 rounded-lg font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-colors ${
                            selectedItem.isSubscribed
                              ? "bg-sky-500/20 border border-sky-500/40 text-sky-300"
                              : "bg-black/90 hover:bg-black text-white"
                          }`}
                        >
                          <Bell size={14} /> {selectedItem.isSubscribed ? t("Subscribed") : t("Subscribe")}
                        </button>
                        <button onClick={() => openGoogleMaps(selectedItem.coordinates.lat, selectedItem.coordinates.lng)} className="w-full py-2.5 bg-white/50 border border-neutral-300 text-neutral-800 hover:bg-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-colors backdrop-blur-sm"><Navigation size={14} /> Google Maps</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-1">
                        <div className="pr-2">
                           {selectedItem.isPinned && (
                             <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded mb-1">
                               <Pin size={9} />{t('Pinned')}
                             </span>
                           )}
                           <span className="inline-block text-[10px] font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-1.5 py-0.5 rounded mb-1 ml-1">{t('RECRUITING')}</span>
                           <h3 className="text-lg font-bold leading-tight text-white">{selectedItem.title}</h3>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0 translate-x-2 mt-4">
                          <button
                            onClick={(e) => handleLikeEvent(e, selectedItem.id)}
                            className="flex items-center gap-1 p-1.5 rounded-lg hover:bg-neutral-900/5 transition-all group"
                          >
                            <Heart size={18} className={`transition-all duration-300 ${selectedItem.isLiked ? 'text-red-500 fill-red-500 scale-110' : 'text-red-500 group-hover:text-red-400'}`} />
                            <span className="text-xs font-bold text-neutral-500">{selectedItem.totalLikes || 0}</span>
                          </button>
                          <button
                            onClick={(e) => handleSubscribeEvent(e, selectedItem.id)}
                            className={`p-1.5 rounded-lg border transition-all ${selectedItem.isSubscribed ? 'text-sky-400 border-sky-500/30 bg-sky-500/10' : 'text-neutral-400 border-transparent hover:bg-white/10 hover:text-sky-300'}`}
                          >
                            <Bell size={18} />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={(e) => handlePinGame(e, selectedItem.id)}
                              title={selectedItem.isPinned ? t('Unpin') : t('Pin')}
                              className={`p-1.5 rounded-lg border transition-all ${selectedItem.isPinned ? 'text-amber-400 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20' : 'text-neutral-400 border-transparent hover:bg-amber-500/10 hover:text-amber-400'}`}
                            >
                              {selectedItem.isPinned ? <PinOff size={18} /> : <Pin size={18} />}
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); setReportData({ isOpen: true, name: selectedItem.title, type: "Event" }); }}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/30 text-neutral-500 hover:text-red-500 transition-all"
                          >
                            <IconAlertTriangle size={18} />
                          </button>
                        </div>
                      </div>
                      <div className="bg-white/10 p-2.5 rounded-lg mb-3 border border-white/5 flex items-center gap-2 backdrop-blur-sm">
                         <div className="bg-black/40 p-1.5 rounded"><Clock size={14} className="text-yellow-400"/></div>
                         <div>
                            <div className="text-[10px] text-neutral-400 uppercase tracking-wider">{t('Game Time')}</div>
                            <div className="text-sm font-bold text-white font-mono">{formatGameTime(selectedItem.date)}</div>
                         </div>
                      </div>
                      <div className="bg-white/10 p-2.5 rounded-lg mb-3 border border-white/5 backdrop-blur-sm">
                         <div className="text-[10px] text-neutral-500 mb-0.5 uppercase tracking-wider">{t('Location')}</div>
                         <div className="font-semibold text-neutral-200 text-xs flex items-center gap-1">
                            <MapPin size={12} className="text-neutral-400 shrink-0"/> <span className="truncate">{selectedItem.venueDetails?.name}</span>
                         </div>
                      </div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex -space-x-1.5">
                          {selectedItem.joinedPlayerAvatars?.slice(0, 4).map((url: string, i: number) => (
                            <img key={i} src={url} alt="" className="h-6 w-6 rounded-full border border-neutral-700 object-cover bg-neutral-700" />
                          )) ?? [1,2,3].map(i => <div key={i} className="h-6 w-6 rounded-full bg-neutral-600 border border-neutral-700"/>)}
                        </div>
                        <div className="text-xs font-bold text-neutral-400"><span className="text-white">{selectedItem.currentPlayers}</span>/{selectedItem.maxPlayers}</div>
                      </div>
                      <div className="space-y-2 mt-auto">
                        <button
                          onClick={() => handleJoinGame(selectedItem.id)}
                          disabled={(joinStates[selectedItem.id] ?? "idle") !== "idle" || selectedItem.currentPlayers >= selectedItem.maxPlayers}
                          className={`w-full py-2.5 rounded-lg font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-colors ${getJoinBtnCls(selectedItem.id, selectedItem.currentPlayers >= selectedItem.maxPlayers)}`}
                        >
                          {getJoinLabel(selectedItem.id, selectedItem.approvalMode, selectedItem.currentPlayers >= selectedItem.maxPlayers)}
                        </button>
                        <button onClick={() => selectedItem.venueDetails && openGoogleMaps(selectedItem.venueDetails.coordinates.lat, selectedItem.venueDetails.coordinates.lng)} className="w-full py-2.5 bg-white/20 border border-white/20 text-neutral-200 hover:bg-white/20 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-colors backdrop-blur-sm"><Navigation size={14} /> {t('Google Maps')}</button>
                      </div>
                    </>
                  )}
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <ReportModal 
        isOpen={reportData?.isOpen || false} 
        onClose={() => setReportData(null)} 
        onSuccess={triggerToast}
        targetType={reportData?.type || "Event"}
        targetName={reportData?.name || ""}
      />
      <AuthModal isOpen={isAuthOpen} onClose={() => setAuthOpen(false)} initialView="login" />
    </div>
  );
}