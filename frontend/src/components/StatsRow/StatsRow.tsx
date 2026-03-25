import React from 'react';
import { useOptionChainStore } from '../../store/optionChainStore';
import { TrendingUp, Activity, Waves, Target } from 'lucide-react';

const StatCard: React.FC<any> = ({ label, value, icon, colorClass, subValue }) => (
  <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center gap-4 transition-all hover:border-zinc-700 shadow-lg">
    <div className={`p-3 rounded-lg ${colorClass} bg-opacity-20`}>
      {React.cloneElement(icon as React.ReactElement, { className: `w-6 h-6 ${colorClass.replace('bg-', 'text-')}` })}
    </div>
    <div>
      <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">{label}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl font-bold text-zinc-100">{value}</h3>
        {subValue && <span className="text-sm text-zinc-500">{subValue}</span>}
      </div>
    </div>
  </div>
);

export const StatsRow: React.FC = () => {
  const { pcr, maxPain, atmStrike, spotPrice } = useOptionChainStore();

  const pcrColor = pcr > 1.2 ? 'bg-green-500' : pcr < 0.8 ? 'bg-red-500' : 'bg-blue-500';
  const pcrStatus = pcr > 1.2 ? 'Bullish' : pcr < 0.8 ? 'Bearish' : 'Neutral';

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-zinc-950">
      <StatCard 
        label="PCR (OI)" 
        value={pcr.toFixed(2)} 
        icon={<TrendingUp />} 
        colorClass={pcrColor}
        subValue={pcrStatus}
      />
      <StatCard 
        label="Max Pain" 
        value={maxPain.toLocaleString()} 
        icon={<Target />} 
        colorClass="bg-purple-500"
      />
      <StatCard 
        label="ATM Strike" 
        value={atmStrike.toLocaleString()} 
        icon={<Activity />} 
        colorClass="bg-amber-500"
      />
      <StatCard 
        label="Spot Spread" 
        value={(spotPrice - atmStrike).toFixed(2)} 
        icon={<Waves />} 
        colorClass="bg-cyan-500"
        subValue={Math.abs(spotPrice - atmStrike) < 50 ? 'Tight' : 'Wide'}
      />
    </div>
  );
};
