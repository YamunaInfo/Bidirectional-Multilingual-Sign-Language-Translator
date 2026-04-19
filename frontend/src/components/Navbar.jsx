import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LogOut, User, Sparkles } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (location.pathname === '/login') return null;

  return (
    <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <Link to="/dashboard" className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#6366f1] rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <span className="text-xl font-bold text-[#4F46E5] tracking-tight">
          Bidirectional Sign Language Translator
        </span>
      </Link>

      <div className="flex items-center gap-4">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium transition-colors px-4 py-2"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
        
        <Link 
          to="/profile"
          className="flex items-center gap-2 bg-[#F3E8FF] text-[#9333EA] hover:bg-[#E9D5FF] px-5 py-2.5 rounded-2xl font-bold transition-all"
        >
          <User className="w-5 h-5" />
          <span>Profile</span>
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
