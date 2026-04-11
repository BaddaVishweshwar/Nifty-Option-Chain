import * as React from 'react';
import { StatsRow } from '../components/StatsRow/StatsRow';
import { SimplifiedOptionTable } from '../components/SimplifiedOptionTable/SimplifiedOptionTable';

export const SimplifiedViewPage: React.FC = () => {
  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-500">
      {/* Top Key Statistics */}
      <StatsRow />
      
      {/* Focused Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex flex-col">
                <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-3 italic">
                    <span className="w-1.5 h-6 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                    Quick Option Chain View
                </h2>
                <p className="text-zinc-500 text-xs mt-1 font-medium tracking-wide">High-priority metrics: Strike, LTP, OI, and Gamma</p>
            </div>
            
            <div className="flex items-center gap-2 bg-zinc-800/50 px-3 py-1.5 rounded-lg border border-zinc-700/50">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Optimized View</span>
            </div>
        </div>
        
        {/* Simplified Data Table */}
        <div className="flex-1 overflow-hidden px-6 pb-6">
            <div className="h-full bg-zinc-900/50 rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden">
                <SimplifiedOptionTable />
            </div>
        </div>
      </div>
    </div>
  );
};
