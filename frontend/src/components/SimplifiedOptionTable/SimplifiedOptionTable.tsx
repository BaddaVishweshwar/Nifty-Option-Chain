import * as React from 'react';
import { useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useOptionChainStore } from '../../store/optionChainStore';
import { LTPCell } from '../OptionChainTable/LTPCell';
import { OIBar } from '../OptionChainTable/OIBar';
import { Eye, EyeOff } from 'lucide-react';

// ─── Column widths ─── must match identically between header and body rows
const COL = {
  gex:    '130px',
  oi:     '120px',
  gamma:  '95px',
  ltp:    '125px',
  strike: '155px',
};

// Full 10-column grid template  (L→R)
// callGex | callOI | callGamma | callLTP | STRIKE | putLTP | putGamma | putOI | putGex | netGex
const NET_COL = '130px';
const GRID = `${COL.gex} ${COL.oi} ${COL.gamma} ${COL.ltp} ${COL.strike} ${COL.ltp} ${COL.gamma} ${COL.oi} ${COL.gex} ${NET_COL}`;

// Call side header span = gex + oi + gamma + ltp
const CALL_SPAN = `calc(${COL.gex} + ${COL.oi} + ${COL.gamma} + ${COL.ltp})`;
// Put side header span = ltp + gamma + oi + gex + netGex
const PUT_SPAN  = `calc(${COL.ltp} + ${COL.gamma} + ${COL.oi} + ${COL.gex} + ${NET_COL})`;

// Format GEX as readable millions/billions
const formatGex = (val: number): string => {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '+';
  if (abs >= 1e9)  return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6)  return `${sign}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3)  return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${abs.toFixed(0)}`;
};

const fmtNum = (n: number): string => {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(2);
};

