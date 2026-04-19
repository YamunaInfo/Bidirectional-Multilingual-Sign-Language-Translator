import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SignToSpeech from './pages/SignToSpeech';
import SpeechToSign from './pages/SpeechToSign';
import Profile from './pages/Profile';
import Navbar from './components/Navbar';


const AppContent = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div className="h-screen flex flex-col bg-[#F9FAFB] overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden relative">
        <main className="flex-1 overflow-hidden h-full">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/sign-to-speech" element={<SignToSpeech />} />
            <Route path="/speech-to-sign" element={<SpeechToSign />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;

