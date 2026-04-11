import * as React from 'react';
import { useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useOptionChainStore } from '../../store/optionChainStore';
import { LTPCell } from '../OptionChainTable/LTPCell';
import { OIBar } from '../OptionChainTable/OIBar';
import { Eye, EyeOff } from 'lucide-react';

// ─── Column widths: single source of truth ───────────────────────────────────
// 10 columns (L→R):
// [CallGEX] [CallOI] [CallGamma] [CallLTP] | [STRIKE] | [PutLTP] [PutGamma] [PutOI] [PutGEX] [NetGEX]
const COLS = {
  gex:    '130px',   // Call/Put GEX
  oi:     '120px',   // OI
  gamma:  '100px',   // Gamma
  ltp:    '125px',   // LTP
  strike: '155px',   // Strike
  net:    '130px',   // Net GEX
} as const;

// The grid template applied identically to EVERY row (header section, header labels, data)
const GRID = [
  COLS.gex,    // col 1  — Call GEX
  COLS.oi,     // col 2  — Call OI
  COLS.gamma,  // col 3  — Call Gamma
  COLS.ltp,    // col 4  — Call LTP
  COLS.strike, // col 5  — Strike
  COLS.ltp,    // col 6  — Put LTP
  COLS.gamma,  // col 7  — Put Gamma
  COLS.oi,     // col 8  — Put OI
  COLS.gex,    // col 9  — Put GEX
  COLS.net,    // col 10 — Net GEX
].join(' ');

// Total pixel width so horizontal scroll kicks in before columns collapse
// 130+120+100+125+155+125+100+120+130+130 = 1235px
const MIN_WIDTH = '1235px';

// Grid column spans for section labels row
// Call Side: cols 1-4  → span 4
// Strike:    col  5    → span 1
// Put Side:  cols 6-10 → span 5
const CALL_SPAN = 4;
const PUT_SPAN  = 5;

