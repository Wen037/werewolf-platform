import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Clock, Users, Activity, FileText, Save, Link2, QrCode, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { GameService } from "../services/game.service";
import type { GameSessionDTO, SocialGroupType } from "../types";

type Proficiency = 'All Welcome' | 'Newbie' | 'Intermediate' | 'Advanced' | 'Expert';

interface EditEventModalProps {
  event: GameSessionDTO | null;
  onClose: () => void;
  onSaved: (updated: {
    title: string; date: string; maxPlayers: number;
    proficiency: Proficiency; description: string;
    groupLink?: string; groupType?: SocialGroupType;
  }) => void;
}

const PROFICIENCY_LEVELS: Proficiency[] = ["All Welcome", "Newbie", "Intermediate", "Advanced", "Expert"];

const GROUP_PLATFORMS: { type: SocialGroupType; label: string; color: string; placeholder: string }[] = [
  { type: "telegram",  label: "Telegram",  color: "bg-[#0088cc]/20 border-[#0088cc]/40 text-[#29b6f6]", placeholder: "https://t.me/+invitelink" },
  { type: "whatsapp",  label: "WhatsApp",  color: "bg-[#25D366]/20 border-[#25D366]/40 text-[#66bb6a]", placeholder: "https://chat.whatsapp.com/invite" },
  { type: "wechat",    label: "WeChat",    color: "bg-[#07C160]/20 border-[#07C160]/40 text-[#43a047]", placeholder: "Paste WeChat group QR link" },
  { type: "facebook",  label: "Facebook",  color: "bg-[#1877F2]/20 border-[#1877F2]/40 text-[#5c8fef]", placeholder: "https://www.facebook.com/groups/..." },
];

function parseDateTimeParts(isoString: string): { date: string; time: string } {
  try {
    const d = new Date(isoString);
    return {
      date: d.toLocaleDateString("en-CA"),
      time: d.toTimeString().slice(0, 5),
    };
  } catch {
    return { date: "", time: "" };
  }
}

function buildISOFromParts(date: string, time: string, originalIso: string): string {
  if (!date || !time) return originalIso;
  const tzMatch = originalIso.match(/([+-]\d{2}:\d{2}|Z)$/);
  const tz = tzMatch ? tzMatch[0] : "+08:00";
  return `${date}T${time}:00${tz}`;
}

