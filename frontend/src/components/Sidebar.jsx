import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Languages, Type, UserCircle } from 'lucide-react';

const Sidebar = () => {
  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/sign-to-speech', label: 'Sign → Speech', icon: Languages },
    { to: '/speech-to-sign', label: 'Speech → Sign', icon: Type },
    { to: '/profile', label: 'Profile', icon: UserCircle },
  ];

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 glass-morphism border-r border-white/10 hidden md:flex flex-col py-6 px-4">
      <div className="space-y-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                isActive
                  ? 'bg-premium-accent text-white shadow-lg shadow-premium-accent/20'
                  : 'hover:bg-white/5 text-slate-400 hover:text-white'
              }`
            }
          >
            <link.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
            <span className="font-medium text-sm">{link.label}</span>
          </NavLink>
        ))}
      </div>

      <div className="mt-auto">
        <div className="p-4 rounded-xl bg-gradient-to-br from-premium-accent/10 to-transparent border border-white/5">
          <p className="text-xs text-slate-400 leading-relaxed">
            Multilingual support active for English, Hindi, and Tamil.
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