// ─── Formatters ──────────────────────────────────────────────────────────────
const formatGex = (val: number): string => {
  const abs  = Math.abs(val);
  const sign = val < 0 ? '−' : '+';
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${abs.toFixed(0)}`;
};

const fmtBig = (n: number): string => {
  if (n >= 1e9) return `${(n / 1e9).toFixed(3)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(2);
};

const gexColor = (val: number) =>
  val < 0 ? 'text-red-400' : val > 0 ? 'text-emerald-400' : 'text-zinc-500';

// ─── Component ───────────────────────────────────────────────────────────────
export const SimplifiedOptionTable: React.FC = () => {
  const { chain, atmStrike, spotPrice, showLots, selectedSymbol } = useOptionChainStore();
  const parentRef = useRef<HTMLDivElement>(null);

  // Breakdown visible by default
  const [showBreakdown, setShowBreakdown] = useState(true);

  const ROW_H     = showBreakdown ? 88 : 46;

  const lotSize = useMemo(() => {
    if (selectedSymbol.includes('NIFTYBANK')) return 15;
    if (selectedSymbol.includes('NIFTY50') || selectedSymbol.includes('NIFTY-INDEX')) return 25;
    if (selectedSymbol.includes('FINNIFTY')) return 25;
    if (selectedSymbol.includes('SENSEX')) return 10;
    return 1;
  }, [selectedSymbol]);

  const formatOI = (val: number) =>
    showLots ? Math.round(val / lotSize).toLocaleString() : val.toLocaleString();

  const spotSq = spotPrice * spotPrice;

  const maxOI = useMemo(() => {
    let max = 0;
    chain.forEach(s => { max = Math.max(max, s.ce.oi, s.pe.oi); });
    return max;
  }, [chain]);

  const rowVirtualizer = useVirtualizer({
    count: chain.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_H,
    overscan: 12,
  });

  React.useEffect(() => {
    rowVirtualizer.measure();
  }, [showBreakdown]);

  const itmBg = (isITM: boolean, side: 'ce' | 'pe') =>
    isITM ? (side === 'ce' ? 'bg-blue-600/5' : 'bg-red-600/5') : '';

  // ── Shared grid style ──────────────────────────────────────────────────────
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: GRID,
    minWidth: MIN_WIDTH,
  };

  // ── Eye toggle button ──────────────────────────────────────────────────────
  const EyeBtn = () => (
    <button
      onClick={() => setShowBreakdown(v => !v)}
      title={showBreakdown ? 'Hide formula numbers' : 'Show formula numbers'}
      className={`ml-1 p-0.5 rounded transition-all ${
        showBreakdown ? 'text-amber-400' : 'text-zinc-600 hover:text-zinc-300'
      }`}
    >
      {showBreakdown ? <Eye size={12} /> : <EyeOff size={12} />}
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-zinc-950 overflow-hidden">
      <div ref={parentRef} className="overflow-auto h-full custom-scrollbar">

        {/* ═══════════════ STICKY HEADER ═══════════════ */}
        <div className="sticky top-0 z-20 bg-zinc-900 border-b border-zinc-800 shadow-lg">

          {/* ── Row 1: Section labels — SAME grid as everything else ── */}
          <div style={gridStyle} className="border-b border-zinc-800/60">
            {/* Call Side — spans cols 1-4 */}
            <div
              style={{ gridColumn: `span ${CALL_SPAN}` }}
              className="py-1.5 text-[10px] font-black text-blue-400/60 tracking-[0.3em] text-center uppercase border-r border-zinc-800/50"
            >
              Call Side
            </div>

            {/* Strike — spans col 5 */}
            <div className="py-1.5 text-[10px] font-black text-zinc-500 tracking-[0.3em] text-center uppercase">
              Strikes
            </div>

            {/* Put Side — spans cols 6-10 */}
            <div
              style={{ gridColumn: `span ${PUT_SPAN}` }}
              className="py-1.5 text-[10px] font-black text-red-400/60 tracking-[0.3em] text-center uppercase border-l border-zinc-800/50"
            >
              Put Side
            </div>
          </div>

          {/* ── Row 2: Column labels — same grid ── */}
          <div style={gridStyle}>
            {/* Call GEX */}
            <div className="px-3 py-2 flex flex-col items-center justify-center gap-0.5 border-r border-zinc-800/40">
              <div className="flex items-center">
                <span className="text-[10px] font-black uppercase text-emerald-400/80">Call GEX</span>
                <EyeBtn />
              </div>
              <span className="text-[8px] text-zinc-600">OI × S² × γ × (−1)</span>
            </div>

            {/* Call OI */}
            <div className="px-3 py-2.5 text-[10px] font-black uppercase text-zinc-400 text-center flex items-center justify-center">
              Call OI
            </div>

            {/* Call Gamma */}
            <div className="px-3 py-2.5 text-[10px] font-black uppercase text-blue-400/70 text-center flex items-center justify-center">
              γ
            </div>

            {/* Call LTP */}
            <div className="px-3 py-2.5 text-[10px] font-black uppercase text-zinc-300 text-center flex items-center justify-center border-r border-zinc-800/40">
              LTP
            </div>

            {/* Strike */}
            <div className="px-3 py-2.5 text-[11px] font-black uppercase text-amber-500 text-center flex items-center justify-center bg-zinc-900/80">
              Strike
            </div>

            {/* Put LTP */}
            <div className="px-3 py-2.5 text-[10px] font-black uppercase text-zinc-300 text-center flex items-center justify-center border-l border-zinc-800/40">
              LTP
            </div>

            {/* Put Gamma */}
            <div className="px-3 py-2.5 text-[10px] font-black uppercase text-red-400/70 text-center flex items-center justify-center">
              γ
            </div>

            {/* Put OI */}
            <div className="px-3 py-2.5 text-[10px] font-black uppercase text-zinc-400 text-center flex items-center justify-center">
              Put OI
            </div>

            {/* Put GEX */}
            <div className="px-3 py-2 flex flex-col items-center justify-center gap-0.5 border-l border-zinc-800/40">
              <div className="flex items-center">
                <EyeBtn />
                <span className="text-[10px] font-black uppercase text-rose-400/80">Put GEX</span>
              </div>
              <span className="text-[8px] text-zinc-600">OI × S² × γ × (+1)</span>
            </div>

            {/* Net GEX */}
            <div className="px-3 py-2 flex flex-col items-center justify-center gap-0.5 border-l-2 border-violet-500/20 bg-violet-950/10">
              <span className="text-[10px] font-black uppercase text-violet-400/90">Net GEX</span>
              <span className="text-[8px] text-zinc-600">C.GEX + P.GEX</span>
            </div>
          </div>
        </div>

        {/* ═══════════════ VIRTUALIZED BODY ═══════════════ */}
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative', minWidth: MIN_WIDTH }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const s        = chain[virtualRow.index];
            const isATM    = s.strike === atmStrike;
            const isITM_CE = s.strike < spotPrice;
            const isITM_PE = s.strike > spotPrice;

            const callGex = s.ce.oi * spotSq * (s.ce.gamma ?? 0) * -1;
            const putGex  = s.pe.oi * spotSq * (s.pe.gamma ?? 0);
            const netGex  = callGex + putGex;

            return (
              <div
                key={s.strike}
                className="absolute top-0 left-0 w-full group hover:bg-zinc-800/40 transition-colors border-b border-zinc-800/20"
                style={{
                  ...gridStyle,
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {/* ── Call GEX ── */}
                <div className="flex flex-col items-center justify-center px-2 gap-0.5 border-r border-zinc-800/30">
                  <span className={`text-[13px] font-bold font-mono ${gexColor(callGex)}`}>
                    {formatGex(callGex)}
                  </span>
                  {showBreakdown && (
                    <div className="text-[8px] font-mono leading-none text-center space-y-[2px] mt-0.5">
                      <div className="text-zinc-600">
                        OI <span className="text-zinc-400">{s.ce.oi.toLocaleString()}</span>
                      </div>
                      <div className="text-zinc-600">
                        S² <span className="text-zinc-400">{fmtBig(spotSq)}</span>
                      </div>
                      <div className="text-zinc-600">
                        γ <span className="text-blue-400/90">{(s.ce.gamma ?? 0).toFixed(4)}</span>
                        <span className="text-zinc-600 ml-1">× −1</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Call OI ── */}
                <div className={`flex items-center justify-center relative px-2 text-[12px] font-mono ${itmBg(isITM_CE, 'ce')}`}>
                  <OIBar value={s.ce.oi} maxValue={maxOI} color="bg-blue-600/35" />
                  <span className="relative z-10 font-semibold group-hover:text-blue-200 transition-colors">
                    {formatOI(s.ce.oi)}
                  </span>
                </div>

                {/* ── Call Gamma ── */}
                <div className="flex items-center justify-center px-2 text-[12px] font-mono text-blue-400/80">
                  {(s.ce.gamma ?? 0).toFixed(4)}
                </div>

                {/* ── Call LTP ── */}
                <div className={`flex items-center justify-center px-2 text-[12px] font-mono border-r border-zinc-800/30 ${itmBg(isITM_CE, 'ce')}`}>
                  <LTPCell value={s.ce.ltp} prevValue={s.ce.prevLtp} />
                </div>

                {/* ── Strike ── */}
                <div className="flex items-center justify-center px-2">
                  <div className={`w-full text-center py-1.5 rounded-xl text-[13px] font-black transition-all group-hover:scale-[1.04] ${
                    isATM
                      ? 'ring-2 ring-amber-500 text-amber-400 bg-zinc-800 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                      : 'bg-zinc-800 border border-zinc-700/60 text-zinc-200'
                  }`}>
                    {s.strike}
                  </div>
                </div>

                {/* ── Put LTP ── */}
                <div className={`flex items-center justify-center px-2 text-[12px] font-mono border-l border-zinc-800/30 ${itmBg(isITM_PE, 'pe')}`}>
                  <LTPCell value={s.pe.ltp} prevValue={s.pe.prevLtp} />
                </div>

                {/* ── Put Gamma ── */}
                <div className="flex items-center justify-center px-2 text-[12px] font-mono text-red-400/80">
                  {(s.pe.gamma ?? 0).toFixed(4)}
                </div>

                {/* ── Put OI ── */}
                <div className={`flex items-center justify-center relative px-2 text-[12px] font-mono ${itmBg(isITM_PE, 'pe')}`}>
                  <OIBar value={s.pe.oi} maxValue={maxOI} color="bg-red-600/35" isRight />
                  <span className="relative z-10 font-semibold group-hover:text-red-200 transition-colors">
                    {formatOI(s.pe.oi)}
                  </span>
                </div>

                {/* ── Put GEX ── */}
                <div className="flex flex-col items-center justify-center px-2 gap-0.5 border-l border-zinc-800/30">
                  <span className={`text-[13px] font-bold font-mono ${gexColor(putGex)}`}>
                    {formatGex(putGex)}
                  </span>
                  {showBreakdown && (
                    <div className="text-[8px] font-mono leading-none text-center space-y-[2px] mt-0.5">
                      <div className="text-zinc-600">
                        OI <span className="text-zinc-400">{s.pe.oi.toLocaleString()}</span>
                      </div>
                      <div className="text-zinc-600">
                        S² <span className="text-zinc-400">{fmtBig(spotSq)}</span>
                      </div>
                      <div className="text-zinc-600">
                        γ <span className="text-red-400/90">{(s.pe.gamma ?? 0).toFixed(4)}</span>
                        <span className="text-zinc-600 ml-1">× +1</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Net GEX ── */}
                <div className="flex flex-col items-center justify-center px-2 gap-0.5 border-l-2 border-violet-500/20 bg-violet-950/10">
                  <span className={`text-[13px] font-bold font-mono ${gexColor(netGex)}`}>
                    {formatGex(netGex)}
                  </span>
                  {showBreakdown && (
                    <div className="text-[8px] font-mono leading-none text-center space-y-[2px] mt-0.5">
                      <div className="text-zinc-600">
                        C <span className="text-emerald-400/80">{formatGex(callGex)}</span>
                      </div>
                      <div className="text-zinc-600">
                        P <span className="text-rose-400/80">{formatGex(putGex)}</span>
                      </div>
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
