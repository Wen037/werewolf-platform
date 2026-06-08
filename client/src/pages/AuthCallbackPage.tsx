import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthService } from "../services/auth.service";

/**
 * Lands here after a successful OAuth redirect from the backend
 * (e.g. /api/auth/google/callback -> ${FRONTEND_URL}/auth/callback?token=...).
 * Stores the JWT, fetches the current user, then redirects home.
 */
export default function AuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    localStorage.setItem("token", token);

    AuthService.fetchCurrentUser()
      .then(() => {
        window.location.href = "/";
      })
      .catch(() => {
        window.location.href = "/";
      });
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
      <p className="text-neutral-400 text-sm">Signing you in…</p>
    </div>
  );
}
