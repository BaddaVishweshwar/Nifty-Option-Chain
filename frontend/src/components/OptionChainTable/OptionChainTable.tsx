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
import { LTPCell } from './LTPCell';
import { OIBar } from './OIBar';

const columnHelper = createColumnHelper<OptionStrike>();

export const OptionChainTable: React.FC = () => {
  const { chain, atmStrike, spotPrice, showLots, toggleLots, lotSize, selectedSymbol } = useOptionChainStore();
  const parentRef = useRef<HTMLDivElement>(null);

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

  const columns = useMemo(() => [
    columnHelper.accessor('ce.oiChange', {
      header: 'OI Chg',
      cell: (info: any) => (
        <span className={info.getValue() > 0 ? 'text-green-400' : 'text-red-400'}>
          {info.getValue().toLocaleString()}
        </span>
      ),
    }),
    columnHelper.accessor('ce.oi', {
      header: 'OI',
      cell: (info: any) => (
        <div className="relative w-full text-right pr-2">
          <OIBar value={info.getValue()} maxValue={maxOI} color="bg-blue-600" />
          <span className="relative z-10">{info.getValue().toLocaleString()}</span>
        </div>
      ),
    }),
    columnHelper.accessor('ce.iv', {
        header: 'IV',
        cell: (info: any) => info.getValue().toFixed(2),
    }),
    columnHelper.accessor('ce.ltp', {
      header: 'LTP',
      cell: (info: any) => <LTPCell value={info.getValue()} prevValue={info.row.original.ce.prevLtp} />,
    }),
    
    columnHelper.accessor('strike', {
      header: 'STRIKE',
      cell: (info: any) => (
        <div className={`font-bold text-center py-1 rounded bg-zinc-800 border border-zinc-700 ${info.getValue() === atmStrike ? 'ring-2 ring-amber-500 text-amber-500' : ''}`}>
          {info.getValue()}
        </div>
      ),
    }),

    columnHelper.accessor('pe.ltp', {
      header: 'LTP',
      cell: (info: any) => <LTPCell value={info.getValue()} prevValue={info.row.original.pe.prevLtp} />,
    }),
    columnHelper.accessor('pe.iv', {
        header: 'IV',
        cell: (info: any) => info.getValue().toFixed(2),
    }),
    columnHelper.accessor('pe.oi', {
      header: 'OI',
      cell: (info: any) => (
        <div className="relative w-full text-left pl-2">
          <OIBar value={info.getValue()} maxValue={maxOI} color="bg-red-600" isRight />
          <span className="relative z-10">{info.getValue().toLocaleString()}</span>
        </div>
      ),
    }),
    columnHelper.accessor('pe.oiChange', {
      header: 'OI Chg',
      cell: (info: any) => (
        <span className={info.getValue() > 0 ? 'text-green-400' : 'text-red-400'}>
          {info.getValue().toLocaleString()}
        </span>
      ),
    }),
  ], [maxOI, atmStrike]);

  const table = useReactTable({
    data: chain,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 10,
  });

  const columnWidths = {
    oiChg: 'w-[75px]',
    oi: 'w-[95px]',
    iv: 'w-[55px]',
    greek: 'w-[55px]',
    ltp: 'w-[90px]',
    strike: 'w-[100px]'
  };

  const getITMClass = (isITM: boolean, type: 'ce' | 'pe') => {
    if (!isITM) return '';
    return type === 'ce' 
      ? 'bg-blue-600/10 border-r border-blue-500/10' 
      : 'bg-red-600/10 border-l border-red-500/10';
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div 
        ref={parentRef} 
        className="overflow-auto h-[calc(100vh-280px)] custom-scrollbar"
      >
        <table className="w-full border-collapse table-fixed min-w-[1300px]">
          <thead className="sticky top-0 z-20 bg-zinc-900 shadow-md block">
            {/* Top Header Labels */}
            <tr className="flex items-center w-full bg-zinc-950/50 border-b border-zinc-800">
              <th className="flex-1 py-1 text-[11px] font-black text-blue-400/80 tracking-[0.2em] text-center border-r border-zinc-800/50 uppercase flex items-center justify-center gap-4">
                Call Options
                <button 
                  onClick={toggleLots}
                  className={`px-2 py-0.5 rounded text-[9px] border transition-all ${showLots ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}
                >
                  {showLots ? 'LOTS' : 'QTY'}
                </button>
              </th>
              <th className={`${columnWidths.strike} py-1 text-[11px] font-black text-zinc-500 tracking-[0.2em] text-center uppercase`}>Index</th>
              <th className="flex-1 py-1 text-[11px] font-black text-red-500/80 tracking-[0.2em] text-center border-l border-zinc-800/50 uppercase">Put Options</th>
            </tr>
            {/* Metric Labels */}
            <tr className="flex items-center w-full border-b border-zinc-800">
              <th className={`${columnWidths.oiChg} px-2 py-3 text-[9px] font-bold uppercase text-zinc-500 text-center shrink-0`}>OI Chg</th>
              <th className={`${columnWidths.oi} px-2 py-3 text-[9px] font-bold uppercase text-zinc-500 text-center shrink-0 text-blue-400/50`}>OI {showLots ? '(L)' : ''}</th>
              <th className={`${columnWidths.iv} px-1 py-3 text-[9px] font-bold uppercase text-zinc-500 text-center shrink-0`}>IV</th>
              <th className={`${columnWidths.greek} px-1 py-3 text-[9px] font-bold uppercase text-blue-500/50 text-center shrink-0`}>Delta</th>
              <th className={`${columnWidths.greek} px-1 py-3 text-[9px] font-bold uppercase text-blue-500/50 text-center shrink-0`}>Theta</th>
              <th className={`${columnWidths.greek} px-1 py-3 text-[9px] font-bold uppercase text-blue-500/50 text-center shrink-0`}>Gamma</th>
              <th className={`${columnWidths.greek} px-1 py-3 text-[9px] font-bold uppercase text-blue-500/50 text-center shrink-0`}>Vega</th>
              <th className={`${columnWidths.ltp} px-2 py-3 text-[9px] font-bold uppercase text-zinc-300 text-center shrink-0`}>LTP</th>
              <th className={`${columnWidths.strike} px-2 py-3 text-[9px] font-bold uppercase text-amber-500 text-center shrink-0 bg-zinc-900/50`}>Strike</th>
              <th className={`${columnWidths.ltp} px-2 py-3 text-[9px] font-bold uppercase text-zinc-300 text-center shrink-0`}>LTP</th>
              <th className={`${columnWidths.greek} px-1 py-3 text-[9px] font-bold uppercase text-red-500/50 text-center shrink-0`}>Delta</th>
              <th className={`${columnWidths.greek} px-1 py-3 text-[9px] font-bold uppercase text-red-500/50 text-center shrink-0`}>Theta</th>
              <th className={`${columnWidths.greek} px-1 py-3 text-[9px] font-bold uppercase text-red-500/50 text-center shrink-0`}>Gamma</th>
              <th className={`${columnWidths.greek} px-1 py-3 text-[9px] font-bold uppercase text-red-500/50 text-center shrink-0`}>Vega</th>
              <th className={`${columnWidths.iv} px-1 py-3 text-[9px] font-bold uppercase text-zinc-500 text-center shrink-0`}>IV</th>
              <th className={`${columnWidths.oi} px-2 py-3 text-[9px] font-bold uppercase text-zinc-500 text-center shrink-0 text-red-400/50`}>OI {showLots ? '(L)' : ''}</th>
              <th className={`${columnWidths.oiChg} px-2 py-3 text-[9px] font-bold uppercase text-zinc-500 text-center shrink-0`}>OI Chg</th>
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
                  className="hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/30"
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
                  <td className={`${columnWidths.oiChg} px-2 text-center text-[11px] font-mono shrink-0`}>
                    <span className={row.original.ce.oiChange > 0 ? 'text-green-400' : 'text-red-400'}>
                      {formatOI(row.original.ce.oiChange)}
                    </span>
                  </td>
                  <td className={`${columnWidths.oi} px-2 text-center text-[11px] font-mono relative shrink-0`}>
                    <OIBar value={row.original.ce.oi} maxValue={maxOI} color="bg-blue-600/80" />
                    <span className="relative z-10">{formatOI(row.original.ce.oi)}</span>
                  </td>
                  <td className={`${columnWidths.iv} px-1 text-center text-[11px] font-mono shrink-0 text-zinc-500`}>{row.original.ce.iv.toFixed(1)}</td>
                  
                  {/* CE Greeks */}
                  <td className={`${columnWidths.greek} px-1 text-center text-[11px] font-mono shrink-0 text-blue-400/60`}>{row.original.ce.delta?.toFixed(2) || '0.00'}</td>
                  <td className={`${columnWidths.greek} px-1 text-center text-[11px] font-mono shrink-0 text-blue-400/60`}>{row.original.ce.theta?.toFixed(1) || '0.0'}</td>
                  <td className={`${columnWidths.greek} px-1 text-center text-[11px] font-mono shrink-0 text-blue-400/60`}>{row.original.ce.gamma?.toFixed(4) || '0.0000'}</td>
                  <td className={`${columnWidths.greek} px-1 text-center text-[11px] font-mono shrink-0 text-blue-400/60`}>{row.original.ce.vega?.toFixed(2) || '0.00'}</td>
                  
                  <td className={`${columnWidths.ltp} px-2 text-center text-[11px] font-mono shrink-0 ${getITMClass(isITM_CE, 'ce')}`}>
                    <LTPCell value={row.original.ce.ltp} prevValue={row.original.ce.prevLtp} />
                  </td>
                  
                  <td className={`${columnWidths.strike} px-2 text-center font-bold shrink-0 z-10`}>
                    <div className={`py-1 rounded bg-zinc-800 border-x border-zinc-700 shadow-lg ${row.original.strike === atmStrike ? 'ring-2 ring-amber-500 text-amber-500' : 'text-zinc-300'}`}>
                      {row.original.strike}
                    </div>
                  </td>
                  
                  <td className={`${columnWidths.ltp} px-2 text-center text-[11px] font-mono shrink-0 ${getITMClass(isITM_PE, 'pe')}`}>
                    <LTPCell value={row.original.pe.ltp} prevValue={row.original.pe.prevLtp} />
                  </td>

                  {/* PE Greeks */}
                  <td className={`${columnWidths.greek} px-1 text-center text-[11px] font-mono shrink-0 text-red-400/60`}>{row.original.pe.delta?.toFixed(2) || '0.00'}</td>
                  <td className={`${columnWidths.greek} px-1 text-center text-[11px] font-mono shrink-0 text-red-400/60`}>{row.original.pe.theta?.toFixed(1) || '0.0'}</td>
                  <td className={`${columnWidths.greek} px-1 text-center text-[11px] font-mono shrink-0 text-red-400/60`}>{row.original.pe.gamma?.toFixed(4) || '0.0000'}</td>
                  <td className={`${columnWidths.greek} px-1 text-center text-[11px] font-mono shrink-0 text-red-400/60`}>{row.original.pe.vega?.toFixed(2) || '0.00'}</td>
                  
                  <td className={`${columnWidths.iv} px-1 text-center text-[11px] font-mono shrink-0 text-zinc-500`}>{row.original.pe.iv.toFixed(1)}</td>
                  <td className={`${columnWidths.oi} px-2 text-center text-[11px] font-mono relative shrink-0`}>
                    <OIBar value={row.original.pe.oi} maxValue={maxOI} color="bg-red-600/80" isRight />
                    <span className="relative z-10">{formatOI(row.original.pe.oi)}</span>
                  </td>
                  <td className={`${columnWidths.oiChg} px-2 text-center text-[11px] font-mono shrink-0`}>
                    <span className={row.original.pe.oiChange > 0 ? 'text-green-400' : 'text-red-400'}>
                      {formatOI(row.original.pe.oiChange)}
                    </span>
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
