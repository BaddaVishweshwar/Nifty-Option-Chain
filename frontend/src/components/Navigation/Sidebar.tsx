import { LayoutDashboard, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Zap, label: 'Quick View', path: '/quick-view' },
];

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  return (
    <nav className="h-full flex flex-col pt-6 relative group">
      {/* Toggle Button */}
      <button 
        onClick={onToggle}
        className="absolute -right-3 top-12 w-6 h-6 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all z-20 shadow-xl opacity-0 group-hover:opacity-100"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Branding */}
      <div className={`px-6 mb-10 transition-all duration-300 ${isCollapsed ? 'px-4 text-center' : ''}`}>
        <AnimatePresence mode="wait">
          {!isCollapsed ? (
            <motion.div
              key="expanded-logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h1 className="text-xl font-black bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent italic tracking-tighter">
                NiftyDash
              </h1>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mt-1">Real-time Trading</p>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed-logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-2xl font-black text-blue-500 italic"
            >
              ND
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav Items */}
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
              } ${isCollapsed ? 'justify-center !px-0' : ''}`
            }
            title={isCollapsed ? item.label : ''}
          >
            {({ isActive }) => (
              <>
                <item.icon className="w-5 h-5 transition-transform group-hover:scale-110 shrink-0" />
                {!isCollapsed && (
                  <motion.span 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-sm font-bold tracking-tight whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full shadow-[4px_0_12px_rgba(59,130,246,0.5)]"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* Footer / Status */}
      <div className={`p-6 transition-all duration-300 ${isCollapsed ? 'p-4' : ''}`}>
        <div className={`bg-zinc-950 rounded-2xl border border-zinc-800 flex flex-col gap-3 shadow-inner ${isCollapsed ? 'items-center py-4' : 'p-4'}`}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
            {!isCollapsed && (
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Live Engine Active</span>
            )}
          </div>
          {!isCollapsed && (
            <p className="text-[10px] text-zinc-600 leading-relaxed font-medium">
              Proprietary Greeks engine running with sub-100ms update latency.
            </p>
          )}
        </div>
      </div>
    </nav>
  );
};
