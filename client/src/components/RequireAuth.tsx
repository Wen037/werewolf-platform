import { Navigate, useLocation } from "react-router-dom";
import { AuthService } from "../services/auth.service";

/**
 * Route guard for pages that should never be reachable by guests
 * (My Events, My Profile, Admin, ...). Guests can freely browse the
 * lobby/map/space/event "view" pages and like/create actions are gated
 * inline (see useAuthGate); this component handles the page-level cases
 * where the entire page only makes sense for a logged-in user.
 *
 * Redirects to "/" (home), which has the Login/Register entry points,
 * preserving the attempted location so a future "redirect after login"
 * flow could send the user back here.
 */
export function RequireAuth({ children }: { children: React.ReactElement }) {
  const location = useLocation();
  if (!AuthService.isLoggedIn()) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }
  return children;
}
