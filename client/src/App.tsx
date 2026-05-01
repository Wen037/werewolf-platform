import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LobbyPage from "./pages/LobbyPage";
import GameSpacePage from './pages/GameSpacePage';
import VenueDetailPage from './pages/VenueDetailPage';
import MyEventsPage from './pages/MyEventsPage';
import MyProfilePage from './pages/MyProfilePage';
import EventDetailPage from './pages/EventDetailPage';
import { LanguageProvider } from './context/LanguageContext';

function App() {
  return (
    <LanguageProvider>
    <Router>
      <Routes>
        {/* Route 1: Landing Page (No Sidebar) */}
        <Route path="/" element={<HomePage />} />

        {/* Route 2: The Game App (Has Sidebar) */}
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="/gamespace" element={<GameSpacePage />} />
        <Route path="/gamespace/:id" element={<VenueDetailPage />} />
        <Route path="/myevents" element={<MyEventsPage />} />
        <Route path="/myprofile" element={<MyProfilePage />} />
        <Route path="/event/:id" element={<EventDetailPage />} />
      </Routes>
    </Router>
    </LanguageProvider>
  );
}

export default App;