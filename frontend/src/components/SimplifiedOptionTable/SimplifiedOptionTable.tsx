import * as React from 'react';
import { useMemo, useRef } from 'react';
import { 
  useReactTable, 
  getCoreRowModel, 
  createColumnHelper 
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useOptionChainStore } from '../../store/optionChainStore';
import { OptionStrike } from '../../types/optionChain';
import { LTPCell } from '../OptionChainTable/LTPCell';
import { OIBar } from '../OptionChainTable/OIBar';

const columnHelper = createColumnHelper<OptionStrike>();

export const SimplifiedOptionTable: React.FC = () => {
  const { chain, atmStrike, spotPrice, showLots, toggleLots, selectedSymbol } = useOptionChainStore();
  const parentRef = useRef<HTMLDivElement>(null);

  const lotSize = useMemo(() => {
    if (selectedSymbol.includes('NIFTYBANK')) return 15;
    if (selectedSymbol.includes('NIFTY50') || selectedSymbol.includes('NIFTY-INDEX')) return 25;
    if (selectedSymbol.includes('FINNIFTY')) return 25;
    if (selectedSymbol.includes('SENSEX')) return 10;
    return 1;
  }, [selectedSymbol]);

  const formatOI = (val: number) => {
    if (showLots) return Math.round(val / lotSize).toLocaleString();
    return val.toLocaleString();
  };

  const maxOI = useMemo(() => {
    let max = 0;
    chain.forEach(s => {
      max = Math.max(max, s.ce.oi, s.pe.oi);
    });
    return max;
  }, [chain]);

  const columnWidths = {
    oi: 'w-[140px]',
    greek: 'w-[100px]',
    ltp: 'w-[140px]',
    strike: 'w-[160px]'
  };

  const table = useReactTable({
    data: chain,
    columns: [], // We don't use tanstack columns for manual row rendering with virtualization
    getCoreRowModel: getCoreRowModel(),
  });

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  const getITMClass = (isITM: boolean, type: 'ce' | 'pe') => {
    if (!isITM) return '';
    return type === 'ce' 
      ? 'bg-blue-600/5 backdrop-blur-sm' 
      : 'bg-red-600/5 backdrop-blur-sm';
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      <div 
        ref={parentRef} 
        className="overflow-auto h-full custom-scrollbar"
      >
        <table className="w-full border-collapse table-fixed min-w-[1000px]">
          <thead className="sticky top-0 z-20 bg-zinc-900 shadow-[0_4px_20px_rgba(0,0,0,0.5)] border-b border-zinc-800">
            {/* Legend Labels */}
            <tr className="flex items-center w-full bg-zinc-950/30 border-b border-zinc-800/50">
                <th className="flex-1 py-1.5 text-[10px] font-black text-blue-400/60 tracking-[0.3em] text-center border-r border-zinc-800/50 uppercase">
                    Call Side
                </th>
                <th className={`${columnWidths.strike} py-1.5 text-[10px] font-black text-zinc-500 tracking-[0.3em] text-center uppercase`}>
                    Strikes
                </th>
                <th className="flex-1 py-1.5 text-[10px] font-black text-red-400/60 tracking-[0.3em] text-center border-l border-zinc-800/50 uppercase">
                    Put Side
                </th>
            </tr>
            {/* Metric Labels */}
            <tr className="flex items-center w-full">
              <th className={`${columnWidths.oi} px-4 py-4 text-[10px] font-black uppercase text-zinc-500 text-center shrink-0`}>Call OI</th>
              <th className={`${columnWidths.greek} px-4 py-4 text-[10px] font-black uppercase text-blue-500/50 text-center shrink-0`}>Gamma</th>
              <th className={`${columnWidths.ltp} px-4 py-4 text-[10px] font-black uppercase text-zinc-300 text-center shrink-0`}>LTP</th>
              
              <th className={`${columnWidths.strike} px-4 py-4 text-[12px] font-black uppercase text-amber-500 text-center shrink-0 bg-zinc-900/80`}>Strike Price</th>
              
              <th className={`${columnWidths.ltp} px-4 py-4 text-[10px] font-black uppercase text-zinc-300 text-center shrink-0`}>LTP</th>
              <th className={`${columnWidths.greek} px-4 py-4 text-[10px] font-black uppercase text-red-500/50 text-center shrink-0`}>Gamma</th>
              <th className={`${columnWidths.oi} px-4 py-4 text-[10px] font-black uppercase text-zinc-500 text-center shrink-0`}>Put OI</th>
            </tr>
          </thead>
          <tbody style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative', display: 'block' }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow: any) => {
              const row = rows[virtualRow.index];
              const isITM_CE = row.original.strike < spotPrice;
              const isITM_PE = row.original.strike > spotPrice;

              return (
                <tr 
                  key={row.id}
                  className="hover:bg-zinc-800/80 transition-all border-b border-zinc-800/30 group"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <td className={`${columnWidths.oi} px-4 text-center text-[13px] font-mono relative shrink-0`}>
                    <OIBar value={row.original.ce.oi} maxValue={maxOI} color="bg-blue-600/40" />
                    <span className="relative z-10 font-bold group-hover:text-blue-200 transition-colors">{formatOI(row.original.ce.oi)}</span>
                  </td>
                  <td className={`${columnWidths.greek} px-4 text-center text-[13px] font-mono shrink-0 text-blue-400/80 font-semibold tracking-tight`}>
                    {row.original.ce.gamma?.toFixed(4) || '0.0000'}
                  </td>
                  <td className={`${columnWidths.ltp} px-4 text-center text-[13px] font-mono shrink-0 transition-colors ${getITMClass(isITM_CE, 'ce')}`}>
                    <LTPCell value={row.original.ce.ltp} prevValue={row.original.ce.prevLtp} />
                  </td>
                  
                  <td className={`${columnWidths.strike} px-4 text-center font-bold shrink-0 z-10`}>
                    <div className={`py-2 rounded-xl bg-zinc-800 border-x border-zinc-700 shadow-[0_0_20px_rgba(0,0,0,0.3)] text-[15px] transition-all group-hover:scale-105 ${row.original.strike === atmStrike ? 'ring-2 ring-amber-500 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'text-zinc-200'}`}>
                      {row.original.strike}
                    </div>
                  </td>
                  
                  <td className={`${columnWidths.ltp} px-4 text-center text-[13px] font-mono shrink-0 transition-colors ${getITMClass(isITM_PE, 'pe')}`}>
                    <LTPCell value={row.original.pe.ltp} prevValue={row.original.pe.prevLtp} />
                  </td>
                  <td className={`${columnWidths.greek} px-4 text-center text-[13px] font-mono shrink-0 text-red-400/80 font-semibold tracking-tight`}>
                    {row.original.pe.gamma?.toFixed(4) || '0.0000'}
                  </td>
                  <td className={`${columnWidths.oi} px-4 text-center text-[13px] font-mono relative shrink-0`}>
                    <OIBar value={row.original.pe.oi} maxValue={maxOI} color="bg-red-600/40" isRight />
                    <span className="relative z-10 font-bold group-hover:text-red-200 transition-colors">{formatOI(row.original.pe.oi)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
