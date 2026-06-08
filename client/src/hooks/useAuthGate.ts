import { useState } from "react";
import { AuthService } from "../services/auth.service";

/**
 * Shared guard for actions that require a logged-in user (like, subscribe,
 * rate, join, create space/event, etc.). Guests can freely VIEW spaces and
 * events, but any write action should prompt them to log in instead of
 * silently failing (optimistic UI updates that revert) or hitting a 401.
 *
 * Usage:
 *   const { isAuthOpen, setAuthOpen, requireAuth } = useAuthGate();
 *   <AuthModal isOpen={isAuthOpen} onClose={() => setAuthOpen(false)} initialView="login" />
 *   const handleLike = () => { if (!requireAuth()) return; ... };
 */
export function useAuthGate() {
  const [isAuthOpen, setAuthOpen] = useState(false);

  const requireAuth = (): boolean => {
    if (!AuthService.isLoggedIn()) {
      setAuthOpen(true);
      return false;
    }
    return true;
  };

  return { isAuthOpen, setAuthOpen, requireAuth };
}
