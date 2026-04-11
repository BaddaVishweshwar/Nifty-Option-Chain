import * as React from 'react';
import { useState } from 'react';
import { StatsRow } from '../components/StatsRow/StatsRow';
import { OptionChainTable } from '../components/OptionChainTable/OptionChainTable';
import { PCRGauge } from '../components/Charts/PCRGauge';
import { OIBarChart } from '../components/Charts/OIBarChart';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [showCharts, setShowCharts] = useState(true);

  return (
    <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-500 min-h-full">
      {/* Top Header & Key Statistics */}
      <div className="flex items-end justify-between">
        <StatsRow />
        <button
          onClick={() => setShowCharts(!showCharts)}
          className={`mb-4 flex items-center justify-center p-2 rounded-xl border transition-all ${
            showCharts 
              ? 'bg-blue-600/10 border-blue-500/50 text-blue-400' 
              : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300 shadow-lg'
          }`}
          title={showCharts ? "Minimize Charts" : "Expand Table"}
        >
          {showCharts ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
        </button>
      </div>
      
      {/* Main Content Grid */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Full Option Chain Table */}
        <motion.div 
          layout
          className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
        >
          <OptionChainTable />
        </motion.div>
        
        {/* Sidebar Charts */}
        <AnimatePresence mode="popLayout">
          {showCharts && (
            <motion.div 
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-[380px] flex flex-col gap-6 shrink-0"
            >
              <PCRGauge />
              <OIBarChart />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
