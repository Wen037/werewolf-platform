import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Users, Settings, ClipboardCheck, AlertTriangle,
  UserMinus, UserPlus, CheckCircle2, XCircle, ShieldAlert,
  ChevronRight, ChevronLeft, Play, Trophy, Search, MessageSquare, Send,
  Lock, UserCheck, Globe, FileEdit,
  Calendar, Clock, Activity, FileText, Link2, QrCode, Save, CheckCircle,
} from "lucide-react";
import type { GameSessionDTO, User, SocialGroupType } from "../types";
import type { SessionInteraction } from "../types";
import { getCreditInfo } from "../types";
import { GameService } from "../services/game.service";
import { useLang } from "../context/LanguageContext";

interface RosterEntry {
  user: User;
  interaction: SessionInteraction;
}

type PanelTab = "info" | "roster" | "manage" | "attendance" | "danger";

interface HostControlPanelProps {
  event: GameSessionDTO;
  onClose: () => void;
  onEventUpdate: (updated: Partial<GameSessionDTO>) => void;
  onEventCancel: (sessionId: string) => void;
}

// ── Credit rank mini-badge ─────────────────────────────────────────────────
function CreditBadge({ score }: { score?: number }) {
  const info = getCreditInfo(score ?? 100);
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${info.bgColor} ${info.color}`}>
      {info.label}
    </span>
  );
}

// ── Skill level badge ──────────────────────────────────────────────────────
function SkillBadge({ level }: { level?: string }) {
  const colors: Record<string, string> = {
    Beginner: "text-green-400 border-green-400/30 bg-green-400/10",
    Intermediate: "text-blue-400 border-blue-400/30 bg-blue-400/10",
    Advanced: "text-purple-400 border-purple-400/30 bg-purple-400/10",
    Expert: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  };
  if (!level) return null;
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${colors[level] ?? "text-neutral-400 border-neutral-400/30"}`}>
      {level}
    </span>
  );
}

// ── Info / Edit Tab ────────────────────────────────────────────────────────
type Proficiency = 'All Welcome' | 'Newbie' | 'Intermediate' | 'Advanced' | 'Expert';
const PROFICIENCY_LEVELS: Proficiency[] = ["All Welcome", "Newbie", "Intermediate", "Advanced", "Expert"];

const GROUP_PLATFORMS: { type: SocialGroupType; label: string; color: string; placeholder: string }[] = [
  { type: "telegram", label: "Telegram", color: "bg-[#0088cc]/20 border-[#0088cc]/40 text-[#29b6f6]", placeholder: "https://t.me/+invitelink" },
  { type: "whatsapp", label: "WhatsApp", color: "bg-[#25D366]/20 border-[#25D366]/40 text-[#66bb6a]", placeholder: "https://chat.whatsapp.com/invite" },
  { type: "wechat",   label: "WeChat",   color: "bg-[#07C160]/20 border-[#07C160]/40 text-[#43a047]", placeholder: "Paste WeChat group QR link" },
  { type: "facebook", label: "Facebook", color: "bg-[#1877F2]/20 border-[#1877F2]/40 text-[#5c8fef]", placeholder: "https://www.facebook.com/groups/..." },
];

function parseDateTimeParts(isoString: string): { date: string; time: string } {
  try {
    const d = new Date(isoString);
    return { date: d.toLocaleDateString("en-CA"), time: d.toTimeString().slice(0, 5) };
  } catch { return { date: "", time: "" }; }
}
function buildISOFromParts(date: string, time: string, originalIso: string): string {
  if (!date || !time) return originalIso;
  const tzMatch = originalIso.match(/([+-]\d{2}:\d{2}|Z)$/);
  const tz = tzMatch ? tzMatch[0] : "+08:00";
  return `${date}T${time}:00${tz}`;
}

