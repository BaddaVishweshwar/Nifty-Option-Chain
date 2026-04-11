import * as React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Zap, label: 'Quick View', path: '/quick-view' },
];

export const Sidebar: React.FC = () => {
  return (
    <nav className="w-64 h-screen bg-zinc-900 border-r border-zinc-800 flex flex-col pt-6 shrink-0">
      <div className="px-6 mb-10">
        <h1 className="text-xl font-black bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent italic tracking-tighter">
          NiftyDash
        </h1>
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mt-1">Real-time Trading</p>
      </div>

      <div className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all group relative overflow-hidden ${
                isActive 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                <span className="text-sm font-bold tracking-tight">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute left-0 w-1.5 h-6 bg-blue-500 rounded-r-full shadow-[4px_0_12px_rgba(59,130,246,0.5)]"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>

      <div className="p-6">
        <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 flex flex-col gap-3 shadow-inner">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Live Engine Active</span>
          </div>
          <p className="text-[10px] text-zinc-600 leading-relaxed font-medium">
            Proprietary Greeks engine running with sub-100ms update latency.
          </p>
        </div>
      </div>
    </nav>
  );
};
