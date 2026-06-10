import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { GameService } from "../services/game.service";
import { AuthService } from "../services/auth.service";
import { getCreditInfo, getUsernameColor } from "../types";
import type { UserProfileDTO } from "../types";
import { MOCK_SESSION_INTERACTIONS, MOCK_GAMES } from "../data/mockDB"; // fallback for mock mode
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, UserPlus, UserCheck, Shield, Trophy, Star, Calendar, BadgeCheck,
} from "lucide-react";
import { useLang } from "../context/LanguageContext";
import { ReportModal } from "../components/ReportModal";
import { IconAlertTriangle } from "@tabler/icons-react";

const PROFICIENCY_STYLES: Record<string, string> = {
  "All Welcome":  "bg-green-500/15 text-green-400 border-green-500/25",
  "Newbie":       "bg-sky-500/15 text-sky-400 border-sky-500/25",
  "Intermediate": "bg-amber-500/15 text-amber-400 border-amber-500/25",
  "Advanced":     "bg-orange-500/15 text-orange-400 border-orange-500/25",
  "Expert":       "bg-red-500/15 text-red-400 border-red-500/25",
};

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLang();
  const [profile, setProfile] = useState<UserProfileDTO | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [loading, setLoading] = useState(true);

  const currentUser = AuthService.getCurrentUser();
  const isOwnProfile = currentUser?.id === id;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    GameService.getPublicProfile(id)
      .then(p => {
        setProfile(p);
        setIsFollowing(p.isFollowedByMe);
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleFollow = async () => {
    if (!id || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await GameService.unfollowUser(id);
        setIsFollowing(false);
      } else {
        await GameService.followUser(id);
        setIsFollowing(true);
      }
    } finally {
      setFollowLoading(false);
    }
  };

  // Use real stats from API; fall back to mock data for dev/preview
  const gamesAttended = profile?.eventsAttended ?? MOCK_SESSION_INTERACTIONS.filter(i => i.userId === id && i.status === "attended").length;
  const gamesHosted   = profile?.eventsHosted   ?? MOCK_GAMES.filter(g => g.hostId === id && g.status === "finished").length;
  const noshows       = profile?.noshows ?? 0;
  const completionRate = (gamesAttended + noshows) > 0 ? Math.round((gamesAttended / (gamesAttended + noshows)) * 100) : 0;

  // Recent past events — from API if available, else fall through to empty
  const recentEvents = profile?.recentSessions ?? [];

  if (loading) {
    return (
      <AppLayout>
        <div className="h-full flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout>
        <div className="h-full flex flex-col items-center justify-center gap-4 text-neutral-400">
          <Shield size={48} className="opacity-30" />
          <p className="text-lg font-semibold">User not found</p>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-neutral-500 hover:text-white transition-colors">
            <ArrowLeft size={16} /> Go back
          </button>
        </div>
      </AppLayout>
    );
  }

  const ci = getCreditInfo(profile.creditScore ?? 100);

  return (
    <AppLayout>
      <div className="h-full w-full overflow-y-auto">
        {/* Toast */}
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: 50, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 20, x: "-50%" }}
              className="fixed bottom-10 left-1/2 z-[200] flex items-center gap-2 px-6 py-3 bg-neutral-900 border border-green-500/30 rounded-full shadow-2xl"
            >
              <span className="text-white font-bold text-sm">Report submitted</span>
            </motion.div>
          )}
        </AnimatePresence>

        <ReportModal
          isOpen={reportOpen}
          onClose={() => setReportOpen(false)}
          onSuccess={() => { setReportOpen(false); setShowToast(true); setTimeout(() => setShowToast(false), 3000); }}
          targetType="User"
          targetName={profile.username}
        />

        {/* Hero band */}
        <div className={`w-full h-32 ${ci.barColor} opacity-70`} />

        <div className="max-w-2xl mx-auto px-6 pb-20 -mt-16 relative">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="absolute top-0 left-6 flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors bg-neutral-900/80 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-sm"
          >
            <ArrowLeft size={14} /> Back
          </button>

          {/* Avatar + header */}
          <div className="bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden mt-6">
            <div className="p-6">
              <div className="flex items-end justify-between gap-4 mb-5">
                <div className="flex items-end gap-4">
                  <img
                    src={profile.avatarUrl || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                    alt={profile.username}
                    className={`w-20 h-20 rounded-full border-4 ${ci.borderClass} object-cover shadow-lg shrink-0`}
                  />
                  <div className="mb-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h1 className={`text-2xl font-bold ${getUsernameColor(profile)}`}>{profile.username}</h1>
                      {profile.isVerified && (
                        <BadgeCheck size={18} className="text-green-400 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${ci.bgColor} ${ci.color}`}>
                        {ci.label}
                      </span>
                      {profile.role === "web_admin" && (
                        <span className="text-[11px] font-bold text-yellow-400 uppercase tracking-wider">Admin</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {!isOwnProfile && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setReportOpen(true)}
                      className="p-2 rounded-full text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                      title="Report player"
                    >
                      <IconAlertTriangle size={18} />
                    </button>
                    <button
                      onClick={handleFollow}
                      disabled={followLoading}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                        isFollowing
                          ? "bg-white/10 border border-white/20 text-neutral-300 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400"
                          : "bg-red-600 hover:bg-red-500 text-white shadow-lg"
                      }`}
                    >
                      {isFollowing ? <UserCheck size={15} /> : <UserPlus size={15} />}
                      {isFollowing ? "Following" : "Follow"}
                    </button>
                  </div>
                )}
                {isOwnProfile && (
                  <button
                    onClick={() => navigate("/myprofile")}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 transition-all"
                  >
                    Edit Profile
                  </button>
                )}
              </div>

              {profile.bio && (
                <p className="text-neutral-400 text-sm leading-relaxed border-l-2 border-white/10 pl-3 mb-5">
                  {profile.bio}
                </p>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-neutral-800/50 rounded-xl p-3 text-center border border-white/5">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Trophy size={14} className="text-yellow-400" />
                    <span className="text-white font-bold text-lg">{gamesAttended}</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Games Played</div>
                </div>
                <div className="bg-neutral-800/50 rounded-xl p-3 text-center border border-white/5">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Star size={14} className="text-red-400" />
                    <span className="text-white font-bold text-lg">{gamesHosted}</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Hosted</div>
                </div>
                <div className="bg-neutral-800/50 rounded-xl p-3 text-center border border-white/5">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <span className={`font-bold text-lg ${completionRate >= 90 ? "text-green-400" : completionRate >= 70 ? "text-amber-400" : "text-red-400"}`}>
                      {completionRate}%
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Completion</div>
                </div>
                <div className="bg-neutral-800/50 rounded-xl p-3 text-center border border-white/5">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <span className={`font-bold text-sm ${ci.color}`}>
                      {profile.skillLevel || "—"}
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Skill</div>
                </div>
              </div>
            </div>
          </div>

          {/* Social stats */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-neutral-900/60 border border-white/8 rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{profile.followersCount ?? 0}</div>
              <div className="text-xs text-neutral-500 uppercase tracking-wider mt-0.5">Followers</div>
            </div>
            <div className="bg-neutral-900/60 border border-white/8 rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{profile.followingCount ?? 0}</div>
              <div className="text-xs text-neutral-500 uppercase tracking-wider mt-0.5">Following</div>
            </div>
          </div>

          {/* Recent game history */}
          {recentEvents.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Calendar size={14} /> Recent Games
              </h2>
              <div className="space-y-2">
                {recentEvents.map(event => {
                  const prof = event.proficiency;
                  const profCls = prof ? (PROFICIENCY_STYLES[prof] ?? "bg-neutral-700/60 text-neutral-400 border-white/10") : "";
                  const d = new Date(event.date);
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-neutral-900/60 border border-white/8 rounded-xl p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/5 transition-colors"
                      onClick={() => navigate(`/event/${event.id}`)}
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-white text-sm truncate">{event.title}</div>
                        <div className="text-xs text-neutral-500 mt-0.5">
                          {d.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}
                          {event.venueName && <span className="text-neutral-400"> · {event.venueName}</span>}
                        </div>
                      </div>
                      {prof && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${profCls}`}>
                          {prof.toUpperCase()}
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {recentEvents.length === 0 && (
            <div className="mt-6 text-center py-10 text-neutral-600">
              <Trophy size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t("No game history yet")}</p>
            </div>
          )}

          {/* Owned spaces */}
          {profile.ownedVenues && profile.ownedVenues.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Shield size={14} /> {t("Spaces")}
              </h2>
              <div className="space-y-2">
                {profile.ownedVenues.map(venue => (
                  <motion.div
                    key={venue.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-neutral-900/60 border border-white/8 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => navigate(`/gamespace/${venue.id}`)}
                  >
                    {venue.imageUrl ? (
                      <img src={venue.imageUrl} alt={venue.name} className="w-10 h-10 rounded-lg object-cover shrink-0 bg-neutral-700" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-neutral-800 border border-white/10 flex items-center justify-center shrink-0">
                        <Shield size={18} className="text-neutral-500" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold text-white text-sm truncate">{venue.name}</div>
                      <div className="text-xs text-neutral-500 truncate">{venue.address}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