export const SimplifiedOptionTable: React.FC = () => {
  const { chain, atmStrike, spotPrice, showLots, selectedSymbol } = useOptionChainStore();
  const parentRef = useRef<HTMLDivElement>(null);
  const [showGexBreakdown, setShowGexBreakdown] = useState(false);

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

  const spotSq = spotPrice * spotPrice;

  const maxOI = useMemo(() => {
    let max = 0;
    chain.forEach(s => { max = Math.max(max, s.ce.oi, s.pe.oi); });
    return max;
  }, [chain]);

  const rowVirtualizer = useVirtualizer({
    count: chain.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => showGexBreakdown ? 68 : 48,
    overscan: 12,
  });

  // Force re-measure when breakdown toggle changes
  React.useEffect(() => {
    rowVirtualizer.measure();
  }, [showGexBreakdown]);

  const getITMBg = (isITM: boolean, type: 'ce' | 'pe') => {
    if (!isITM) return '';
    return type === 'ce' ? 'bg-blue-600/5' : 'bg-red-600/5';
  };

  // GEX color: negative = red, positive = green
  const gexColor = (val: number) =>
    val < 0
      ? 'text-red-400'
      : val > 0
      ? 'text-green-400'
      : 'text-zinc-500';

  return (
    <div className="flex flex-col h-full bg-zinc-950 overflow-hidden">
      <div ref={parentRef} className="overflow-auto h-full custom-scrollbar">

        {/* ─── STICKY HEADER ─── */}
        <div className="sticky top-0 z-20 bg-zinc-900 border-b border-zinc-800 shadow-lg">

          {/* Row 1: Section labels */}
          <div className="flex border-b border-zinc-800/50" style={{ minWidth: '1285px' }}>
            <div
              style={{ width: CALL_SPAN, minWidth: CALL_SPAN }}
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
              style={{ width: PUT_SPAN, minWidth: PUT_SPAN }}
              className="py-1.5 text-[10px] font-black text-red-400/60 tracking-[0.3em] text-center uppercase border-l border-zinc-800/50 shrink-0"
            >
              Put Side
            </div>
          </div>

          {/* Row 2: Column labels */}
          <div className="grid" style={{ gridTemplateColumns: GRID, minWidth: '1285px' }}>

            {/* Call GEX header */}
            <div className="px-3 py-2.5 flex flex-col items-center justify-center gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase text-emerald-400/70">Call GEX</span>
                <button
                  onClick={() => setShowGexBreakdown(v => !v)}
                  title={showGexBreakdown ? 'Hide breakdown' : 'Show calculation breakdown'}
                  className={`p-0.5 rounded transition-all ${showGexBreakdown ? 'text-amber-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                >
                  {showGexBreakdown ? <Eye size={11} /> : <EyeOff size={11} />}
                </button>
              </div>
              <span className="text-[8px] text-zinc-600 font-medium">OI × S² × γ × (−1)</span>
            </div>

            <div className="px-3 py-3 text-[10px] font-black uppercase text-zinc-500 text-center">Call OI</div>
            <div className="px-3 py-3 text-[10px] font-black uppercase text-blue-400/60 text-center">γ Gamma</div>
            <div className="px-3 py-3 text-[10px] font-black uppercase text-zinc-300 text-center">LTP</div>
            <div className="px-3 py-3 text-[11px] font-black uppercase text-amber-500 text-center bg-zinc-900/80">Strike</div>
            <div className="px-3 py-3 text-[10px] font-black uppercase text-zinc-300 text-center">LTP</div>
            <div className="px-3 py-3 text-[10px] font-black uppercase text-red-400/60 text-center">γ Gamma</div>
            <div className="px-3 py-3 text-[10px] font-black uppercase text-zinc-500 text-center">Put OI</div>

            {/* Put GEX header */}
            <div className="px-3 py-2.5 flex flex-col items-center justify-center gap-0.5">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowGexBreakdown(v => !v)}
                  title={showGexBreakdown ? 'Hide breakdown' : 'Show calculation breakdown'}
                  className={`p-0.5 rounded transition-all ${showGexBreakdown ? 'text-amber-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                >
                  {showGexBreakdown ? <Eye size={11} /> : <EyeOff size={11} />}
                </button>
                <span className="text-[10px] font-black uppercase text-rose-400/70">Put GEX</span>
              </div>
              <span className="text-[8px] text-zinc-600 font-medium">OI × S² × γ × (+1)</span>
            </div>

            {/* Net GEX header */}
            <div className="px-3 py-2.5 flex flex-col items-center justify-center gap-0.5 border-l-2 border-zinc-700/50">
              <span className="text-[10px] font-black uppercase text-violet-400/80">Net GEX</span>
              <span className="text-[8px] text-zinc-600 font-medium">Call GEX + Put GEX</span>
            </div>
          </div>
        </div>

        {/* ─── VIRTUALIZED BODY ─── */}
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative', minWidth: '1285px' }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const s       = chain[virtualRow.index];
            const isATM   = s.strike === atmStrike;
            const isITM_CE = s.strike < spotPrice;
            const isITM_PE = s.strike > spotPrice;

            // GEX calculations
            const callGex = s.ce.oi * spotSq * (s.ce.gamma ?? 0) * -1;
            const putGex  = s.pe.oi * spotSq * (s.pe.gamma ?? 0) * 1;
            const netGex  = callGex + putGex;

            return (
              <div
                key={s.strike}
                className="absolute top-0 left-0 w-full grid group hover:bg-zinc-800/40 transition-colors border-b border-zinc-800/25"
                style={{
                  gridTemplateColumns: GRID,
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {/* ── Call GEX ── */}
                <div className="flex flex-col items-center justify-center px-3 gap-0.5 border-r border-zinc-800/30">
                  <span className={`text-[13px] font-bold font-mono tracking-tight ${gexColor(callGex)}`}>
                    {formatGex(callGex)}
                  </span>
                  {showGexBreakdown && (
                    <div className="text-[8px] text-zinc-500 font-mono leading-tight text-center space-y-0.5">
                      <div>OI: <span className="text-zinc-400">{s.ce.oi.toLocaleString()}</span></div>
                      <div>S²: <span className="text-zinc-400">{fmtNum(spotSq)}</span></div>
                      <div>γ: <span className="text-blue-400/80">{(s.ce.gamma ?? 0).toFixed(4)}</span></div>
                    </div>
                  )}
                </div>

                {/* ── Call OI ── */}
                <div className={`flex items-center justify-center relative px-3 text-[12px] font-mono ${getITMBg(isITM_CE, 'ce')}`}>
                  <OIBar value={s.ce.oi} maxValue={maxOI} color="bg-blue-600/40" />
                  <span className="relative z-10 font-bold group-hover:text-blue-200 transition-colors">
                    {formatOI(s.ce.oi)}
                  </span>
                </div>

                {/* ── Call Gamma ── */}
                <div className="flex items-center justify-center px-3 text-[12px] font-mono text-blue-400/80 font-semibold">
                  {(s.ce.gamma ?? 0).toFixed(4)}
                </div>

                {/* ── Call LTP ── */}
                <div className={`flex items-center justify-center px-3 text-[12px] font-mono ${getITMBg(isITM_CE, 'ce')}`}>
                  <LTPCell value={s.ce.ltp} prevValue={s.ce.prevLtp} />
                </div>

                {/* ── Strike ── */}
                <div className="flex items-center justify-center px-2 z-10">
                  <div
                    className={`w-full text-center py-1.5 rounded-xl text-[14px] font-bold transition-all group-hover:scale-[1.03]
                      ${isATM
                        ? 'ring-2 ring-amber-500 text-amber-500 bg-zinc-800 shadow-[0_0_14px_rgba(245,158,11,0.18)]'
                        : 'bg-zinc-800 border border-zinc-700 text-zinc-200'
                      }`}
                  >
                    {s.strike}
                  </div>
                </div>

                {/* ── Put LTP ── */}
                <div className={`flex items-center justify-center px-3 text-[12px] font-mono ${getITMBg(isITM_PE, 'pe')}`}>
                  <LTPCell value={s.pe.ltp} prevValue={s.pe.prevLtp} />
                </div>

                {/* ── Put Gamma ── */}
                <div className="flex items-center justify-center px-3 text-[12px] font-mono text-red-400/80 font-semibold">
                  {(s.pe.gamma ?? 0).toFixed(4)}
                </div>

                {/* ── Put OI ── */}
                <div className={`flex items-center justify-center relative px-3 text-[12px] font-mono ${getITMBg(isITM_PE, 'pe')}`}>
                  <OIBar value={s.pe.oi} maxValue={maxOI} color="bg-red-600/40" isRight />
                  <span className="relative z-10 font-bold group-hover:text-red-200 transition-colors">
                    {formatOI(s.pe.oi)}
                  </span>
                </div>

                {/* ── Put GEX ── */}
                <div className="flex flex-col items-center justify-center px-3 gap-0.5 border-l border-zinc-800/30">
                  <span className={`text-[13px] font-bold font-mono tracking-tight ${gexColor(putGex)}`}>
                    {formatGex(putGex)}
                  </span>
                  {showGexBreakdown && (
                    <div className="text-[8px] text-zinc-500 font-mono leading-tight text-center space-y-0.5">
                      <div>OI: <span className="text-zinc-400">{s.pe.oi.toLocaleString()}</span></div>
                      <div>S²: <span className="text-zinc-400">{fmtNum(spotSq)}</span></div>
                      <div>γ: <span className="text-red-400/80">{(s.pe.gamma ?? 0).toFixed(4)}</span></div>
                    </div>
                  )}
                </div>

                {/* ── Net GEX ── */}
                <div className="flex flex-col items-center justify-center px-3 gap-0.5 border-l-2 border-zinc-700/50 bg-zinc-900/30">
                  <span className={`text-[13px] font-bold font-mono tracking-tight ${gexColor(netGex)}`}>
                    {formatGex(netGex)}
                  </span>
                  {showGexBreakdown && (
                    <div className="text-[8px] text-zinc-500 font-mono leading-tight text-center space-y-0.5">
                      <div>C: <span className="text-emerald-400/70">{formatGex(callGex)}</span></div>
                      <div>P: <span className="text-rose-400/70">{formatGex(putGex)}</span></div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
