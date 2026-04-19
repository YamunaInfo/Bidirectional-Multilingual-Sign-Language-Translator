import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Video, Mic } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [user, setUser] = useState({ name: 'User', email: 'user@example.com' });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const tools = [
    { 
      title: 'For Deaf Users', 
      type: 'Sign Language → Speech/Text',
      desc: 'Upload sign language video or use live camera to convert to speech and text',
      icon: Video, 
      path: '/sign-to-speech',
      iconBg: 'bg-[#3B82F6]'
    },
    { 
      title: 'For Hearing Users', 
      type: 'Speech/Text → Sign Language',
      desc: 'Speak or type to see sign language hand alphabet representation',
      icon: Mic, 
      path: '/speech-to-sign',
      iconBg: 'bg-[#A855F7]'
    },
  ];

  return (
    <div className="h-full bg-[#F9FAFB] flex flex-col pt-6 overflow-hidden">
      <main className="max-w-6xl mx-auto px-6 flex-grow w-full">
        <header className="text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-[#111827] mb-2"
          >
            Welcome, <span className="text-[#111827]">{user.name}</span>! 👋
          </motion.h1>
          <p className="text-lg text-gray-500 font-medium">Choose your translation mode to get started</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tools.map((tool, i) => (
            <Link to={tool.path} key={i}>
              <motion.div 
                whileHover={{ y: -10, scale: 1.02 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-[32px] p-12 shadow-[0_8px_40px_rgba(0,0,0,0.04)] border border-gray-100 flex flex-col items-center text-center h-full hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-all"
              >
                <div className={`w-20 h-20 ${tool.iconBg} rounded-[28px] flex items-center justify-center mb-8 shadow-lg`}>
                  <tool.icon className="w-10 h-10 text-white" />
                </div>
                
                <h2 className="text-[28px] font-extrabold text-[#111827] mb-2">{tool.title}</h2>
                <p className="text-gray-500 font-medium mb-8 italic tracking-tight">{tool.type}</p>
                
                <p className="text-gray-400 font-medium leading-relaxed max-w-[280px]">
                  {tool.desc}
                </p>
              </motion.div>
            </Link>
          ))}
        </div>
      </main>

      <footer className="py-12 text-center">
        <p className="text-gray-400 font-bold mb-2">Contact Us: <span className="text-gray-400 font-medium">{user.email}</span></p>
        <p className="text-gray-400 text-sm font-medium opacity-70">© 2024 Bidirectional Sign Language Translator. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Dashboard;
