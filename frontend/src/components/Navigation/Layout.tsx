import * as React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from '../TopBar/TopBar';
import { motion } from 'framer-motion';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Fixed Sidebar */}
      <motion.div
        animate={{ width: isCollapsed ? 80 : 256 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="h-full border-r border-zinc-800 bg-zinc-900 shrink-0 overflow-hidden"
      >
        <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      </motion.div>
      
      <div className="flex-1 flex flex-col h-full bg-zinc-900/10 min-w-0">
        {/* Top Header */}
        <TopBar />
        
        {/* Page Content */}
        <main className="flex-1 overflow-hidden relative">
          <div className="h-full w-full overflow-auto custom-scrollbar">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
