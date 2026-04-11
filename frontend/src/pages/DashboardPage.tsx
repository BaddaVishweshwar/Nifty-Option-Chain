import * as React from 'react';
import { StatsRow } from '../components/StatsRow/StatsRow';
import { OptionChainTable } from '../components/OptionChainTable/OptionChainTable';
import { PCRGauge } from '../components/Charts/PCRGauge';
import { OIBarChart } from '../components/Charts/OIBarChart';

export const DashboardPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-500">
      {/* Top Key Statistics */}
      <StatsRow />
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Full Option Chain Table */}
        <div className="xl:col-span-3">
          <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-1">
             <OptionChainTable />
          </div>
        </div>
        
        {/* Sidebar Charts */}
        <div className="flex flex-col gap-6">
          <PCRGauge />
          <OIBarChart />
        </div>
      </div>
    </div>
  );
};
