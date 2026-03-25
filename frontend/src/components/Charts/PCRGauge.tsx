import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useOptionChainStore } from '../../store/optionChainStore';

export const PCRGauge: React.FC = () => {
  const { pcr } = useOptionChainStore();
  
  const data = [
    { name: 'Bearish', value: 0.7, color: '#ef4444' },
    { name: 'Neutral', value: 0.6, color: '#3b82f6' },
    { name: 'Bullish', value: 1.7, color: '#22c55e' },
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-lg h-[300px] flex flex-col items-center">
      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-2 w-full">PCR Gauge</h3>
      <ResponsiveContainer width="100%" height="80%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="100%"
            startAngle={180}
            endAngle={0}
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={entry.color} opacity={0.6} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="text-3xl font-bold mt-[-20px]">{pcr.toFixed(2)}</div>
      <div className="text-xs text-zinc-500 uppercase font-bold tracking-widest mt-1">
        {pcr > 1.2 ? 'Bullish' : pcr < 0.8 ? 'Bearish' : 'Neutral'}
      </div>
    </div>
  );
};
