import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Clock, MapPin, Users, Activity, Shuffle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { GameService } from "../services/game.service";
import type { GameVenueDTO } from "../types";
import { useLang } from "../context/LanguageContext";

const EVENT_NAMES_EN = [
  "Friday Night Showdown", "Midnight Wolves", "The Hunt Begins",
  "Village Under Siege", "Howl at the Moon", "The Final Night",
  "Shadows in the Dark", "Deception Rising", "Blood Moon Rising",
  "Last One Standing", "The Werewolf Trials", "Night of Betrayal",
];
const EVENT_NAMES_ZH = [
  "午夜狼嚎", "谎言游戏", "村庄危机",
  "黎明前的黑暗", "身份游戏", "血月之夜",
  "狼人大作战", "谁是卧底", "最后的夜晚",
  "欺骗之夜", "黑暗中的影子", "最终审判",
];

function pickRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultVenueId?: string;
}

export const CreateEventModal = ({ isOpen, onClose, defaultVenueId }: CreateEventModalProps) => {
  const { lang } = useLang();
  const [selectedVenue, setSelectedVenue] = useState<string>(defaultVenueId ?? "");
  const [proficiency, setProficiency] = useState<string>("All Welcome");
  const [venues, setVenues] = useState<GameVenueDTO[]>([]);
  const [venueSearch, setVenueSearch] = useState("");
  const [venueOpen, setVenueOpen] = useState(false);
  const venueRef = useRef<HTMLDivElement>(null);
  const [eventName, setEventName] = useState("");

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (venueRef.current && !venueRef.current.contains(e.target as Node)) {
        setVenueOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      GameService.getAllVenues().then(setVenues).catch(() => {});
      setSelectedVenue(defaultVenueId ?? "");
      setEventName(pickRandom(lang === "zh" ? EVENT_NAMES_ZH : EVENT_NAMES_EN));
    }
  }, [isOpen, defaultVenueId, lang]);

  const proficiencyLevels = ["All Welcome", "Newbie", "Intermediate", "Advanced"];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-neutral-900 border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="flex justify-between items-center p-6 border-b border-white/5 bg-neutral-900/50">
                <div>
                  <h2 className="text-2xl font-bold text-white">Create Event</h2>
                  <p className="text-sm text-neutral-400 mt-1">Host a new Werewolf game</p>
                </div>
                <button
                  onClick={onClose}
                  className="text-neutral-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form Content */}
              <div className="p-6 overflow-y-auto custom-scrollbar golden-scrollbar">
                <div className="space-y-6">
                  {/* Event Name */}
                  <div>
                    <label className="text-sm font-semibold text-neutral-300 mb-2 block">Event Title</label>
                    <div className="relative">
                      <input
                        value={eventName}
                        onChange={e => setEventName(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 pr-12 text-white focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all placeholder:text-neutral-600"
                        placeholder="e.g. Friday Night Werewolf Pro"
                      />
                      <button
                        type="button"
                        onClick={() => setEventName(pickRandom(lang === "zh" ? EVENT_NAMES_ZH : EVENT_NAMES_EN))}
                        className="absolute inset-y-0 right-0 flex items-center px-3.5 text-neutral-500 hover:text-red-400 transition-colors"
                        title="Suggest a random name"
                      >
                        <Shuffle size={16} />
                      </button>
                    </div>
                    <p className="text-[11px] text-neutral-600 mt-1.5">Click <Shuffle size={10} className="inline" /> to get a random name suggestion</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Date */}
                    <div>
                      <label className="text-sm font-semibold text-neutral-300 mb-2 block flex items-center gap-2">
                        <Calendar size={16} className="text-red-400" />
                        Date
                      </label>
                      <input
                        type="date"
                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-red-500/50 transition-all [color-scheme:dark]"
                      />
                    </div>

                    {/* Time */}
                    <div>
                      <label className="text-sm font-semibold text-neutral-300 mb-2 block flex items-center gap-2">
                        <Clock size={16} className="text-red-400" />
                        Time
                      </label>
                      <input
                        type="time"
                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-red-500/50 transition-all [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Max Players */}
                    <div>
                      <label className="text-sm font-semibold text-neutral-300 mb-2 block flex items-center gap-2">
                        <Users size={16} className="text-red-400" />
                        Max Players
                      </label>
                      <div className="relative">
                         <select className="w-full bg-black border border-white/10 rounded-xl p-3.5 text-white appearance-none focus:outline-none focus:border-red-500/50 transition-all pr-10 cursor-pointer">
                            {[8, 9, 10, 11, 12, 13, 14, 15, 16].map(num => (
                              <option key={num} value={num} className="bg-neutral-900 text-white">{num} Players</option>
                            ))}
                          </select>
                           <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-neutral-400">
                             <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                           </div>
                      </div>
                    </div>

                    {/* Proficiency Requirement */}
                     <div>
                      <label className="text-sm font-semibold text-neutral-300 mb-2 block flex items-center gap-2">
                        <Activity size={16} className="text-red-400" />
                        Proficiency
                      </label>
                      <div className="relative">
                        <select 
                          value={proficiency}
                          onChange={(e) => setProficiency(e.target.value)}
                          className="w-full bg-black border border-white/10 rounded-xl p-3.5 text-white appearance-none focus:outline-none focus:border-red-500/50 transition-all pr-10 cursor-pointer"
                        >
                          {proficiencyLevels.map(level => (
                            <option key={level} value={level} className="bg-neutral-900 text-white">{level}</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-neutral-400">
                             <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Venue Selection */}
                  <div>
                    <label className="text-sm font-semibold text-neutral-300 mb-2 block flex items-center gap-2">
                      <MapPin size={16} className="text-red-400" />
                      Venue
                    </label>
                    <div className="relative" ref={venueRef}>
                      {/* Search input */}
                      <div className="relative">
                        <input
                          value={venueOpen
                            ? venueSearch
                            : selectedVenue
                              ? (venues.find(v => v.id === selectedVenue)?.name ?? "")
                              : ""
                          }
                          onChange={e => { setVenueSearch(e.target.value); setVenueOpen(true); }}
                          onFocus={() => { setVenueSearch(""); setVenueOpen(true); }}
                          placeholder="Search venue by name or address..."
                          className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all placeholder:text-neutral-600 pr-10"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-neutral-400">
                          <svg className={`w-4 h-4 fill-current transition-transform ${venueOpen ? "rotate-180" : ""}`} viewBox="0 0 20 20">
                            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd" />
                          </svg>
                        </div>
                      </div>

                      {/* Dropdown list */}
                      {venueOpen && (
                        <div className="absolute z-10 w-full mt-1 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                          <div className="max-h-52 overflow-y-auto custom-scrollbar golden-scrollbar">
                            {venues
                              .filter(v =>
                                `${v.name} ${v.address}`.toLowerCase().includes(venueSearch.toLowerCase())
                              )
                              .map(venue => (
                                <button
                                  key={venue.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedVenue(venue.id);
                                    setVenueSearch("");
                                    setVenueOpen(false);
                                  }}
                                  className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-white/5 ${
                                    selectedVenue === venue.id ? "bg-red-600/20 text-red-300" : "text-white"
                                  }`}
                                >
                                  <span className="font-medium">{venue.name}</span>
                                  <span className="text-neutral-400 ml-1">({venue.address})</span>
                                </button>
                              ))
                            }
                            {venues.filter(v =>
                              `${v.name} ${v.address}`.toLowerCase().includes(venueSearch.toLowerCase())
                            ).length === 0 && (
                              <div className="px-4 py-3 text-sm text-neutral-500">No venues found</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-sm font-semibold text-neutral-300 mb-2 block">Description (Optional)</label>
                    <textarea
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-red-500/50 transition-all min-h-[100px] resize-none placeholder:text-neutral-600 custom-scrollbar golden-scrollbar"
                      placeholder="Add any special rules or notes for players..."
                    ></textarea>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/5 bg-neutral-900/50 flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl font-medium text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button className="bg-red-600 hover:bg-red-500 text-white font-medium py-2.5 px-8 rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all">
                  Create Event
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};