// ── QR code via free public API (no library needed) ────────────────────────
function QRPreview({ url }: { url: string }) {
  const encoded = encodeURIComponent(url);
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=8&data=${encoded}`;
  return (
    <div className="flex flex-col items-center gap-2 mt-3 p-4 bg-white rounded-xl w-fit mx-auto">
      <img src={src} alt="QR Code" className="w-40 h-40" />
      <p className="text-neutral-700 text-[10px] font-bold tracking-wide text-center max-w-[160px] break-all">
        {url}
      </p>
    </div>
  );
}

export function EditEventModal({ event, onClose, onSaved }: EditEventModalProps) {
  const [title, setTitle]             = useState("");
  const [date, setDate]               = useState("");
  const [time, setTime]               = useState("");
  const [maxPlayers, setMaxPlayers]   = useState(10);
  const [proficiency, setProficiency] = useState<Proficiency>("All Welcome");
  const [description, setDescription] = useState("");
  const [groupType, setGroupType]     = useState<SocialGroupType | null>(null);
  const [groupLink, setGroupLink]     = useState("");
  const [showQR, setShowQR]           = useState(false);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [error, setError]             = useState("");

  useEffect(() => {
    if (!event) return;
    setTitle(event.title);
    const { date: d, time: t } = parseDateTimeParts(event.date);
    setDate(d);
    setTime(t);
    setMaxPlayers(event.maxPlayers);
    setProficiency((event.proficiency ?? "All Welcome") as Proficiency);
    setDescription(event.description ?? "");
    setGroupType(event.groupType ?? null);
    setGroupLink(event.groupLink ?? "");
    setShowQR(false);
    setError("");
    setSaved(false);
  }, [event?.id]);

  const selectedPlatform = GROUP_PLATFORMS.find(p => p.type === groupType);

  const handleSave = async () => {
    if (!event) return;
    if (!title.trim()) { setError("Event title is required."); return; }
    if (!date || !time) { setError("Date and time are required."); return; }
    if (maxPlayers < (event.currentPlayers ?? 0)) {
      setError(`Max players cannot be less than current registered count (${event.currentPlayers}).`);
      return;
    }

    setSaving(true);
    setError("");

    const updatedDate = buildISOFromParts(date, time, event.date);
    const fields = {
      title: title.trim(),
      date: updatedDate,
      maxPlayers,
      proficiency,
      description: description.trim(),
      groupLink: groupLink.trim() || undefined,
      groupType: groupLink.trim() ? (groupType ?? undefined) : undefined,
    };

    try {
      await (GameService as any).updateSession(event.id, fields);

      // Notify all registered players about the update
      const changes: string[] = [];
      if (title.trim() !== event.title) changes.push("title");
      if (updatedDate !== event.date) changes.push("date/time");
      if (maxPlayers !== event.maxPlayers) changes.push("player cap");
      if (proficiency !== event.proficiency) changes.push("proficiency");
      if (groupLink.trim() !== (event.groupLink ?? "")) changes.push("group link");
      const notifMsg = changes.length
        ? `Event updated: ${changes.join(", ")} changed.`
        : "Event details updated by host.";
      await (GameService as any).notifyPlayers(event.id, notifMsg);

      setSaved(true);
      onSaved(fields as any);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1800);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {event && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[120]"
            onClick={!saving && !saved ? onClose : undefined}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[130] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-neutral-900 border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[90vh]">

              {/* Header */}
              <div className="flex justify-between items-center p-6 border-b border-white/5 bg-neutral-900/50 shrink-0">
                <div>
                  <h2 className="text-2xl font-bold text-white">Edit Event</h2>
                  <p className="text-sm text-neutral-400 mt-1 truncate max-w-[380px]">{event.title}</p>
                </div>
                <button
                  onClick={onClose}
                  disabled={saving}
                  className="text-neutral-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full shrink-0 disabled:opacity-40"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form */}
              <div className="p-6 overflow-y-auto space-y-6">

                {/* Title */}
                <div>
                  <label className="text-sm font-semibold text-neutral-300 mb-2 flex items-center gap-2 block">
                    <FileText size={15} className="text-red-400" /> Event Title
                  </label>
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Friday Night Werewolf Pro"
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all placeholder:text-neutral-600"
                  />
                </div>

                {/* Date + Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-semibold text-neutral-300 mb-2 flex items-center gap-2 block">
                      <Calendar size={15} className="text-red-400" /> Date
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-red-500/50 transition-all [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-neutral-300 mb-2 flex items-center gap-2 block">
                      <Clock size={15} className="text-red-400" /> Time
                    </label>
                    <input
                      type="time"
                      value={time}
                      onChange={e => setTime(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-red-500/50 transition-all [color-scheme:dark]"
                    />
                  </div>
                </div>

                {/* Max Players + Proficiency */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-semibold text-neutral-300 mb-2 flex items-center gap-2 block">
                      <Users size={15} className="text-red-400" /> Max Players
                    </label>
                    <div className="relative">
                      <select
                        value={maxPlayers}
                        onChange={e => setMaxPlayers(Number(e.target.value))}
                        className="w-full bg-black border border-white/10 rounded-xl p-3.5 text-white appearance-none focus:outline-none focus:border-red-500/50 transition-all pr-10 cursor-pointer"
                      >
                        {Array.from({ length: 15 }, (_, i) => i + 4).map(n => (
                          <option key={n} value={n} disabled={n < (event.currentPlayers ?? 0)} className="bg-neutral-900 text-white disabled:text-neutral-600">
                            {n} Players{n < (event.currentPlayers ?? 0) ? " (below current)" : ""}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-neutral-400">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd" /></svg>
                      </div>
                    </div>
                    {(event.currentPlayers ?? 0) > 0 && (
                      <p className="text-neutral-500 text-xs mt-1">{event.currentPlayers} players currently registered</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-neutral-300 mb-2 flex items-center gap-2 block">
                      <Activity size={15} className="text-red-400" /> Proficiency
                    </label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {PROFICIENCY_LEVELS.map(level => (
                        <button key={level} type="button" onClick={() => setProficiency(level)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                            proficiency === level
                              ? "bg-red-600/30 border-red-500/50 text-red-300"
                              : "bg-transparent border-white/10 text-neutral-500 hover:border-white/20 hover:text-neutral-300"
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-semibold text-neutral-300 mb-2 block">Description</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Add special rules or notes for players…"
                    rows={3}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-red-500/50 transition-all resize-none placeholder:text-neutral-600"
                  />
                </div>

                {/* ── Social Group ─────────────────────────────────────────── */}
                <div className="border border-white/8 rounded-xl p-4 bg-white/2 space-y-3">
                  <label className="text-sm font-semibold text-neutral-300 flex items-center gap-2">
                    <Link2 size={15} className="text-red-400" />
                    Social Group Link
                    <span className="text-[10px] font-normal text-neutral-600 ml-1">— visible to joined players only</span>
                  </label>

                  {/* Platform selector */}
                  <div className="flex gap-2">
                    {GROUP_PLATFORMS.map(p => (
                      <button
                        key={p.type}
                        type="button"
                        onClick={() => setGroupType(prev => prev === p.type ? null : p.type)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                          groupType === p.type ? p.color : "border-white/10 text-neutral-600 hover:border-white/20 hover:text-neutral-400"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Link input */}
                  {groupType && (
                    <div className="space-y-2">
                      <input
                        value={groupLink}
                        onChange={e => setGroupLink(e.target.value)}
                        placeholder={selectedPlatform?.placeholder}
                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-red-500/40 transition-all placeholder:text-neutral-600"
                      />

                      {/* QR toggle + preview */}
                      {groupLink.trim() && (
                        <div>
                          <button
                            type="button"
                            onClick={() => setShowQR(p => !p)}
                            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
                          >
                            <QrCode size={13} />
                            {showQR ? "Hide QR" : "Preview QR code"}
                          </button>
                          {showQR && <QRPreview url={groupLink.trim()} />}
                        </div>
                      )}
                    </div>
                  )}

                  {!groupType && (
                    <p className="text-neutral-600 text-xs">Select a platform above to add a group invite link.</p>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                    {error}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/5 bg-neutral-900/50 flex items-center justify-between gap-3 shrink-0">
                <p className="text-neutral-600 text-xs">
                  Saved changes will notify all registered players.
                </p>
                <div className="flex gap-3 shrink-0">
                  <button onClick={onClose} disabled={saving || saved}
                    className="px-6 py-2.5 rounded-xl font-medium text-neutral-300 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={saving || saved}
                    className={`flex items-center gap-2 font-bold py-2.5 px-8 rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-60 ${
                      saved
                        ? "bg-green-600 text-white"
                        : "bg-red-600 hover:bg-red-500 text-white"
                    }`}
                  >
                    {saved ? (
                      <><CheckCircle size={16} /> Saved &amp; Notified!</>
                    ) : saving ? (
                      <><Save size={16} /> Saving…</>
                    ) : (
                      <><Save size={16} /> Save Changes</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
