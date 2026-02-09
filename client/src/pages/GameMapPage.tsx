import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GameService } from "../services/game.service";
import type { GameVenue, GameSession } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Calendar, Users, X } from "lucide-react";

// --- CUSTOM ICONS ---
const wolfIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/616/616490.png",
  iconSize: [40, 40],
  popupAnchor: [0, -20]
});

const placeIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [35, 35],
  popupAnchor: [0, -15]
});

export default function GameMapPage() {
  const [venues, setVenues] = useState<GameVenue[]>([]);
  const [games, setGames] = useState<GameSession[]>([]);
  const [mode, setMode] = useState<"places" | "events">("places");
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    Promise.all([GameService.getAllVenues(), GameService.getActiveGames()])
      .then(([vData, gData]) => {
        setVenues(vData);
        setGames(gData);
      });
  }, []);

  const getVenueForGame = (venueId: string) => venues.find(v => v.id === venueId);

  return (
    // MAP CONTAINER (Fills the remaining space provided by AppLayout)
    <div className="w-full h-full relative">
      
      {/* --- TOGGLE CONTROLS (Floating Top Left) --- */}
      <div className="absolute top-4 left-4 z-[1000] bg-white rounded-xl shadow-xl p-1.5 flex border border-neutral-200">
        <button 
          onClick={() => { setMode("places"); setSelectedItem(null); }}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${mode === "places" ? "bg-black text-white shadow-md" : "text-neutral-500 hover:bg-neutral-100"}`}
        >
          Venues
        </button>
        <button 
          onClick={() => { setMode("events"); setSelectedItem(null); }}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${mode === "events" ? "bg-red-600 text-white shadow-md" : "text-neutral-500 hover:bg-neutral-100"}`}
        >
          Events
        </button>
      </div>

      {/* --- LIGHT MAP --- */}
      <MapContainer center={[1.3521, 103.8198]} zoom={12} className="w-full h-full z-0 outline-none">
        {/* Light Mode Tiles (Clean & Friendly) */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {mode === "places" && venues.map(venue => (
          <Marker 
            key={venue.id} 
            position={[venue.coordinates.lat, venue.coordinates.lng]} 
            icon={placeIcon}
            eventHandlers={{ click: () => setSelectedItem(venue) }}
          />
        ))}

        {mode === "events" && games.map(game => {
          const venue = getVenueForGame(game.venueId);
          if (!venue) return null;
          return (
            <Marker 
              key={game.id} 
              position={[venue.coordinates.lat, venue.coordinates.lng]} 
              icon={wolfIcon}
              eventHandlers={{ click: () => setSelectedItem({ ...game, venueDetails: venue }) }}
            />
          );
        })}
      </MapContainer>

      {/* --- DETAILS CARD (Floating Right) --- */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div 
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute top-4 right-4 bottom-4 w-full md:w-80 z-[1000] pointer-events-none flex flex-col justify-end md:justify-start"
          >
            <div className="bg-white pointer-events-auto rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-full">
              
              {/* Header Image */}
              <div className="h-40 bg-neutral-200 relative">
                 {/* Close Button */}
                 <button 
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full backdrop-blur-sm transition-colors z-10"
                >
                  <X size={16} />
                </button>
                {selectedItem.imageUrl || selectedItem.venueDetails?.imageUrl ? (
                   <img 
                     src={selectedItem.imageUrl || selectedItem.venueDetails.imageUrl} 
                     className="w-full h-full object-cover" 
                     alt="Detail" 
                   />
                ) : <div className="w-full h-full bg-neutral-100 flex items-center justify-center text-neutral-400">No Image</div>}
              </div>

              <div className="p-5 flex-1 overflow-y-auto">
                {mode === "places" ? (
                  <>
                    <h3 className="text-xl font-bold text-neutral-900 mb-1">{selectedItem.name}</h3>
                    <p className="text-neutral-500 text-sm mb-4 flex items-center gap-1">
                      <MapPin size={14} /> {selectedItem.address}
                    </p>
                    <div className="flex gap-2 mb-6 flex-wrap">
                      {selectedItem.amenities.map((am: string) => (
                        <span key={am} className="text-xs bg-neutral-100 text-neutral-600 px-2 py-1 rounded-md font-medium">{am}</span>
                      ))}
                    </div>
                    <button className="w-full py-3 bg-black hover:bg-neutral-800 text-white rounded-xl font-bold shadow-lg transition-transform active:scale-95">
                      Book this Venue
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex gap-2 mb-2">
                      <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md">LIVE EVENT</span>
                    </div>
                    <h3 className="text-xl font-bold text-neutral-900 mb-2">{selectedItem.title}</h3>
                    
                    <div className="bg-neutral-50 p-3 rounded-xl mb-4 border border-neutral-100">
                       <div className="text-xs text-neutral-500 mb-1">HOSTED AT</div>
                       <div className="font-semibold text-neutral-800">{selectedItem.venueDetails.name}</div>
                    </div>

                    <div className="flex items-center justify-between mb-6">
                      <div className="flex -space-x-2">
                        {[1,2,3].map(i => <div key={i} className="h-8 w-8 rounded-full bg-neutral-300 border-2 border-white"/>)}
                      </div>
                      <div className="text-sm font-bold text-neutral-600">
                        {selectedItem.currentPlayers} / {selectedItem.maxPlayers} Players
                      </div>
                    </div>

                    <button className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-200 transition-transform active:scale-95">
                      Join Game
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}