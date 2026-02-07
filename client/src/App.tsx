import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LobbyPage from "./pages/LobbyPage";

function App() {
  return (
    <Router>
      <Routes>
        {/* Route 1: Landing Page (No Sidebar) */}
        <Route path="/" element={<HomePage />} />

        {/* Route 2: The Game App (Has Sidebar) */}
        <Route path="/lobby" element={<LobbyPage />} />
        
        {/* You can add more app pages here later, e.g.: */}
        {/* <Route path="/profile" element={<ProfilePage />} /> */}
      </Routes>
    </Router>
  );
}

export default App;