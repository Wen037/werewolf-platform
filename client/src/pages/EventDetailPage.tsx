import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import { GameService } from "../services/game.service";
import type { GameSessionDTO } from "../types";
import { AppLayout } from "../components/layout/AppLayout";
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
} from "@tabler/icons-react";

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

  const [event, setEvent] = useState<GameSessionDTO | null>(null);
  const [joinState, setJoinState] = useState<JoinState>("idle");
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    if (!id) return;
    GameService.getGameById(id).then(data => {
      if (data) {
        setEvent(data);
        const status = data.myInteraction?.status;
        if (status === "registered" || status === "attended") setJoinState("joined");
        else if (status === "pending") setJoinState("pending");
      }
    });
  }, [id]);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleJoin = async () => {
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
                  <div className="text-xs text-neutral-500 uppercase tracking-wider mb-0.5">{t("Game Time")}</div>
                  <div className="text-white font-bold">{formatEventDate(event.date)}</div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/8 rounded-2xl p-5 flex items-center gap-4">
                <div className="bg-black/40 p-3 rounded-xl">
                  <IconMapPin size={20} className="text-red-400" />
                </div>
                <div>
                  <div className="text-xs text-neutral-500 uppercase tracking-wider mb-0.5">{t("Venue")}</div>
                  <div className="text-white font-bold">{event.venueName || t("TBA")}</div>
                  {event.venueAddress && (
                    <div className="text-neutral-400 text-xs mt-0.5">{event.venueAddress}</div>
                  )}
                </div>
              </div>

              <div className="bg-white/5 border border-white/8 rounded-2xl p-5 flex items-center gap-4">
                <div className="bg-black/40 p-3 rounded-xl">
                  <IconUser size={20} className="text-neutral-300" />
                </div>
                <div>
                  <div className="text-xs text-neutral-500 uppercase tracking-wider mb-0.5">{t("Host")}</div>
                  <div className="text-white font-bold">{event.hostName || t("Unknown")}</div>
                </div>
              </div>

              {event.description && (
                <div className="bg-white/5 border border-white/8 rounded-2xl p-5">
                  <div className="text-xs text-neutral-500 uppercase tracking-wider mb-2">{t("About this Event")}</div>
                  <p className="text-neutral-200 text-sm leading-relaxed">{event.description}</p>
                </div>
              )}

              {/* Players */}
              <div className="bg-white/5 border border-white/8 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
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
                      {event.joinedPlayerAvatars.slice(0, 8).map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt=""
                          className="h-8 w-8 rounded-full border-2 border-neutral-900 object-cover bg-neutral-700"
                        />
                      ))}
                    </div>
                    {event.currentPlayers > 8 && (
                      <span className="text-xs text-neutral-500 ml-1">+{event.currentPlayers - 8} more</span>
                    )}
                  </div>
                )}
              </div>

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

            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
