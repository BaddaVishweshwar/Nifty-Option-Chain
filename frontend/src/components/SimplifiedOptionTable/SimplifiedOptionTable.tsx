import * as React from 'react';
import { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useOptionChainStore } from '../../store/optionChainStore';
import { LTPCell } from '../OptionChainTable/LTPCell';
import { OIBar } from '../OptionChainTable/OIBar';

// Column widths — must match exactly in header and body rows
const COL = {
  oi:     '140px',
  gamma:  '100px',
  ltp:    '140px',
  strike: '160px',
};

// Total fixed width: 140+100+140+160+140+100+140 = 920px
const GRID_TEMPLATE = `${COL.oi} ${COL.gamma} ${COL.ltp} ${COL.strike} ${COL.ltp} ${COL.gamma} ${COL.oi}`;

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
    chain.forEach(s => { max = Math.max(max, s.ce.oi, s.pe.oi); });
    return max;
  }, [chain]);

  const rowVirtualizer = useVirtualizer({
    count: chain.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 12,
  });

  const getITMClass = (isITM: boolean, type: 'ce' | 'pe') => {
    if (!isITM) return '';
    return type === 'ce' ? 'bg-blue-600/5' : 'bg-red-600/5';
  };

  // Header label spanning helper — col indices (0-based)
  // Call Side: cols 0-2 (OI, Gamma, LTP) → 3 cols
  // Strike:    col  3                     → 1 col
  // Put Side:  cols 4-6 (LTP, Gamma, OI) → 3 cols
  const callSideWidth  = `calc(${COL.oi} + ${COL.gamma} + ${COL.ltp})`;
  const putSideWidth   = callSideWidth;

  return (
    <div className="flex flex-col h-full bg-zinc-950 overflow-hidden">
      <div ref={parentRef} className="overflow-auto h-full custom-scrollbar">

        {/* ─── STICKY HEADER ─── */}
        <div className="sticky top-0 z-20 bg-zinc-900 border-b border-zinc-800 shadow-lg">

          {/* Row 1: Section labels — manually sized to match grid */}
          <div
            className="flex border-b border-zinc-800/50"
            style={{ minWidth: '920px' }}
          >
            <div
              style={{ width: callSideWidth, minWidth: callSideWidth }}
              className="py-1.5 text-[10px] font-black text-blue-400/60 tracking-[0.3em] text-center uppercase border-r border-zinc-800/50 shrink-0"
            >
              Call Side
            </div>
            <div
              style={{ width: COL.strike, minWidth: COL.strike }}
              className="py-1.5 text-[10px] font-black text-zinc-500 tracking-[0.3em] text-center uppercase shrink-0"
            >
              Strikes
            </div>
            <div
              style={{ width: putSideWidth, minWidth: putSideWidth }}
              className="py-1.5 text-[10px] font-black text-red-400/60 tracking-[0.3em] text-center uppercase border-l border-zinc-800/50 shrink-0"
            >
              Put Side
            </div>
          </div>

          {/* Row 2: Column labels — exact same grid as data rows */}
          <div
            className="grid"
            style={{ gridTemplateColumns: GRID_TEMPLATE, minWidth: '920px' }}
          >
            <div className="px-4 py-3 text-[10px] font-black uppercase text-zinc-500 text-center">Call OI</div>
            <div className="px-4 py-3 text-[10px] font-black uppercase text-blue-400/60 text-center">Gamma</div>
            <div className="px-4 py-3 text-[10px] font-black uppercase text-zinc-300 text-center">LTP</div>
            <div className="px-4 py-3 text-[11px] font-black uppercase text-amber-500 text-center bg-zinc-900/80">Strike</div>
            <div className="px-4 py-3 text-[10px] font-black uppercase text-zinc-300 text-center">LTP</div>
            <div className="px-4 py-3 text-[10px] font-black uppercase text-red-400/60 text-center">Gamma</div>
            <div className="px-4 py-3 text-[10px] font-black uppercase text-zinc-500 text-center">Put OI</div>
          </div>
        </div>

        {/* ─── VIRTUALIZED BODY ─── */}
        <div
          style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative', minWidth: '920px' }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const s = chain[virtualRow.index];
            const isITM_CE = s.strike < spotPrice;
            const isITM_PE = s.strike > spotPrice;
            const isATM    = s.strike === atmStrike;

            return (
              <div
                key={s.strike}
                className="absolute top-0 left-0 w-full grid group hover:bg-zinc-800/60 transition-colors border-b border-zinc-800/30"
                style={{
                  gridTemplateColumns: GRID_TEMPLATE,
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {/* Call OI */}
                <div className={`flex items-center justify-center relative px-4 text-[13px] font-mono ${getITMClass(isITM_CE, 'ce')}`}>
                  <OIBar value={s.ce.oi} maxValue={maxOI} color="bg-blue-600/40" />
                  <span className="relative z-10 font-bold group-hover:text-blue-200 transition-colors">
                    {formatOI(s.ce.oi)}
                  </span>
                </div>

                {/* Call Gamma */}
                <div className="flex items-center justify-center px-4 text-[13px] font-mono text-blue-400/80 font-semibold">
                  {s.ce.gamma?.toFixed(4) ?? '0.0000'}
                </div>

                {/* Call LTP */}
                <div className={`flex items-center justify-center px-4 text-[13px] font-mono ${getITMClass(isITM_CE, 'ce')}`}>
                  <LTPCell value={s.ce.ltp} prevValue={s.ce.prevLtp} />
                </div>

                {/* Strike */}
                <div className="flex items-center justify-center px-2 z-10">
                  <div
                    className={`w-full text-center py-1.5 rounded-xl text-[14px] font-bold transition-all group-hover:scale-105
                      ${isATM
                        ? 'ring-2 ring-amber-500 text-amber-500 bg-zinc-800 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : 'bg-zinc-800 border border-zinc-700 text-zinc-200'
                      }`}
                  >
                    {s.strike}
                  </div>
                </div>

                {/* Put LTP */}
                <div className={`flex items-center justify-center px-4 text-[13px] font-mono ${getITMClass(isITM_PE, 'pe')}`}>
                  <LTPCell value={s.pe.ltp} prevValue={s.pe.prevLtp} />
                </div>

                {/* Put Gamma */}
                <div className="flex items-center justify-center px-4 text-[13px] font-mono text-red-400/80 font-semibold">
                  {s.pe.gamma?.toFixed(4) ?? '0.0000'}
                </div>

                {/* Put OI */}
                <div className={`flex items-center justify-center relative px-4 text-[13px] font-mono ${getITMClass(isITM_PE, 'pe')}`}>
                  <OIBar value={s.pe.oi} maxValue={maxOI} color="bg-red-600/40" isRight />
                  <span className="relative z-10 font-bold group-hover:text-red-200 transition-colors">
                    {formatOI(s.pe.oi)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
