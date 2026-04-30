import { useState, useEffect } from "react";
import { useLang } from "../context/LanguageContext";
import { MapContainer, TileLayer, Marker, useMap, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GameService } from "../services/game.service";
import type { GameVenue, GameSession } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X, Navigation, Heart, Bell, Clock, CheckCircle } from "lucide-react";
import { IconAlertTriangle } from "@tabler/icons-react";
import { ReportModal } from "../components/ReportModal";

// --- ICONS ---
const googleUserIcon = new L.DivIcon({
  className: "user-location-dot",
  iconSize: [20, 20],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
});

const eventsIcon = new L.Icon({
  iconUrl: "../../public/mapEventIcon.png",
  iconSize: [45, 45],
  popupAnchor: [0, -20]
});

const placeIcon = new L.Icon({
  iconUrl: "../../public/werewolf_logo.png",
  iconSize: [30, 30],
  popupAnchor: [0, -15]
});

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
type GameUI = GameSession & { isLiked?: boolean; isSubscribed?: boolean; venueDetails?: GameVenue };

export default function GameMapPage() {
  const [venues, setVenues] = useState<VenueUI[]>([]);
  const [games, setGames] = useState<GameUI[]>([]);
  const [mode, setMode] = useState<"places" | "events">("places");
  const { t } = useLang();
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number, lng: number } | null>(null);
  const [reportData, setReportData] = useState<{ isOpen: boolean; name: string, type: "Space" | "Event" } | null>(null);
  const [showToast, setShowToast] = useState(false);

  const triggerToast = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  useEffect(() => {
    Promise.all([GameService.getAllVenues(), GameService.getActiveGames()])
      .then(([vData, gData]) => {
        setVenues(vData.map(v => ({ ...v, isLiked: false })));
        setGames(gData.map(g => ({ ...g, isLiked: false })));
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
        <div className="absolute top-4 left-4 z-[500] bg-white/50 backdrop-blur-md rounded-xl shadow-lg p-1.5 flex border border-neutral-200">
          <button 
            onClick={() => { setMode("places"); setSelectedItem(null); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === "places" ? "bg-black text-white shadow-md" : "text-neutral-500 hover:bg-neutral-100"}`}
          >
            {t('Venues')}
          </button>
          <button
            onClick={() => { setMode("events"); setSelectedItem(null); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === "events" ? "bg-red-600 text-white shadow-md" : "text-neutral-500 hover:bg-neutral-100"}`}
          >
            {t('Events')}
          </button>
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
            />
          ))}

          {mode === "events" && games.map(game => {
            const venue = getVenueForGame(game.venueId);
            if (!venue) return null;
            return (
              <Marker 
                key={game.id} position={[venue.coordinates.lat, venue.coordinates.lng]} icon={eventsIcon}
                eventHandlers={{ click: () => setSelectedItem({ ...game, venueDetails: venue }) }}
              />
            );
          })}
        </MapContainer>
      </div>

      <AnimatePresence>
        {selectedItem && (
          <motion.div 
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute top-4 right-4 bottom-4 w-full md:w-80 z-[600] pointer-events-none flex flex-col justify-end md:justify-start"
          >
            <div className={`
                pointer-events-auto rounded-2xl shadow-2xl border overflow-hidden flex flex-col h-full md:h-auto md:max-h-full backdrop-blur-xl transition-colors duration-300
                ${mode === 'places' ? 'bg-white/10 border-white/40' : 'bg-black/15 border-white/10'}
            `}>
                <div className="h-32 relative shrink-0 group">
                  <button 
                    onClick={() => setSelectedItem(null)}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/50 text-white p-1 rounded-full backdrop-blur-sm transition-colors z-10"
                  >
                    <X size={16} />
                  </button>
                  <img 
                    src={selectedItem.imageUrl || selectedItem.venueDetails?.imageUrl} 
                    className="w-full h-full object-cover" 
                    alt="Detail" 
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${mode === 'places' ? 'from-white/75' : 'from-black/75'} to-transparent`}></div>
                </div>

                <div className={`p-4 flex-1 overflow-y-auto ${mode === 'places' ? 'text-neutral-900' : 'text-neutral-100'}`}>
                  
                  {mode === "places" ? (
                    <>
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="text-lg font-bold leading-tight text-neutral-900 pr-2">{selectedItem.name}</h3>
                        <div className="flex items-center gap-0.5 shrink-0 translate-x-2">
                          <button 
                            onClick={(e) => handleLikeVenue(e, selectedItem.id)}
                            className="flex items-center gap-1 p-1.5 rounded-lg hover:bg-neutral-900/5 transition-all group"
                          >
                            <Heart size={18} className={`transition-all duration-300 ${selectedItem.isLiked ? 'text-red-500 fill-red-500 scale-110' : 'text-red-400 group-hover:text-red-400'}`} />
                            <span className="text-xs font-bold text-neutral-500">{selectedItem.totalLikes || 0}</span>
                          </button>
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
                           <span className="inline-block text-[10px] font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-1.5 py-0.5 rounded mb-1">{t('RECRUITING')}</span>
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
                          {[1,2,3].map(i => <div key={i} className="h-6 w-6 rounded-full bg-neutral-600 border border-neutral-700"/>)}
                        </div>
                        <div className="text-xs font-bold text-neutral-400"><span className="text-white">{selectedItem.currentPlayers}</span>/{selectedItem.maxPlayers}</div>
                      </div>
                      <div className="space-y-2 mt-auto">
                        <button className="w-full py-2.5 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white rounded-lg font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-colors">{t('Join Game')}</button>
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
    </div>
  );
}