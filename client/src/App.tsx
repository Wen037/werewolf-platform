import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage'; // Import it

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Route "/" goes to HomePage now */}
        <Route path="/" element={<HomePage />} />
        
        
        {/* Placeholder for Game Dashboard */}
        <Route path="/game" element={<div className="text-white p-10">Game Dashboard (Coming Soon)</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;