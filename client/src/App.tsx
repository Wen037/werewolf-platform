import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LobbyPage from "./pages/LobbyPage";
import GameSpacePage from './pages/GameSpacePage';
import VenueDetailPage from './pages/VenueDetailPage';
import MyEventsPage from './pages/MyEventsPage';
import MyProfilePage from './pages/MyProfilePage';
import EventDetailPage from './pages/EventDetailPage';
import PublicProfilePage from './pages/PublicProfilePage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import AdminPage from './pages/AdminPage';
import { RequireAuth } from './components/RequireAuth';
import PrivacyPage from './pages/PrivacyPage';
import { LanguageProvider } from './context/LanguageContext';

function App() {
  return (
    <LanguageProvider>
    <Router>
      <Routes>
        {/* Route 1: Landing Page (No Sidebar) */}
        <Route path="/" element={<HomePage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Route 2: The Game App (Has Sidebar) */}
        {/* Guests can freely VIEW the lobby/map, spaces, and events — no guard here */}
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="/gamespace" element={<GameSpacePage />} />
        <Route path="/gamespace/:id" element={<VenueDetailPage />} />
        <Route path="/event/:id" element={<EventDetailPage />} />
        <Route path="/user/:id" element={<PublicProfilePage />} />

        {/* Account-only pages — guests are redirected home (login/register entry point) */}
        <Route path="/myevents" element={<RequireAuth><MyEventsPage /></RequireAuth>} />
        <Route path="/myprofile" element={<RequireAuth><MyProfilePage /></RequireAuth>} />
        <Route path="/admin" element={<RequireAuth><AdminPage /></RequireAuth>} />
      </Routes>
    </Router>
    </LanguageProvider>
  );
}

export default App;