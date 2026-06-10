import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import { GameService } from "../services/game.service";
import { AuthService } from "../services/auth.service";
import type { EventComment, GameSessionDTO } from "../types";
import { AppLayout } from "../components/layout/AppLayout";
import { AuthModal } from "../components/AuthModal";
import { useAuthGate } from "../hooks/useAuthGate";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle } from "lucide-react";
import {
  IconArrowLeft,
  IconClock,
  IconMapPin,
  IconUsers,
  IconUser,
  IconStar,
  IconCalendarEvent,
  IconShare,
  IconBrandTelegram,
  IconBrandWhatsapp,
  IconCopy,
  IconCheck,
  IconMessageCircle,
  IconTrash,
  IconPencil,
  IconFileText,
} from "@tabler/icons-react";

function generateIcs(event: GameSessionDTO): string {
  const start = new Date(event.date);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const loc = [event.venueName, event.venueAddress].filter(Boolean).join(", ");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Werewolf SG//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}@werewolf.sg`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description ?? "Werewolf game in Singapore"}`,
    `LOCATION:${loc}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}

function googleCalUrl(event: GameSessionDTO): string {
  const start = new Date(event.date);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const loc = [event.venueName, event.venueAddress].filter(Boolean).join(", ");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: (event.description ?? "") + `\n\nJoin: ${window.location.href}`,
    location: loc,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function formatEventDate(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-SG", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) +
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

type JoinState = "idle" | "joining" | "joined" | "pending";

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLang();
  const { isAuthOpen, setAuthOpen, requireAuth } = useAuthGate();

  const [event, setEvent] = useState<GameSessionDTO | null>(null);
  const [joinState, setJoinState] = useState<JoinState>("idle");
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // Comments
  const [comments, setComments] = useState<EventComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Recap editor (host only, after event Completed)
  const [recapText, setRecapText] = useState("");
  const [recapEditing, setRecapEditing] = useState(false);
  const [recapSaving, setRecapSaving] = useState(false);

  // Share copy-link feedback
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) return;
    GameService.getGameById(id).then(data => {
      if (data) {
        setEvent(data);
        const status = data.myInteraction?.status;
        if (status === "registered" || status === "attended") setJoinState("joined");
        else if (status === "pending") setJoinState("pending");
        setRecapText(data.recap?.text ?? "");
      }
    });
    GameService.getComments(id).then(setComments).catch(() => {});
  }, [id]);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleJoin = async () => {
    if (!requireAuth()) return;
    if (!event || !id) return;
    if (joinState === "joined" || joinState === "pending" || joinState === "joining") return;
    setJoinState("joining");
    try {
      const result = await GameService.joinGame(id);
      const next: JoinState = result.wasWaitlisted ? "pending" : "joined";
      setJoinState(next);
      setEvent(e => e ? {
        ...e,
        currentPlayers: result.wasWaitlisted ? e.currentPlayers : e.currentPlayers + 1,
        myInteraction: {
          userId: e.myInteraction?.userId ?? "",
          sessionId: id,
          isLiked: e.myInteraction?.isLiked ?? false,
          status: result.wasWaitlisted ? "pending" : "registered",
        },
      } : e);
      triggerToast(result.wasWaitlisted ? t("Applied — waiting for host approval") : t("Joined successfully!"));
    } catch {
      setJoinState("idle");
      triggerToast(t("Failed to join. Please try again."));
    }
  };

  const currentUser = AuthService.getCurrentUser();
  const isHost = !!(event && currentUser && event.hostId === currentUser.id);
  const isLoggedIn = !!currentUser;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadIcs = () => {
    if (!event) return;
    const blob = new Blob([generateIcs(event)], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.title.replace(/[^a-z0-9]/gi, "_")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddComment = async () => {
    if (!requireAuth()) return;
    if (!id || !commentText.trim()) return;
    setCommentSubmitting(true);
    try {
      const newComment = await GameService.addComment(id, commentText.trim());
      setComments(prev => [...prev, newComment]);
      setCommentText("");
    } catch {
      triggerToast(t("Failed to post comment."));
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!id) return;
    try {
      await GameService.deleteComment(id, commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch {
      triggerToast(t("Failed to delete comment."));
    }
  };

  const handleSaveRecap = async () => {
    if (!id) return;
    setRecapSaving(true);
    try {
      await GameService.updateRecap(id, recapText);
      setEvent(e => e ? { ...e, recap: { text: recapText } } : e);
      setRecapEditing(false);
      triggerToast(t("Recap saved."));
    } catch {
      triggerToast(t("Failed to save recap."));
    } finally {
      setRecapSaving(false);
    }
  };

  const isFull = event ? event.currentPlayers >= event.maxPlayers : false;

  const joinLabel = () => {
    if (joinState === "joining") return t("Joining...");
    if (joinState === "joined") return t("Joined");
    if (joinState === "pending") return t("Pending Approval");
    if (isFull) return t("Event Full");
    if (event?.approvalMode === "approval") return t("Apply to Join");
    return t("Join Game");
  };

  const joinDisabled = joinState !== "idle" || isFull;

  const joinBtnCls = () => {
    if (joinState === "joined") return "bg-green-600 text-white cursor-default";
    if (joinState === "pending") return "bg-amber-500/20 border border-amber-500/40 text-amber-300 cursor-default";
    if (isFull) return "bg-neutral-800 text-neutral-600 cursor-not-allowed";
    return "bg-red-600 hover:bg-red-500 text-white active:scale-[0.98]";
  };

  if (!event) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-neutral-400">{t("Loading...")}</p>
        </div>
      </AppLayout>
    );
  }

  const proficiencyCls = event.proficiency
    ? PROFICIENCY_STYLES[event.proficiency] ?? "bg-neutral-700/60 text-neutral-400 border-white/10"
    : null;

  return (
    <AppLayout>
      <div className="h-full w-full overflow-y-auto p-6 md:p-10 custom-scrollbar relative">

        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
              className="fixed top-24 left-10 z-[200] flex items-center gap-2 px-6 py-3 bg-neutral-900 border border-green-500/30 rounded-full shadow-2xl backdrop-blur-md"
            >
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-white font-bold text-sm tracking-wide">{toastMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors group mb-6"
        >
          <IconArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">{t("Back")}</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">

          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Hero image */}
            <div className="w-full h-64 md:h-80 rounded-3xl overflow-hidden relative shadow-2xl border border-white/5">
              <img
                src={event.venueImageUrl || "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800"}
                alt={event.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

              <div className="absolute bottom-6 left-6 md:left-8">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-[11px] font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-full">
                    RECRUITING
                  </span>
                  {proficiencyCls && (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${proficiencyCls}`}>
                      {event.proficiency?.toUpperCase()}
                    </span>
                  )}
                  {event.approvalMode === "approval" && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/25 text-sky-300">
                      HOST APPROVAL
                    </span>
                  )}
                  {event.venueApprovalStatus === "pending" && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-300">
                      ● {t("Contact space owner to confirm")}
                    </span>
                  )}
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">{event.title}</h1>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4">

              <div className="bg-white/5 border border-white/8 rounded-2xl p-5 flex items-center gap-4">
                <div className="bg-black/40 p-3 rounded-xl">
                  <IconClock size={20} className="text-yellow-400" />
                </div>
                <div>
                  <div className="text-xs text-neutral-300 uppercase tracking-wider mb-0.5">{t("Game Time")}</div>
                  <div className="text-white font-bold">{formatEventDate(event.date)}</div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/8 rounded-2xl p-5 flex items-center gap-4">
                <div className="bg-black/40 p-3 rounded-xl">
                  <IconMapPin size={20} className="text-red-400" />
                </div>
                <div>
                  <div className="text-xs text-neutral-300 uppercase tracking-wider mb-0.5">{t("Venue")}</div>
                  <div className="text-white font-bold">{event.venueName || t("TBA")}</div>
                  {event.venueAddress && (
                    <div className="text-neutral-400 text-xs mt-0.5">{event.venueAddress}</div>
                  )}
                </div>
              </div>

              <button
                className="w-full text-left bg-white/5 border border-white/8 rounded-2xl p-5 flex items-center gap-4 hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => event.hostId && navigate(`/user/${event.hostId}`)}
              >
                <div className="bg-black/40 p-3 rounded-xl">
                  <IconUser size={20} className="text-neutral-300" />
                </div>
                <div>
                  <div className="text-xs text-neutral-300 uppercase tracking-wider mb-0.5">{t("Host")}</div>
                  <div className="text-white font-bold">{event.hostName || t("Unknown")}</div>
                  {event.hostId && (
                    <div className="text-xs text-blue-400 mt-0.5">{t("View Profile")}</div>
                  )}
                </div>
              </button>

              {event.description && (
                <div className="bg-white/5 border border-white/8 rounded-2xl p-5">
                  <div className="text-xs text-neutral-300 uppercase tracking-wider mb-2">{t("About this Event")}</div>
                  <p className="text-neutral-200 text-sm leading-relaxed">{event.description}</p>
                </div>
              )}

              {/* Players */}
              <div className="bg-white/5 border border-white/8 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                    <IconUsers size={13} /> {t("Players")}
                  </div>
                  <span className={`text-sm font-bold ${isFull ? "text-yellow-400" : "text-white"}`}>
                    {event.currentPlayers} / {event.maxPlayers}
                  </span>
                </div>

                <div className="w-full bg-neutral-800 rounded-full h-1.5 mb-4">
                  <div
                    className={`h-1.5 rounded-full transition-all ${isFull ? "bg-yellow-500" : "bg-red-500"}`}
                    style={{ width: `${Math.min((event.currentPlayers / event.maxPlayers) * 100, 100)}%` }}
                  />
                </div>

                {event.joinedPlayerAvatars && event.joinedPlayerAvatars.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {event.joinedPlayerAvatars.slice(0, 8).map((url, i) => {
                        const uid = event.joinedPlayerIds?.[i];
                        return uid ? (
                          <button key={i} onClick={() => navigate(`/user/${uid}`)} title={t("View Profile")}
                            className="h-8 w-8 rounded-full border-2 border-neutral-900 bg-neutral-700 overflow-hidden hover:ring-2 hover:ring-red-500 hover:z-10 transition-all flex-shrink-0">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </button>
                        ) : (
                          <img key={i} src={url} alt="" className="h-8 w-8 rounded-full border-2 border-neutral-900 object-cover bg-neutral-700" />
                        );
                      })}
                    </div>
                    {event.currentPlayers > 8 && (
                      <span className="text-xs text-neutral-500 ml-1">+{event.currentPlayers - 8} more</span>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Post-event recap */}
            {event.status === "finished" && (
              <div className="bg-white/5 border border-white/8 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                    <IconFileText size={13} /> {t("Event Recap")}
                  </div>
                  {isHost && !recapEditing && (
                    <button
                      onClick={() => setRecapEditing(true)}
                      className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors"
                    >
                      <IconPencil size={12} /> {t("Edit")}
                    </button>
                  )}
                </div>

                {recapEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={recapText}
                      onChange={e => setRecapText(e.target.value)}
                      rows={4}
                      maxLength={2000}
                      placeholder={t("Write a recap for this event...")}
                      className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-red-500/50 resize-none placeholder:text-neutral-600"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => setRecapEditing(false)} className="text-xs text-neutral-500 hover:text-white px-3 py-1.5">
                        {t("Cancel")}
                      </button>
                      <button
                        onClick={handleSaveRecap}
                        disabled={recapSaving}
                        className="text-xs bg-red-600 hover:bg-red-500 text-white px-4 py-1.5 rounded-lg disabled:opacity-50"
                      >
                        {recapSaving ? t("Saving...") : t("Save")}
                      </button>
                    </div>
                  </div>
                ) : event.recap?.text ? (
                  <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">{event.recap.text}</p>
                ) : (
                  <p className="text-sm text-neutral-500 italic">
                    {isHost ? t("No recap yet. Click Edit to add one.") : t("No recap posted yet.")}
                  </p>
                )}
              </div>
            )}

            {/* Comments / Q&A */}
            <div className="bg-white/5 border border-white/8 rounded-2xl p-5">
              <div className="text-xs text-neutral-300 uppercase tracking-wider flex items-center gap-1.5 mb-4">
                <IconMessageCircle size={13} /> {t("Comments")} {comments.length > 0 && `(${comments.length})`}
              </div>

              {comments.length > 0 ? (
                <div className="space-y-3 mb-4 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                  {comments.map(c => (
                    <div key={c.id} className="flex gap-3 group">
                      <img
                        src={c.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${c.userId}`}
                        alt=""
                        className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5 bg-neutral-700"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">{c.username}</span>
                          <span className="text-[10px] text-neutral-600">
                            {new Date(c.createdAt).toLocaleDateString("en-SG", { day: "numeric", month: "short" })}
                          </span>
                          {(currentUser?.id === c.userId || isHost) && (
                            <button
                              onClick={() => handleDeleteComment(c.id)}
                              className="opacity-0 group-hover:opacity-100 ml-auto text-neutral-600 hover:text-red-400 transition-all flex-shrink-0"
                            >
                              <IconTrash size={12} />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-neutral-300 mt-0.5 leading-snug">{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-600 italic mb-4">{t("No comments yet. Be the first!")}</p>
              )}

              {isLoggedIn ? (
                <div className="flex gap-2">
                  <input
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleAddComment(); } }}
                    placeholder={t("Add a comment...")}
                    maxLength={500}
                    className="flex-1 bg-black border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50 placeholder:text-neutral-600"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={commentSubmitting || !commentText.trim()}
                    className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white rounded-xl disabled:opacity-40 transition-colors flex-shrink-0"
                  >
                    {t("Post")}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAuthOpen(true)}
                  className="text-sm text-neutral-500 hover:text-white transition-colors"
                >
                  {t("Log in to comment")}
                </button>
              )}
            </div>

          </div>

          {/* Right column */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md sticky top-6 shadow-xl space-y-3">

              <div className="flex items-center gap-2 mb-4">
                <IconCalendarEvent size={20} className="text-red-400" />
                <span className="text-white font-bold">{t("Join this Event")}</span>
              </div>

              {event.approvalMode === "approval" && joinState === "idle" && (
                <p className="text-xs text-neutral-400 bg-sky-500/10 border border-sky-500/20 rounded-xl p-3 mb-2">
                  {t("This event requires host approval. Your application will be reviewed before you're confirmed.")}
                </p>
              )}

              {joinState === "pending" && (
                <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-2">
                  {t("Your application is pending. The host will review it soon.")}
                </p>
              )}

              {joinState === "joined" && (
                <p className="text-xs text-green-300 bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-2">
                  {t("You're in! Check your events for details.")}
                </p>
              )}

              <button
                onClick={handleJoin}
                disabled={joinDisabled}
                className={`w-full py-4 font-bold rounded-2xl text-sm transition-all flex items-center justify-center gap-2 ${joinBtnCls()}`}
              >
                {joinState === "joined" && <IconStar size={18} />}
                {joinLabel()}
              </button>

              <button
                onClick={() => navigate(`/gamespace/${event.venueId}`)}
                className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-2xl border border-white/10 flex items-center justify-center gap-2 transition-all text-sm"
              >
                <IconMapPin size={16} /> {t("View Venue")}
              </button>

              {/* Add to Calendar */}
              <div className="pt-1">
                <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-2">{t("Add to Calendar")}</div>
                <div className="flex gap-2">
                  <a
                    href={googleCalUrl(event)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-xl border border-white/10 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <IconCalendarEvent size={14} /> Google
                  </a>
                  <button
                    onClick={handleDownloadIcs}
                    className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-xl border border-white/10 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <IconCalendarEvent size={14} /> .ics
                  </button>
                </div>
              </div>

              {/* Share */}
              <div className="pt-1">
                <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <IconShare size={11} /> {t("Share")}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-xs font-medium rounded-xl border border-white/10 flex items-center justify-center gap-1.5 transition-all text-white"
                  >
                    {copied ? <><IconCheck size={13} className="text-green-400" /> {t("Copied!")}</> : <><IconCopy size={13} /> {t("Copy Link")}</>}
                  </button>
                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(event.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/25 text-sky-300 rounded-xl flex items-center justify-center transition-all"
                  >
                    <IconBrandTelegram size={16} />
                  </a>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(event.title + " " + window.location.href)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3 bg-green-500/15 hover:bg-green-500/25 border border-green-500/25 text-green-300 rounded-xl flex items-center justify-center transition-all"
                  >
                    <IconBrandWhatsapp size={16} />
                  </a>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
      <AuthModal isOpen={isAuthOpen} onClose={() => setAuthOpen(false)} initialView="login" />
    </AppLayout>
  );
}