function InfoTab({ event, onEventUpdate, saveKey, onSaveStateChange }: {
  event: GameSessionDTO;
  onEventUpdate: (updated: Partial<GameSessionDTO>) => void;
  saveKey: number;
  onSaveStateChange: (state: { saving: boolean; saved: boolean }) => void;
}) {
  const [title, setTitle]             = useState(event.title);
  const [date, setDate]               = useState(() => parseDateTimeParts(event.date).date);
  const [time, setTime]               = useState(() => parseDateTimeParts(event.date).time);
  const [maxPlayers, setMaxPlayers]   = useState(event.maxPlayers);
  const [proficiency, setProficiency] = useState<Proficiency>((event.proficiency ?? "All Welcome") as Proficiency);
  const [description, setDescription] = useState(event.description ?? "");
  const [groupType, setGroupType]     = useState<SocialGroupType | null>(event.groupType ?? null);
  const [groupLink, setGroupLink]     = useState(event.groupLink ?? "");
  const [showQR, setShowQR]           = useState(false);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [error, setError]             = useState("");

  const selectedPlatform = GROUP_PLATFORMS.find(p => p.type === groupType);

  const handleSave = async () => {
    if (!title.trim()) { setError("Title is required."); return; }
    if (!date || !time) { setError("Date and time are required."); return; }
    if (maxPlayers < (event.currentPlayers ?? 0)) {
      setError(`Max cannot be below current count (${event.currentPlayers}).`);
      return;
    }
    setSaving(true); onSaveStateChange({ saving: true, saved: false });
    setError("");
    const updatedDate = buildISOFromParts(date, time, event.date);
    const fields = {
      title: title.trim(), date: updatedDate, maxPlayers, proficiency,
      description: description.trim(),
      groupLink: groupLink.trim() || undefined,
      groupType: groupLink.trim() ? (groupType ?? undefined) : undefined,
    };
    try {
      await (GameService as any).updateSession(event.id, fields);
      const changes: string[] = [];
      if (title.trim() !== event.title) changes.push("title");
      if (updatedDate !== event.date) changes.push("date/time");
      if (maxPlayers !== event.maxPlayers) changes.push("player cap");
      if (proficiency !== event.proficiency) changes.push("proficiency");
      if (groupLink.trim() !== (event.groupLink ?? "")) changes.push("group link");
      if (changes.length) await (GameService as any).notifyPlayers(event.id, `Event updated: ${changes.join(", ")} changed.`);
      onEventUpdate(fields as Partial<GameSessionDTO>);
      setSaved(true); onSaveStateChange({ saving: false, saved: true });
      setTimeout(() => { setSaved(false); onSaveStateChange({ saving: false, saved: false }); }, 2500);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save.");
      onSaveStateChange({ saving: false, saved: false });
    } finally {
      setSaving(false);
    }
  };

  // Triggered from header Save button
  useEffect(() => { if (saveKey > 0) handleSave(); }, [saveKey]);

  return (
    <div className="space-y-6">

      {/* ── Row 1: Title + Date/Time ──────────────────────────── */}
      <div className="grid grid-cols-5 gap-4">
        {/* Title — wider */}
        <div className="col-span-3">
          <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 block">
            <FileText size={12} className="text-red-400" /> Event Title
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-neutral-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50 placeholder:text-neutral-600"
          />
        </div>
        {/* Date + Time stacked */}
        <div className="col-span-2 grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 block">
              <Calendar size={12} className="text-red-400" /> Date
            </label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full bg-neutral-800 border border-white/10 rounded-xl px-2 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50 [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 block">
              <Clock size={12} className="text-red-400" /> Time
            </label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)}
              className="w-full bg-neutral-800 border border-white/10 rounded-xl px-2 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50 [color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      {/* ── Row 2: Max Players + Proficiency ─────────────────── */}
      <div className="grid grid-cols-5 gap-4">
        {/* Max Players */}
        <div className="col-span-1">
          <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 block">
            <Users size={12} className="text-red-400" /> Max Pax
          </label>
          <div className="relative">
            <select
              value={maxPlayers}
              onChange={e => setMaxPlayers(Number(e.target.value))}
              className="w-full bg-neutral-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white appearance-none focus:outline-none focus:border-red-500/50 cursor-pointer pr-7"
            >
              {Array.from({ length: 15 }, (_, i) => i + 4).map(n => (
                <option key={n} value={n} disabled={n < (event.currentPlayers ?? 0)} className="bg-neutral-900">
                  {n}{n < (event.currentPlayers ?? 0) ? "↓" : ""}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-neutral-500">
              <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"/></svg>
            </div>
          </div>
          {(event.currentPlayers ?? 0) > 0 && (
            <p className="text-neutral-600 text-xs mt-1">{event.currentPlayers} registered</p>
          )}
        </div>
        {/* Proficiency */}
        <div className="col-span-4">
          <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 block">
            <Activity size={12} className="text-red-400" /> Proficiency
          </label>
          <div className="flex flex-wrap gap-2 mt-1">
            {PROFICIENCY_LEVELS.map(level => (
              <button key={level} type="button" onClick={() => setProficiency(level)}
                className={`px-3 py-2 rounded-xl text-sm font-bold border transition-colors ${
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

      {/* ── Row 3: Description + Social Group side by side ───── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Description */}
        <div>
          <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Add special rules or notes for players…"
            rows={6}
            className="w-full h-full min-h-[140px] bg-neutral-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50 resize-none placeholder:text-neutral-600"
          />
        </div>

        {/* Social Group */}
        <div className="border border-white/8 rounded-xl p-4 bg-white/2 space-y-3">
          <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <Link2 size={12} className="text-red-400" /> Social Group Link
            <span className="text-[10px] font-normal text-neutral-600 ml-1">— joined players only</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {GROUP_PLATFORMS.map(p => (
              <button key={p.type} type="button"
                onClick={() => setGroupType(prev => prev === p.type ? null : p.type)}
                className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                  groupType === p.type ? p.color : "border-white/10 text-neutral-600 hover:border-white/20 hover:text-neutral-400"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {groupType && (
            <div className="space-y-2">
              <input
                value={groupLink}
                onChange={e => setGroupLink(e.target.value)}
                placeholder={selectedPlatform?.placeholder}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/40 placeholder:text-neutral-600"
              />
              {groupLink.trim() && (
                <div>
                  <button type="button" onClick={() => setShowQR(p => !p)}
                    className="flex items-center gap-1 text-xs text-neutral-500 hover:text-white transition-colors"
                  >
                    <QrCode size={12} /> {showQR ? "Hide QR" : "Preview QR"}
                  </button>
                  {showQR && (
                    <div className="flex justify-center mt-2">
                      <div className="bg-white rounded-xl p-2">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=5&data=${encodeURIComponent(groupLink.trim())}`}
                          alt="QR" className="w-28 h-28"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {!groupType && <p className="text-neutral-600 text-xs">Select a platform above to add a group invite link.</p>}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-red-400 text-xs">
          {error}
        </div>
      )}

    </div>
  );
}

// ── Roster Tab ─────────────────────────────────────────────────────────────
function RosterTab({ event, roster, onRosterChange, onEventUpdate }: {
  event: GameSessionDTO;
  roster: RosterEntry[];
  onRosterChange: () => void;
  onEventUpdate: (updated: Partial<GameSessionDTO>) => void;
}) {
  const { t } = useLang();
  const [search, setSearch] = useState("");
  const [activePanel, setActivePanel] = useState<{ userId: string; mode: 'kick' | 'message' } | null>(null);
  const [kickReason, setKickReason] = useState("");
  const [kicking, setKicking] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [addingGuest, setAddingGuest] = useState(false);
  const [localGuests, setLocalGuests] = useState(event.guests ?? []);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const closePanel = () => { setActivePanel(null); setKickReason(""); setMsgText(""); };

  // Split roster by status
  const registeredRoster = roster.filter(r => r.interaction.status === "registered" || r.interaction.status === "attended" || r.interaction.status === "no-show");
  const pendingRoster    = roster.filter(r => r.interaction.status === "pending");

  const filtered = search.trim()
    ? registeredRoster.filter(r => r.user.username.toLowerCase().includes(search.trim().toLowerCase()))
    : registeredRoster;

  const handleKickConfirm = async (userId: string) => {
    if (!kickReason.trim()) return;
    setKicking(true);
    try {
      await (GameService as any).kickPlayer(event.id, userId);
      await (GameService as any).adjustCredit(userId, -0.5);
      closePanel();
      onRosterChange();
      onEventUpdate({ currentPlayers: Math.max(0, event.currentPlayers - 1) });
    } finally {
      setKicking(false);
    }
  };

  const handleSendMessage = async (userId: string) => {
    if (!msgText.trim()) return;
    setSending(true);
    try {
      await (GameService as any).sendMessageToPlayer(event.id, userId, msgText.trim());
      setSentTo(userId);
      setMsgText("");
      setTimeout(() => { setSentTo(null); closePanel(); }, 1500);
    } finally {
      setSending(false);
    }
  };

  const handleAddGuest = async () => {
    const name = guestName.trim();
    if (!name) return;
    setAddingGuest(true);
    try {
      await (GameService as any).addGuest(event.id, name);
      const newGuest = { name, addedBy: "", addedAt: new Date().toISOString() };
      const updatedGuests = [...localGuests, newGuest];
      setLocalGuests(updatedGuests);
      setGuestName("");
      // Bug 5 fix: update parent event's player count + guests list
      onEventUpdate({ currentPlayers: event.currentPlayers + 1, guests: updatedGuests });
    } finally {
      setAddingGuest(false);
    }
  };

  const handleRemoveGuest = async (index: number) => {
    await (GameService as any).removeGuest(event.id, index);
    const updatedGuests = localGuests.filter((_, i) => i !== index);
    setLocalGuests(updatedGuests);
    // Bug 5 fix: update parent event's player count + guests list
    onEventUpdate({ currentPlayers: Math.max(0, event.currentPlayers - 1), guests: updatedGuests });
  };

  // Bug 6: Approve / reject pending applicants
  const handleApprove = async (userId: string) => {
    setApprovingId(userId);
    try {
      await (GameService as any).approveApplicant(event.id, userId);
      onRosterChange();
      onEventUpdate({ currentPlayers: event.currentPlayers + 1 });
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (userId: string) => {
    setRejectingId(userId);
    try {
      await (GameService as any).rejectApplicant(event.id, userId);
      onRosterChange();
    } finally {
      setRejectingId(null);
    }
  };

  return (
    <div className="space-y-5">

      {/* ── Pending Applicants (approval queue) ──────────────────────── */}
      {pendingRoster.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <UserCheck size={12} /> Awaiting Approval ({pendingRoster.length})
          </h3>
          <div className="space-y-2 mb-1">
            {pendingRoster.map(({ user }) => {
              const isFlagged = (user.creditScore ?? 100) < 100;
              return (
                <div key={user.id} className={`rounded-xl border overflow-hidden ${isFlagged ? "border-red-500/20" : "border-amber-500/20"}`}>
                  <div className={`flex items-center gap-3 p-3 ${isFlagged ? "bg-red-500/5" : "bg-amber-500/5"}`}>
                    <img
                      src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                      alt={user.username}
                      className="w-8 h-8 rounded-full shrink-0 bg-neutral-700"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-sm font-bold truncate ${isFlagged ? "text-red-300" : "text-white"}`}>
                          {user.username}
                        </span>
                        {isFlagged && <AlertTriangle size={11} className="text-red-400 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <CreditBadge score={user.creditScore} />
                        <SkillBadge level={user.skillLevel} />
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => handleApprove(user.id)}
                        disabled={approvingId === user.id || rejectingId === user.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-green-600 hover:bg-green-500 text-white transition-colors disabled:opacity-40"
                        title="Approve"
                      >
                        {approvingId === user.id ? "…" : <><CheckCircle2 size={12} /> Accept</>}
                      </button>
                      <button
                        onClick={() => handleReject(user.id)}
                        disabled={approvingId === user.id || rejectingId === user.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                        title="Reject"
                      >
                        {rejectingId === user.id ? "…" : <><XCircle size={12} /> Decline</>}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-white/5 my-4" />
        </div>
      )}

      {/* ── Registered Players ─────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider shrink-0">
            {t('Players')} ({registeredRoster.length + localGuests.length}/{event.maxPlayers})
          </h3>
          <div className="h-1.5 flex-1 bg-neutral-800 rounded-full overflow-hidden">
            <div className="h-full bg-red-600 rounded-full transition-all"
              style={{ width: `${Math.min(100, ((registeredRoster.length + localGuests.length) / event.maxPlayers) * 100)}%` }} />
          </div>
        </div>

        {registeredRoster.length > 3 && (
          <div className="relative mb-3">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search player…"
              className="w-full bg-neutral-800 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-white/20"
            />
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="text-neutral-600 text-sm italic py-4 text-center">
            {search ? "No player matches that name." : "No registered players yet."}
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map(({ user, interaction }) => {
              const isFlagged = (user.creditScore ?? 100) < 100;
              const panelMode = activePanel?.userId === user.id ? activePanel.mode : null;
              const isSent = sentTo === user.id;
              return (
                <div key={user.id} className={`rounded-xl border overflow-hidden transition-colors ${isFlagged ? "border-red-500/20" : "border-white/5"}`}>
                  <div className={`flex items-center gap-3 p-3 ${isFlagged ? "bg-red-500/5" : "bg-neutral-800/60"}`}>
                    <img
                      src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                      alt={user.username}
                      className="w-8 h-8 rounded-full shrink-0 bg-neutral-700"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-sm font-bold truncate ${isFlagged ? "text-red-300" : "text-white"}`}>
                          {user.username}
                        </span>
                        {isFlagged && <AlertTriangle size={11} className="text-red-400 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <CreditBadge score={user.creditScore} />
                        <SkillBadge level={user.skillLevel} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border mr-1 ${
                        interaction.status === "registered"
                          ? "text-blue-400 border-blue-400/30 bg-blue-400/10"
                          : "text-neutral-500 border-neutral-600"
                      }`}>
                        {interaction.status}
                      </span>
                      <button
                        onClick={() => { setActivePanel(panelMode === 'message' ? null : { userId: user.id, mode: 'message' }); setMsgText(""); }}
                        className={`p-1.5 rounded-lg transition-colors ${panelMode === 'message' ? "text-blue-400 bg-blue-500/15" : "text-neutral-600 hover:text-blue-400 hover:bg-blue-500/10"}`}
                        title="Send message"
                      >
                        <MessageSquare size={14} />
                      </button>
                      <button
                        onClick={() => { setActivePanel(panelMode === 'kick' ? null : { userId: user.id, mode: 'kick' }); setKickReason(""); }}
                        className={`p-1.5 rounded-lg transition-colors ${panelMode === 'kick' ? "text-red-400 bg-red-500/15" : "text-neutral-600 hover:text-red-400 hover:bg-red-500/10"}`}
                        title="Remove player"
                      >
                        <UserMinus size={14} />
                      </button>
                    </div>
                  </div>

                  {panelMode === 'message' && (
                    <div className="bg-blue-950/30 border-t border-blue-500/15 px-3 py-3 space-y-2">
                      <p className="text-blue-300 text-xs font-bold">
                        Message <span className="text-white">{user.username}</span>
                      </p>
                      <textarea
                        value={msgText}
                        onChange={e => setMsgText(e.target.value)}
                        placeholder="Type your message…"
                        rows={2}
                        className="w-full bg-neutral-900 border border-blue-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-blue-500/40 resize-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={closePanel} className="flex-1 py-1.5 rounded-lg text-xs font-bold text-neutral-400 border border-white/10 hover:bg-white/5 transition-colors">Cancel</button>
                        <button
                          onClick={() => handleSendMessage(user.id)}
                          disabled={sending || !msgText.trim() || isSent}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-40 ${isSent ? "bg-green-600 text-white" : "bg-blue-600 hover:bg-blue-500 text-white"}`}
                        >
                          {isSent ? "✓ Sent!" : sending ? "Sending…" : <><Send size={12} /> Send</>}
                        </button>
                      </div>
                    </div>
                  )}

                  {panelMode === 'kick' && (
                    <div className="bg-red-950/40 border-t border-red-500/20 px-3 py-3 space-y-2">
                      <p className="text-red-300 text-xs font-bold">
                        Removing <span className="text-white">{user.username}</span> deducts <span className="text-red-400">−0.5 credit</span>.
                      </p>
                      <input
                        value={kickReason}
                        onChange={e => setKickReason(e.target.value)}
                        placeholder="Reason for removal (required)…"
                        className="w-full bg-neutral-900 border border-red-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500/40"
                      />
                      <div className="flex gap-2">
                        <button onClick={closePanel} className="flex-1 py-1.5 rounded-lg text-xs font-bold text-neutral-400 border border-white/10 hover:bg-white/5 transition-colors">Cancel</button>
                        <button
                          onClick={() => handleKickConfirm(user.id)}
                          disabled={kicking || !kickReason.trim()}
                          className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-40"
                        >
                          {kicking ? "Removing…" : "Confirm Remove"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Guests ─────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
          Guests ({localGuests.length})
        </h3>
        <div className="space-y-2 mb-3">
          {localGuests.map((g, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-neutral-800/40 border border-white/5">
              <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center shrink-0">
                <UserPlus size={14} className="text-neutral-400" />
              </div>
              <span className="text-sm text-neutral-300 flex-1 truncate">{g.name}</span>
              <button
                onClick={() => handleRemoveGuest(i)}
                className="p-1.5 text-neutral-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={guestName}
            onChange={e => setGuestName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAddGuest()}
            placeholder="Guest name…"
            className="flex-1 bg-neutral-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500/50"
          />
          <button onClick={handleAddGuest} disabled={addingGuest || !guestName.trim()}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-40">
            Add
          </button>
        </div>
      </div>

      {/* Waitlist indicator */}
      {(event.waitlistCount ?? 0) > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
          <p className="text-amber-400 text-sm font-bold">
            {event.waitlistCount} player{event.waitlistCount !== 1 ? "s" : ""} on waitlist
          </p>
          <p className="text-neutral-400 text-xs mt-1">Promoted automatically when a spot opens.</p>
        </div>
      )}
    </div>
  );
}

// ── Manage Tab ─────────────────────────────────────────────────────────────
function ManageTab({ event, onEventUpdate, onFinished }: {
  event: GameSessionDTO;
  onEventUpdate: (updated: Partial<GameSessionDTO>) => void;
  onFinished: () => void;
}) {
  // Bug 3 fix: default approvalMode is 'approval', not 'open'
  const [localStatus, setLocalStatus] = useState(event.status);
  const [localMode, setLocalMode]     = useState(event.approvalMode ?? 'approval');
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingMode, setSavingMode]     = useState(false);

  const STATUS_OPTIONS: { value: 'open' | 'playing' | 'finished'; label: string; icon: React.ReactNode; color: string }[] = [
    { value: "open",     label: "Open",     icon: <ChevronRight size={14} />, color: "border-green-500/40 text-green-400 bg-green-500/10" },
    { value: "playing",  label: "Playing",  icon: <Play size={14} />,         color: "border-blue-500/40 text-blue-400 bg-blue-500/10" },
    { value: "finished", label: "Finished", icon: <Trophy size={14} />,       color: "border-neutral-500/40 text-neutral-400 bg-neutral-500/10" },
  ];

  const ENTRY_MODES: { value: 'open' | 'approval' | 'invite_only'; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
    { value: "open",        label: "Open",        desc: "Anyone can join instantly",     icon: <Globe size={16} />,     color: "border-green-500/40 text-green-400 bg-green-500/10" },
    { value: "approval",    label: "Approval",    desc: "You review each join request",  icon: <UserCheck size={16} />, color: "border-amber-500/40 text-amber-400 bg-amber-500/10" },
    { value: "invite_only", label: "Invite Only", desc: "You invite players directly",   icon: <Lock size={16} />,      color: "border-purple-500/40 text-purple-400 bg-purple-500/10" },
  ];

  const handleStatusChange = async (status: 'open' | 'playing' | 'finished') => {
    if (status === localStatus) return;
    setSavingStatus(true);
    try {
      await (GameService as any).updateSessionStatus(event.id, status);
      setLocalStatus(status);
      onEventUpdate({ status });
      // Auto-jump to Attendance tab when host marks session as finished
      if (status === "finished") onFinished();
    } finally {
      setSavingStatus(false);
    }
  };

  const handleModeChange = async (mode: 'open' | 'approval' | 'invite_only') => {
    if (mode === localMode) return;
    setSavingMode(true);
    try {
      await (GameService as any).updateApprovalMode(event.id, mode);
      setLocalMode(mode);
      onEventUpdate({ approvalMode: mode });
    } finally {
      setSavingMode(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Entry Mode */}
      <div>
        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Entry Mode</h3>
        <div className="space-y-2">
          {ENTRY_MODES.map(opt => (
            <button key={opt.value} onClick={() => handleModeChange(opt.value)} disabled={savingMode}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border font-bold text-sm transition-all disabled:opacity-50 text-left ${
                localMode === opt.value
                  ? opt.color + " ring-1 ring-offset-1 ring-offset-neutral-900 ring-current/40"
                  : "border-white/10 text-neutral-400 bg-neutral-800/40 hover:border-white/20 hover:text-neutral-200"
              }`}
            >
              <span className="shrink-0">{opt.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold">{opt.label}</div>
                <div className="text-[11px] font-normal opacity-70 mt-0.5">{opt.desc}</div>
              </div>
              {localMode === opt.value && <CheckCircle2 size={15} className="shrink-0 opacity-80" />}
            </button>
          ))}
        </div>
        {localMode === "approval" && (
          <p className="text-amber-400 text-xs mt-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            New join requests appear in the Roster tab for your approval.
          </p>
        )}
        {localMode === "invite_only" && (
          <p className="text-purple-400 text-xs mt-2 bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2">
            Event is hidden from public listing. Only you can see it in My Events.
          </p>
        )}
      </div>

      {/* Session Status */}
      <div>
        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Session Status</h3>
        <div className="flex gap-2">
          {STATUS_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => handleStatusChange(opt.value)} disabled={savingStatus}
              className={`flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border font-bold text-xs transition-all disabled:opacity-50 ${
                localStatus === opt.value
                  ? opt.color + " ring-1 ring-offset-1 ring-offset-neutral-900 ring-current"
                  : "border-white/10 text-neutral-500 bg-neutral-800/40 hover:border-white/20 hover:text-neutral-300"
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
        {localStatus === "playing" && (
          <p className="text-blue-400 text-xs mt-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
            Session is live. Players can no longer join or leave.
          </p>
        )}
        {localStatus === "finished" && (
          <p className="text-neutral-400 text-xs mt-2 bg-neutral-800/40 border border-white/5 rounded-lg px-3 py-2">
            Session closed. Head to the Attendance tab to mark results.
          </p>
        )}
      </div>

      {/* Event Info Summary */}
      <div className="bg-neutral-800/40 border border-white/5 rounded-xl p-4 space-y-2">
        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Event Info</h3>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">Players</span>
          <span className="text-white font-bold">{event.currentPlayers} / {event.maxPlayers}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">Proficiency</span>
          <span className="text-white">{event.proficiency ?? "All Welcome"}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">Venue</span>
          <span className="text-white truncate max-w-[180px]">{event.venueName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">Venue Approval</span>
          <span className={event.venueApprovalStatus === "confirmed" ? "text-green-400 font-bold" : "text-amber-400"}>
            {event.venueApprovalStatus === "confirmed" ? "Confirmed" : "Pending"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Attendance Tab ─────────────────────────────────────────────────────────
function AttendanceTab({ event, roster, onEventUpdate, saveKey, onSaveStateChange }: {
  event: GameSessionDTO;
  roster: RosterEntry[];
  onEventUpdate: (updated: Partial<GameSessionDTO>) => void;
  saveKey: number;
  onSaveStateChange: (state: { saving: boolean; saved: boolean }) => void;
}) {
  const [marks, setMarks] = useState<Record<string, 'attended' | 'no-show' | null>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const activeRoster = roster.filter(r =>
    r.interaction.status === "registered" || r.interaction.status === "attended" || r.interaction.status === "no-show"
  );

  useEffect(() => {
    const initial: Record<string, 'attended' | 'no-show' | null> = {};
    for (const { user, interaction } of activeRoster) {
      initial[user.id] = (interaction.status === "attended" || interaction.status === "no-show") ? interaction.status : null;
    }
    setMarks(initial);
  }, [roster.length]);

  const handleSave = async () => {
    if (Object.values(marks).every(v => v === null)) return;
    setSaving(true); onSaveStateChange({ saving: true, saved: false });
    const records = activeRoster
      .filter(r => marks[r.user.id] !== null)
      .map(r => ({ userId: r.user.id, status: marks[r.user.id]! }));
    try {
      await (GameService as any).markAttendance(event.id, records);
      setSaved(true); onSaveStateChange({ saving: false, saved: true });
      setTimeout(() => { setSaved(false); onSaveStateChange({ saving: false, saved: false }); }, 2500);
      if (records.length === activeRoster.length) {
        onEventUpdate({ status: "finished" });
      }
    } finally {
      setSaving(false);
    }
  };

  // Triggered from header Save button
  useEffect(() => { if (saveKey > 0) handleSave(); }, [saveKey]);

  const handleMarkAll = (status: 'attended' | 'no-show') => {
    const all: Record<string, 'attended' | 'no-show' | null> = {};
    for (const { user } of activeRoster) all[user.id] = status;
    setMarks(all);
  };

  const handleClearAll = () => {
    const cleared: Record<string, null> = {};
    for (const { user } of activeRoster) cleared[user.id] = null;
    setMarks(cleared);
  };

  if (activeRoster.length === 0) {
    return <p className="text-neutral-600 text-sm italic py-8 text-center">No players to mark attendance for.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Bulk actions */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-500 shrink-0">Select all:</span>
        <button
          onClick={() => handleMarkAll('attended')}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors"
        >
          <CheckCircle2 size={11} /> All Attended
        </button>
        <button
          onClick={() => handleMarkAll('no-show')}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <XCircle size={11} /> All No-show
        </button>
        <button
          onClick={handleClearAll}
          className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-white/10 text-neutral-500 hover:text-neutral-300 hover:border-white/20 transition-colors"
        >
          Clear
        </button>
      </div>

      <div className="space-y-2">
        {activeRoster.map(({ user }) => (
          <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl bg-neutral-800/60 border border-white/5">
            <img
              src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
              alt={user.username}
              className="w-8 h-8 rounded-full bg-neutral-700 shrink-0"
            />
            <span className="flex-1 text-sm text-white font-medium truncate">{user.username}</span>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => setMarks(prev => ({ ...prev, [user.id]: marks[user.id] === "attended" ? null : "attended" }))}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  marks[user.id] === "attended"
                    ? "bg-green-500/20 border-green-500/40 text-green-400"
                    : "bg-transparent border-white/10 text-neutral-500 hover:border-green-500/30 hover:text-green-400"
                }`}
              >
                <CheckCircle2 size={12} /> Attended
              </button>
              <button
                onClick={() => setMarks(prev => ({ ...prev, [user.id]: marks[user.id] === "no-show" ? null : "no-show" }))}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  marks[user.id] === "no-show"
                    ? "bg-red-500/20 border-red-500/40 text-red-400"
                    : "bg-transparent border-white/10 text-neutral-500 hover:border-red-500/30 hover:text-red-400"
                }`}
              >
                <XCircle size={12} /> No-show
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Danger Tab ─────────────────────────────────────────────────────────────
function DangerTab({ event, roster, onEventCancel }: {
  event: GameSessionDTO;
  roster: RosterEntry[];
  onEventCancel: (sessionId: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Bug 4: credit deduction based on number of web-registered players
  const webRegisteredCount = roster.filter(r => r.interaction.status === 'registered').length;
  const hostPenalty =
    webRegisteredCount <= 2 ? 0 :
    webRegisteredCount <= 4 ? -0.5 :
    webRegisteredCount <= 8 ? -1 : -1.5;

  const penaltyLabel =
    hostPenalty === 0   ? "No credit penalty" :
    hostPenalty === -0.5 ? "−0.5 credit (3–4 players affected)" :
    hostPenalty === -1  ? "−1 credit (5–8 players affected)" :
                          "−1.5 credit (9+ players affected)";

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await (GameService as any).cancelSession(event.id);
      // Bug 4: deduct host credit proportional to affected registered players
      if (hostPenalty < 0) {
        await (GameService as any).adjustCredit(event.hostId, hostPenalty);
      }
      onEventCancel(event.id);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <ShieldAlert size={16} className="text-red-400 shrink-0" />
          <span className="text-red-300 font-bold text-sm">Danger Zone</span>
        </div>
        <p className="text-neutral-400 text-xs leading-relaxed">
          These actions are irreversible. All registered players will be notified and removed.
        </p>
      </div>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="w-full py-3 rounded-xl text-sm font-bold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
        >
          Cancel This Event
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-white text-sm font-bold text-center">
            Cancel "<span className="text-red-400">{event.title}</span>"?
          </p>
          <p className="text-neutral-400 text-xs text-center">
            {webRegisteredCount} registered player{webRegisteredCount !== 1 ? "s" : ""} will be removed.
          </p>
          {/* Bug 4: show credit penalty */}
          <div className={`rounded-xl px-4 py-2.5 text-xs font-bold text-center ${
            hostPenalty < 0
              ? "bg-red-500/10 border border-red-500/20 text-red-400"
              : "bg-neutral-800/40 border border-white/5 text-neutral-500"
          }`}>
            Your credit: {penaltyLabel}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-white/10 text-neutral-300 hover:bg-white/5 transition-colors"
            >
              Keep Event
            </button>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50"
            >
              {cancelling ? "Cancelling…" : "Yes, Cancel"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────────
export function HostControlPanel({ event, onClose, onEventUpdate, onEventCancel }: HostControlPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>("info");
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [localEvent, setLocalEvent] = useState(event);
  // Collapse: panel shrinks to a thin strip; > on left edge to toggle
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Global save: header button triggers save in active tab
  const [saveKey, setSaveKey] = useState(0);
  const [saveState, setSaveState] = useState<{ saving: boolean; saved: boolean }>({ saving: false, saved: false });
  const hasSaveButton = activeTab === "info" || activeTab === "attendance";

  useEffect(() => {
    loadRoster();
  }, [event.id]);

  const loadRoster = async () => {
    const data = await (GameService as any).getSessionRoster(event.id);
    setRoster(data);
  };

  const handleEventUpdate = (updated: Partial<GameSessionDTO>) => {
    setLocalEvent(prev => ({ ...prev, ...updated }));
    onEventUpdate(updated);
  };

  const pendingCount = roster.filter(r => r.interaction.status === 'pending').length;

  const TABS: { id: PanelTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "info",       label: "Info",       icon: <FileEdit size={15} /> },
    { id: "roster",     label: "Roster",     icon: <Users size={15} />, badge: pendingCount },
    { id: "manage",     label: "Manage",     icon: <Settings size={15} /> },
    { id: "attendance", label: "Attendance", icon: <ClipboardCheck size={15} /> },
    { id: "danger",     label: "Danger",     icon: <AlertTriangle size={15} /> },
  ];

  return (
    <AnimatePresence>
      <>
        {/* Backdrop — clicking it closes fully; starts below top nav bar */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed top-16 inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm z-[100]"
          onClick={onClose}
        />

        {/* Panel — slides in from right; CSS transition handles collapse width */}
        <motion.div
          initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 260 }}
          className={`fixed top-16 right-0 h-[calc(100vh-4rem)] bg-neutral-950 border-l border-white/10 shadow-2xl z-[110] flex transition-[width] duration-300 ease-in-out ${
            isCollapsed
              ? "w-12"
              : "w-full max-w-[calc(100vw-56px)]"   // fills content area below nav bar (56px = left nav)
          }`}
          onClick={e => e.stopPropagation()}
        >
          {/* ── Collapse toggle button — sticks out from left edge ── */}
          <button
            onClick={() => setIsCollapsed(c => !c)}
            className="absolute -left-5 top-1/2 -translate-y-1/2 w-5 h-14 bg-neutral-800 hover:bg-neutral-700 border border-white/10 rounded-l-lg flex items-center justify-center text-neutral-400 hover:text-white transition-colors z-20"
            title={isCollapsed ? "Expand panel" : "Collapse panel"}
          >
            {isCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>

          {/* ── Collapsed strip — just rotated title ─────────────── */}
          {isCollapsed && (
            <div className="flex flex-col items-center justify-center w-full gap-3 py-6 overflow-hidden">
              <span
                className="text-[10px] font-bold text-red-500 uppercase tracking-[0.15em] whitespace-nowrap"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              >
                Host Control
              </span>
            </div>
          )}

          {/* ── Expanded panel content ────────────────────────────── */}
          {!isCollapsed && (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Header */}
              <div className="px-6 pt-5 pb-4 border-b border-white/10 shrink-0">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-red-500 uppercase tracking-[0.15em] mb-1">Host Control</div>
                    <h2 className="text-white font-bold text-xl leading-tight">{localEvent.title}</h2>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        localEvent.status === "open"    ? "text-green-400 border-green-500/30 bg-green-500/10" :
                        localEvent.status === "playing" ? "text-blue-400 border-blue-500/30 bg-blue-500/10" :
                                                           "text-neutral-400 border-neutral-500/30 bg-neutral-500/10"
                      }`}>
                        {localEvent.status.toUpperCase()}
                      </span>
                      <span className="text-neutral-500 text-xs">{localEvent.venueName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Global Save button — only shown for tabs that have saveable state */}
                    {hasSaveButton && (
                      <button
                        onClick={() => { setSaveKey(k => k + 1); }}
                        disabled={saveState.saving || saveState.saved}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all disabled:opacity-60 ${
                          saveState.saved
                            ? "border-green-500/40 bg-green-500/15 text-green-400"
                            : saveState.saving
                            ? "border-white/10 bg-white/5 text-neutral-400"
                            : "border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        }`}
                      >
                        {saveState.saved ? <><CheckCircle size={13} /> Saved!</> : saveState.saving ? <><Save size={13} /> Saving…</> : <><Save size={13} /> Save</>}
                      </button>
                    )}
                    <button onClick={onClose} className="p-2 text-neutral-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Tab Bar */}
              <div className="flex border-b border-white/10 shrink-0">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setSaveState({ saving: false, saved: false }); }}
                    className={`flex-1 flex flex-col items-center gap-1 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors border-b-2 relative ${
                      activeTab === tab.id
                        ? tab.id === "danger" ? "border-red-500 text-red-400" : "border-red-500 text-white"
                        : "border-transparent text-neutral-600 hover:text-neutral-400"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="absolute top-1.5 right-2 min-w-[16px] h-4 px-1 bg-amber-500 rounded-full text-[8px] font-bold text-black flex items-center justify-center">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === "info" && (
                  <InfoTab event={localEvent} onEventUpdate={handleEventUpdate}
                    saveKey={saveKey} onSaveStateChange={setSaveState} />
                )}
                {activeTab === "roster" && (
                  <RosterTab event={localEvent} roster={roster} onRosterChange={loadRoster} onEventUpdate={handleEventUpdate} />
                )}
                {activeTab === "manage" && (
                  <ManageTab event={localEvent} onEventUpdate={handleEventUpdate}
                    onFinished={() => { setActiveTab("attendance"); setSaveState({ saving: false, saved: false }); }} />
                )}
                {activeTab === "attendance" && (
                  <AttendanceTab event={localEvent} roster={roster} onEventUpdate={handleEventUpdate}
                    saveKey={saveKey} onSaveStateChange={setSaveState} />
                )}
                {activeTab === "danger" && (
                  <DangerTab event={localEvent} roster={roster} onEventCancel={onEventCancel} />
                )}
              </div>
            </div>
          )}
        </motion.div>
      </>
    </AnimatePresence>
  );
}
