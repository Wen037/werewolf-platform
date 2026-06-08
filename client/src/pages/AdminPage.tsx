import { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { AuthService } from "../services/auth.service";
import { GameService } from "../services/game.service";
import { api } from "../services/api";
import type { GameVenueDTO } from "../types";
import { useLang } from "../context/LanguageContext";
import { ShieldCheck, CheckCircle2, XCircle, Coins, Construction, ArrowRightLeft } from "lucide-react";

// ── Section: Venue verification queue ─────────────────────────────────────
function VenueVerificationSection() {
  const { t } = useLang();
  const [venues, setVenues] = useState<GameVenueDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    GameService.getAllVenues()
      .then(all => setVenues(all.filter(v => !v.isVerified)))
      .catch(() => setNotice(t("Failed to load venues.")))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const decide = async (id: string, approved: boolean) => {
    setBusyId(id);
    setNotice(null);
    try {
      await api.patch(`/admin/venues/${id}/verify`, { approved });
      setNotice(approved ? t("Venue approved.") : t("Venue rejected."));
      load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : t("Action failed."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-neutral-900/60 border border-white/10 rounded-2xl p-5">
      <h2 className="text-white font-bold flex items-center gap-2 mb-3">
        <ShieldCheck size={18} className="text-amber-400" />
        {t("Venue Verification Queue")}
      </h2>
      {notice && <p className="text-xs text-amber-300 mb-2">{notice}</p>}
      {loading ? (
        <p className="text-neutral-500 text-sm">{t("Loading…")}</p>
      ) : venues.length === 0 ? (
        <p className="text-neutral-500 text-sm">{t("No venues awaiting verification.")}</p>
      ) : (
        <ul className="space-y-2">
          {venues.map(v => (
            <li key={v.id} className="flex items-center justify-between gap-3 bg-white/5 rounded-xl px-4 py-3">
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{v.name}</p>
                <p className="text-neutral-400 text-xs truncate">{v.address}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  disabled={busyId === v.id}
                  onClick={() => decide(v.id, true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 size={14} /> {t("Approve")}
                </button>
                <button
                  disabled={busyId === v.id}
                  onClick={() => decide(v.id, false)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <XCircle size={14} /> {t("Reject")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Section: Transfer venue ownership ──────────────────────────────────────
// For when an admin creates a space on behalf of a friend (before they have
// an account) and later wants to hand the listing over once they register.
function TransferOwnershipSection() {
  const { t } = useLang();
  const user = AuthService.getCurrentUser();
  const [venues, setVenues] = useState<GameVenueDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    GameService.getAllVenues()
      .then(all => setVenues(all.filter(v => v.ownerId === user?.id)))
      .catch(() => setNotice(t("Failed to load venues.")))
      .finally(() => setLoading(false));
  }, [t, user?.id]);

  useEffect(() => { load(); }, [load]);

  const transfer = async (id: string) => {
    const email = (emails[id] ?? "").trim();
    if (!email) {
      setNotice(t("Enter the new owner's registered email."));
      return;
    }
    setBusyId(id);
    setNotice(null);
    try {
      await api.patch(`/admin/venues/${id}/transfer-owner`, { newOwnerEmail: email });
      setNotice(t("Ownership transferred."));
      setEmails(prev => ({ ...prev, [id]: "" }));
      load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : t("Action failed."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-neutral-900/60 border border-white/10 rounded-2xl p-5">
      <h2 className="text-white font-bold flex items-center gap-2 mb-3">
        <ArrowRightLeft size={18} className="text-amber-400" />
        {t("Transfer Space Ownership")}
      </h2>
      <p className="text-neutral-400 text-xs mb-3">
        {t("Hand over a space you created (e.g. on behalf of a friend) to its real owner once they've registered an account — enter their registered email.")}
      </p>
      {notice && <p className="text-xs text-amber-300 mb-2">{notice}</p>}
      {loading ? (
        <p className="text-neutral-500 text-sm">{t("Loading…")}</p>
      ) : venues.length === 0 ? (
        <p className="text-neutral-500 text-sm">{t("You don't own any spaces.")}</p>
      ) : (
        <ul className="space-y-2">
          {venues.map(v => (
            <li key={v.id} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white/5 rounded-xl px-4 py-3">
              <div className="min-w-0 sm:w-44 shrink-0">
                <p className="text-white text-sm font-medium truncate">{v.name}</p>
                <p className="text-neutral-400 text-xs truncate">{v.address}</p>
              </div>
              <input
                value={emails[v.id] ?? ""}
                onChange={e => setEmails(prev => ({ ...prev, [v.id]: e.target.value }))}
                placeholder={t("New owner's email")}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-400/50"
              />
              <button
                disabled={busyId === v.id}
                onClick={() => transfer(v.id)}
                className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 text-xs font-semibold transition-colors disabled:opacity-50 shrink-0"
              >
                <ArrowRightLeft size={14} /> {t("Transfer")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Section: Adjust user credit score ─────────────────────────────────────
function CreditAdjustSection() {
  const { t } = useLang();
  const [userId, setUserId] = useState("");
  const [delta, setDelta] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async () => {
    const d = Number(delta);
    if (!userId.trim() || !Number.isFinite(d) || d === 0) {
      setNotice(t("Enter a valid user ID or email and a non-zero amount."));
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const res = await api.patch<{ creditScore: number }>(`/admin/users/${userId.trim()}/credit`, { delta: d });
      setNotice(t("Updated. New credit score:") + ` ${res.creditScore}`);
      setDelta("");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : t("Action failed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-neutral-900/60 border border-white/10 rounded-2xl p-5">
      <h2 className="text-white font-bold flex items-center gap-2 mb-3">
        <Coins size={18} className="text-amber-400" />
        {t("Adjust User Credit Score")}
      </h2>
      <p className="text-neutral-400 text-xs mb-3">
        {t("Enter the target user's ID or email, and a delta (positive to add, negative to subtract).")}
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={userId}
          onChange={e => setUserId(e.target.value)}
          placeholder={t("User ID or email")}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-400/50"
        />
        <input
          value={delta}
          onChange={e => setDelta(e.target.value)}
          placeholder={t("Delta (e.g. -1 or 0.5)")}
          className="sm:w-44 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-400/50"
        />
        <button
          disabled={busy}
          onClick={submit}
          className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {t("Apply")}
        </button>
      </div>
      {notice && <p className="text-xs text-amber-300 mt-2">{notice}</p>}
    </div>
  );
}

// ── Section: Roadmap of admin features still pending backend work ─────────
function ComingSoonSection() {
  const { t } = useLang();
  const items = [
    t("Reset another user's password"),
    t("Ban / suspend a user account"),
    t("Search and list all users"),
    t("Review and resolve user reports"),
    t("Force-cancel any event or remove any venue"),
  ];
  return (
    <div className="bg-neutral-900/60 border border-white/10 rounded-2xl p-5">
      <h2 className="text-white font-bold flex items-center gap-2 mb-3">
        <Construction size={18} className="text-neutral-400" />
        {t("Coming Soon")}
      </h2>
      <ul className="space-y-1.5">
        {items.map(i => (
          <li key={i} className="text-neutral-400 text-sm flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-600 shrink-0" />
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminPage() {
  const { t } = useLang();
  const user = AuthService.getCurrentUser();
  const isAdmin = user?.role === "admin" || user?.role === "web_admin";

  if (!AuthService.isLoggedIn() || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        <div>
          <h1 className="text-white text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="text-amber-400" />
            {t("Admin Control Panel")}
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            {t("Manage venues and user accounts. Logged in as")} <span className="text-amber-300 font-medium">{user?.username}</span>.
          </p>
        </div>

        <VenueVerificationSection />
        <TransferOwnershipSection />
        <CreditAdjustSection />
        <ComingSoonSection />
      </div>
    </AppLayout>
  );
}
