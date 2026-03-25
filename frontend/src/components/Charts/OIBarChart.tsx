import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { useOptionChainStore } from '../../store/optionChainStore';

export const OIBarChart: React.FC = () => {
  const { chain, spotPrice } = useOptionChainStore();

  const data = useMemo(() => {
    return chain.map(s => ({
      strike: s.strike,
      CE_OI: s.ce.oi,
      PE_OI: s.pe.oi,
    }));
  }, [chain]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-lg h-[400px]">
      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4">Open Interest by Strike</h3>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="strike" stroke="#71717a" fontSize={10} />
          <YAxis stroke="#71717a" fontSize={10} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
            itemStyle={{ color: '#f4f4f5' }}
          />
          <Legend />
          <Bar dataKey="CE_OI" fill="#ef4444" radius={[4, 4, 0, 0]} name="Call OI" />
          <Bar dataKey="PE_OI" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Put OI" />
          <ReferenceLine x={spotPrice} stroke="#f59e0b" label="Spot" strokeWidth={2} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
