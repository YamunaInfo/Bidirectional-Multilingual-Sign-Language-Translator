import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Globe, Clock, ChevronRight, Settings, Shield, Bell } from 'lucide-react';
import { signService } from '../services/api';

const Profile = () => {
  const [prefLanguage, setPrefLanguage] = useState('English');
  const [user, setUser] = useState({ name: 'User', email: 'user@example.com' });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState({ name: 'User', email: 'user@example.com' });
  const [notification, setNotification] = useState(null);


  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      setEditedUser(userData);
      fetchHistory(userData.id);
    }
  }, []);

  const handleSave = () => {
    setUser(editedUser);
    localStorage.setItem('user', JSON.stringify(editedUser));
    setIsEditing(false);
    showNotification("Profile updated successfully!");
  };

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };


  const fetchHistory = async (userId) => {
    try {
      const response = await signService.getHistory(userId);
      setHistory(response.data.history || []);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
  };


  return (
    <div className="h-full bg-[#F9FAFB] pt-4 pb-4 px-6 overflow-y-auto">
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 bg-[#111827] text-white px-8 py-4 rounded-2xl shadow-2xl z-50 font-bold"
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col items-center mb-16">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-32 h-32 rounded-full bg-gradient-to-br from-[#6366f1] to-[#a855f7] flex items-center justify-center text-white text-4xl font-extrabold shadow-xl mb-6 border-4 border-white"
          >
            {getInitials(user.name)}
          </motion.div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-bold text-[#111827] mb-2"
          >
            {user.name}
          </motion.h1>
          <p className="text-gray-500 font-medium">Communicating with Impact</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-10">
            {/* Info Card */}
            <section className="bg-white rounded-[32px] p-10 border border-gray-100 shadow-[0_4px_25px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-bold text-[#111827]">Account Details</h2>
                {isEditing ? (
                  <div className="flex gap-4">
                    <button onClick={() => setIsEditing(false)} className="text-sm font-bold text-gray-400 hover:text-gray-600">Cancel</button>
                    <button onClick={handleSave} className="text-sm font-bold text-[#3B82F6] hover:underline">Save Changes</button>
                  </div>
                ) : (
                  <button onClick={() => setIsEditing(true)} className="text-sm font-bold text-[#3B82F6] hover:underline">Edit Details</button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-2">
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <User className="w-4 h-4" /> Full Name
                  </p>
                  {isEditing ? (
                    <input 
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-2 outline-none focus:border-[#3B82F6] font-bold"
                      value={editedUser.name}
                      onChange={(e) => setEditedUser({...editedUser, name: e.target.value})}
                    />
                  ) : (
                    <p className="text-lg font-bold text-[#111827]">{user.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Email Address
                  </p>
                  {isEditing ? (
                    <input 
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-2 outline-none focus:border-[#3B82F6] font-bold"
                      value={editedUser.email}
                      onChange={(e) => setEditedUser({...editedUser, email: e.target.value})}
                    />
                  ) : (
                    <p className="text-lg font-bold text-[#111827]">{user.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Translation Language
                  </p>
                  <p className="text-lg font-bold text-[#111827]">{prefLanguage}</p>
                </div>
              </div>
            </section>


            {/* History Card */}
            <section className="bg-white rounded-[32px] p-10 border border-gray-100 shadow-[0_4px_25px_rgba(0,0,0,0.03)]">
              <h2 className="text-2xl font-bold text-[#111827] mb-10 flex items-center gap-3">
                <Clock className="w-6 h-6 text-[#6366f1]" />
                Recent History
              </h2>

              <div className="space-y-4">
                {loading ? (
                  <div className="py-10 text-center text-gray-400 font-bold animate-pulse italic">Retrieving translations...</div>
                ) : history.length > 0 ? (
                  history.slice(0, 5).map((item, i) => (
                    <motion.div 
                      key={i}
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between p-5 rounded-2xl bg-[#F8FAFC] border border-gray-50 hover:border-gray-200 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-[#6366f1] shadow-sm">
                            <User className="w-6 h-6" />
                         </div>
                        <div>
                          <p className="font-bold text-[#111827] group-hover:text-[#6366f1] transition-colors">{item.text}</p>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">{item.type} • {formatDate(item.timestamp)}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#111827] transition-all transform group-hover:translate-x-1" />
                    </motion.div>
                  ))
                ) : (
                  <div className="py-12 text-center text-gray-400 font-medium italic border-2 border-dashed border-gray-50 rounded-3xl">
                    No activity recorded yet.
                  </div>
                )}
              </div>
              {history.length > 5 && (
                <button className="w-full mt-8 py-4 rounded-2xl border-2 border-dashed border-gray-100 text-gray-400 font-bold hover:bg-gray-50 transition-all">
                  Load Older Translations
                </button>
              )}
            </section>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-10">


            <div className="rounded-[40px] bg-[#111827] p-10 relative overflow-hidden shadow-2xl">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
               <h3 className="text-2xl font-bold text-white mb-3">Translation Milestone</h3>
               <p className="text-gray-400 text-sm font-medium leading-relaxed mb-8 italic">"Building bridges, one sign at a time."</p>
               <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden mb-4">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (history.length / 1000) * 100)}%` }}
                    className="h-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] rounded-full" 
                  />
               </div>
               <div className="flex justify-between items-center">
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#6366f1]">Goal Progress</p>
                  <p className="text-xs font-bold text-white">{history.length} / 1000</p>
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
