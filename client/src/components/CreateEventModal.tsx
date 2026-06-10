import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Clock, MapPin, Users, Activity, Shuffle, Loader2 } from "lucide-react";
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
  const [namePlaceholder, setNamePlaceholder] = useState("");
  const [date, setDate] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(12);
  const [description, setDescription] = useState("");
  const [recurrence, setRecurrence] = useState<"none" | "weekly" | "biweekly" | "monthly">("none");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Custom time picker (12-hour, friendlier than the native scroll-wheel input)
  const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));
  const [hour, setHour] = useState("07");
  const [minute, setMinute] = useState("00");
  const [period, setPeriod] = useState<"AM" | "PM">("PM");

  // Builds an ISO datetime from the date input + 12-hour time picker selections.
  // Returns null if the date is missing/invalid so the caller can show a friendly error.
  const buildScheduledAtISO = (): string | null => {
    if (!date) return null;
    let h = parseInt(hour, 10) % 12;
    if (period === "PM") h += 12;
    const localDate = new Date(date);
    if (Number.isNaN(localDate.getTime())) return null;
    localDate.setHours(h, parseInt(minute, 10), 0, 0);
    return localDate.toISOString();
  };

  const handleSubmit = async () => {
    setFormError(null);

    const title = eventName.trim() || namePlaceholder.trim();
    if (!title) {
      setFormError(lang === "zh" ? "请输入活动名称。" : "Please enter an event title.");
      return;
    }
    if (!selectedVenue) {
      setFormError(lang === "zh" ? "请选择场地。" : "Please select a venue.");
      return;
    }
    const scheduledAt = buildScheduledAtISO();
    if (!scheduledAt) {
      setFormError(lang === "zh" ? "请选择日期。" : "Please pick a date.");
      return;
    }
    if (new Date(scheduledAt).getTime() <= Date.now()) {
      setFormError(lang === "zh" ? "活动时间必须在将来。" : "Event time must be in the future.");
      return;
    }

    setSubmitting(true);
    try {
      await GameService.createSession({
        venueId: selectedVenue,
        title,
        scheduledAt,
        maxPlayers,
        proficiency,
        description,
        recurrence,
      });
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : (lang === "zh" ? "创建活动失败，请重试。" : "Failed to create event. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

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
      setEventName("");
      setNamePlaceholder(pickRandom(lang === "zh" ? EVENT_NAMES_ZH : EVENT_NAMES_EN));
      setDate("");
      setMaxPlayers(12);
      setDescription("");
      setHour("07");
      setMinute("00");
      setPeriod("PM");
      setProficiency("All Welcome");
      setRecurrence("none");
      setFormError(null);
      setSubmitting(false);
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
                        placeholder={namePlaceholder || "e.g. Friday Night Werewolf Pro"}
                      />
                      <button
                        type="button"
                        onClick={() => setNamePlaceholder(pickRandom(lang === "zh" ? EVENT_NAMES_ZH : EVENT_NAMES_EN))}
                        className="absolute inset-y-0 right-0 flex items-center px-3.5 text-neutral-500 hover:text-red-400 transition-colors"
                        title="Suggest a random name"
                      >
                        <Shuffle size={16} />
                      </button>
                    </div>
                    <p className="text-[11px] text-neutral-600 mt-1.5">Click <Shuffle size={10} className="inline" /> for a new name idea — shown as a placeholder, type your own title or leave it blank to use the suggestion</p>
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
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        min={new Date().toISOString().slice(0, 10)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-red-500/50 transition-all [color-scheme:dark]"
                      />
                    </div>

                    {/* Time */}
                    <div>
                      <label className="text-sm font-semibold text-neutral-300 mb-2 block flex items-center gap-2">
                        <Clock size={16} className="text-red-400" />
                        Time
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <select
                          value={hour}
                          onChange={e => setHour(e.target.value)}
                          className="w-full bg-black border border-white/10 rounded-xl p-3.5 text-white text-center appearance-none focus:outline-none focus:border-red-500/50 transition-all cursor-pointer"
                        >
                          {HOURS.map(h => (
                            <option key={h} value={h} className="bg-neutral-900 text-white">{h}</option>
                          ))}
                        </select>
                        <select
                          value={minute}
                          onChange={e => setMinute(e.target.value)}
                          className="w-full bg-black border border-white/10 rounded-xl p-3.5 text-white text-center appearance-none focus:outline-none focus:border-red-500/50 transition-all cursor-pointer"
                        >
                          {MINUTES.map(m => (
                            <option key={m} value={m} className="bg-neutral-900 text-white">{m}</option>
                          ))}
                        </select>
                        <select
                          value={period}
                          onChange={e => setPeriod(e.target.value as "AM" | "PM")}
                          className="w-full bg-black border border-white/10 rounded-xl p-3.5 text-white text-center appearance-none focus:outline-none focus:border-red-500/50 transition-all cursor-pointer"
                        >
                          <option value="AM" className="bg-neutral-900 text-white">AM</option>
                          <option value="PM" className="bg-neutral-900 text-white">PM</option>
                        </select>
                      </div>
                      <p className="text-[11px] text-neutral-600 mt-1.5">{hour}:{minute} {period}</p>
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
                         <select
                            value={maxPlayers}
                            onChange={e => setMaxPlayers(Number(e.target.value))}
                            className="w-full bg-black border border-white/10 rounded-xl p-3.5 text-white appearance-none focus:outline-none focus:border-red-500/50 transition-all pr-10 cursor-pointer">
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
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-red-500/50 transition-all min-h-[100px] resize-none placeholder:text-neutral-600 custom-scrollbar golden-scrollbar"
                      placeholder="Add any special rules or notes for players..."
                    ></textarea>
                  </div>

                  {/* Recurrence */}
                  <div>
                    <label className="text-sm font-semibold text-neutral-300 mb-2 block">Repeat</label>
                    <div className="relative">
                      <select
                        value={recurrence}
                        onChange={e => setRecurrence(e.target.value as typeof recurrence)}
                        className="w-full bg-black border border-white/10 rounded-xl p-3.5 text-white appearance-none focus:outline-none focus:border-red-500/50 transition-all pr-10 cursor-pointer"
                      >
                        <option value="none" className="bg-neutral-900 text-white">Does not repeat</option>
                        <option value="weekly" className="bg-neutral-900 text-white">Weekly</option>
                        <option value="biweekly" className="bg-neutral-900 text-white">Every 2 weeks</option>
                        <option value="monthly" className="bg-neutral-900 text-white">Monthly</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-neutral-400">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                      </div>
                    </div>
                    {recurrence !== "none" && (
                      <p className="text-[11px] text-neutral-500 mt-1.5">
                        A new event will be auto-created when this one is marked as Completed.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/5 bg-neutral-900/50 flex items-center justify-between gap-3">
                <p className="text-sm text-red-400 flex-1 min-w-0 truncate">{formError}</p>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={onClose}
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl font-medium text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="bg-red-600 hover:bg-red-500 text-white font-medium py-2.5 px-8 rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all disabled:opacity-60 flex items-center gap-2"
                  >
                    {submitting && <Loader2 size={16} className="animate-spin" />}
                    {submitting ? "Creating…" : "Create Event"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};