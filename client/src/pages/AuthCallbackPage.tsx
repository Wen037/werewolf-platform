import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthService } from "../services/auth.service";
import { GameService } from "../services/game.service";
import type { User } from "../types";

/**
 * Lands here after a successful OAuth redirect from the backend
 * (e.g. /api/auth/google/callback -> ${FRONTEND_URL}/auth/callback?token=...&isNew=1).
 * Stores the JWT, fetches the current user, then either:
 *   - redirects home immediately (returning user), or
 *   - shows a one-time "pick your nickname" prompt (brand-new Google sign-up),
 *     since the backend auto-generates a username from the Google profile name.
 */
export default function AuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [stage, setStage] = useState<"loading" | "nickname" | "error">("loading");
  const [user, setUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = params.get("token");
    const isNew = params.get("isNew") === "1";

    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    localStorage.setItem("token", token);

    AuthService.fetchCurrentUser()
      .then((u) => {
        if (isNew) {
          setUser(u);
          setNickname(u.username ?? "");
          setStage("nickname");
        } else {
          window.location.href = "/";
        }
      })
      .catch(() => {
        window.location.href = "/";
      });
  }, [params, navigate]);

  const finish = () => {
    window.location.href = "/";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (trimmed.length < 3) {
      setError("Nickname must be at least 3 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setError("Letters, numbers, and underscores only.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await GameService.updateUsername(trimmed);
      finish();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save nickname. Please try again.";
      setError(message);
      setSubmitting(false);
    }
  };

  if (stage === "nickname") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white px-4">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col gap-4 shadow-2xl"
        >
          <div>
            <h1 className="text-lg font-bold">Welcome{user?.username ? `, ${user.username}` : ""}!</h1>
            <p className="text-sm text-neutral-400 mt-1">
              Pick a nickname for your Werewolf SG account. You can change this later in your profile.
            </p>
          </div>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Your nickname"
            maxLength={30}
            autoFocus
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-red-500"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={finish}
              className="px-4 py-2 rounded-lg text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Skip for now
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white transition-colors"
            >
              {submitting ? "Saving…" : "Continue"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
      <p className="text-neutral-400 text-sm">{stage === "error" ? "Something went wrong. Redirecting…" : "Signing you in…"}</p>
    </div>
  );
}
