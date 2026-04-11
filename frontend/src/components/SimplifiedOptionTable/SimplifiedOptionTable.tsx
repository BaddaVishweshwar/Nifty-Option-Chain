import * as React from 'react';
import { useMemo, useState } from 'react';
import { useOptionChainStore } from '../../store/optionChainStore';
import { LTPCell } from '../OptionChainTable/LTPCell';
import { OIBar } from '../OptionChainTable/OIBar';
import { Eye, EyeOff } from 'lucide-react';

// ─── Single source of truth for column widths ────────────────────────────────
const W = {
  gex:    130,
  oi:     115,
  gamma:   90,
  ltp:    120,
  strike: 150,
  net:    130,
} as const;

// Total min-width = 2*(gex+oi+gamma+ltp) + strike + net
// = 2*(130+115+90+120) + 150 + 130 = 2*455 + 280 = 1190px
const TOTAL_W =
  W.gex + W.oi + W.gamma + W.ltp +
  W.strike +
  W.ltp + W.gamma + W.oi + W.gex + W.net;

// CSS grid template
const GRID_COLS =
  `${W.gex}px ${W.oi}px ${W.gamma}px ${W.ltp}px ` +
  `${W.strike}px ` +
  `${W.ltp}px ${W.gamma}px ${W.oi}px ${W.gex}px ${W.net}px`;

// ─── Formatters ──────────────────────────────────────────────────────────────
const fmtGex = (val: number) => {
  const a = Math.abs(val);
  const s = val < 0 ? '−' : '+';
  if (a >= 1e9) return `${s}${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${s}${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${s}${(a / 1e3).toFixed(1)}K`;
  return `${s}${a.toFixed(0)}`;
};

const fmtBig = (n: number) => {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(2);
};

const gexCls = (v: number) =>
  v < 0 ? 'text-red-400' : v > 0 ? 'text-emerald-400' : 'text-zinc-500';

// ─── Component ───────────────────────────────────────────────────────────────
export const SimplifiedOptionTable: React.FC = () => {
  const { chain, atmStrike, spotPrice, showLots, selectedSymbol } = useOptionChainStore();
  const [showBreakdown, setShowBreakdown] = useState(true);

  const ROW_H = showBreakdown ? 82 : 44;

  const lotSize = useMemo(() => {
    if (selectedSymbol.includes('NIFTYBANK')) return 15;
    if (selectedSymbol.includes('NIFTY50') || selectedSymbol.includes('NIFTY-INDEX')) return 25;
    if (selectedSymbol.includes('FINNIFTY')) return 25;
    if (selectedSymbol.includes('SENSEX')) return 10;
    return 1;
  }, [selectedSymbol]);

  const fmtOI = (v: number) =>
    showLots ? Math.round(v / lotSize).toLocaleString() : v.toLocaleString();

  const spotSq = spotPrice * spotPrice;

  const maxOI = useMemo(() => {
    let m = 0;
    chain.forEach(s => { m = Math.max(m, s.ce.oi, s.pe.oi); });
    return m;
  }, [chain]);

  const itmBg = (isITM: boolean, side: 'ce' | 'pe') =>
    isITM ? (side === 'ce' ? 'bg-blue-600/5' : 'bg-red-600/5') : '';

  // Shared grid style — same object used everywhere
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: GRID_COLS,
    width: `${TOTAL_W}px`,
  };

  const ToggleBtn = (
    <button
      onClick={() => setShowBreakdown(v => !v)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${
        showBreakdown
          ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
          : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300'
      }`}
    >
      {showBreakdown ? <Eye size={11} /> : <EyeOff size={11} />}
      {showBreakdown ? 'Hide Formula' : 'Show Formula'}
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-zinc-950 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-end px-4 py-2 border-b border-zinc-800/60 shrink-0">
        {ToggleBtn}
      </div>
      {/* Outer scroll container */}
      <div className="overflow-auto flex-1 custom-scrollbar">

        {/* ════ STICKY HEADER ════ */}
        <div className="sticky top-0 z-20 bg-zinc-900 border-b border-zinc-800 shadow-lg">

          {/* ── Section labels row ── */}
          <div style={gridStyle} className="border-b border-zinc-800/60">
            {/* Call Side spans 4 cols */}
            <div
              style={{ gridColumn: 'span 4' }}
              className="py-1.5 text-[10px] font-black tracking-[0.25em] text-blue-400/60 text-center uppercase border-r border-zinc-800/50"
            >
              Call Side
            </div>
            {/* Strike: 1 col */}
            <div className="py-1.5 text-[10px] font-black tracking-[0.25em] text-zinc-500 text-center uppercase">
              Strikes
            </div>
            {/* Put Side spans 5 cols */}
            <div
              style={{ gridColumn: 'span 5' }}
              className="py-1.5 text-[10px] font-black tracking-[0.25em] text-red-400/60 text-center uppercase border-l border-zinc-800/50"
            >
              Put Side
            </div>
          </div>

          {/* ── Column label row ── */}
          <div style={gridStyle}>
            {/* 1 - Call GEX */}
            <div className="flex items-center justify-center py-2.5 px-1 border-r border-zinc-800/50">
              <span className="text-[9px] font-black uppercase text-emerald-400/80">Call GEX</span>
            </div>
            {/* 2 - Call OI */}
            <div className="flex items-center justify-center py-2.5 px-1 text-[9px] font-black uppercase text-zinc-400">
              Call OI
            </div>
            {/* 3 - Call Gamma */}
            <div className="flex items-center justify-center py-2.5 px-1 text-[9px] font-black uppercase text-blue-400/70">
              Gamma
            </div>
            {/* 4 - Call LTP */}
            <div className="flex items-center justify-center py-2.5 px-1 text-[9px] font-black uppercase text-zinc-300 border-r border-zinc-800/50">
              LTP
            </div>
            {/* 5 - Strike */}
            <div className="flex items-center justify-center py-2 px-1 text-[10px] font-black uppercase text-amber-500 bg-zinc-900/80">
              Strike
            </div>
            {/* 6 - Put LTP */}
            <div className="flex items-center justify-center py-2.5 px-1 text-[9px] font-black uppercase text-zinc-300 border-l border-zinc-800/50">
              LTP
            </div>
            {/* 7 - Put Gamma */}
            <div className="flex items-center justify-center py-2.5 px-1 text-[9px] font-black uppercase text-red-400/70">
              Gamma
            </div>
            {/* 8 - Put OI */}
            <div className="flex items-center justify-center py-2.5 px-1 text-[9px] font-black uppercase text-zinc-400">
              Put OI
            </div>
            {/* 9 - Put GEX */}
            <div className="flex items-center justify-center py-2.5 px-1 border-l border-zinc-800/50">
              <span className="text-[9px] font-black uppercase text-rose-400/80">Put GEX</span>
            </div>
            {/* 10 - Net GEX */}
            <div className="flex items-center justify-center py-2.5 px-1 border-l-2 border-violet-500/25 bg-violet-950/10">
              <span className="text-[9px] font-black uppercase text-violet-400/90">Net GEX</span>
            </div>
          </div>
        </div>

        {/* ════ DATA ROWS (no virtualization — option chains have ~100-200 rows) ════ */}
        <div style={{ width: `${TOTAL_W}px` }}>
          {chain.map(s => {
            const isATM    = s.strike === atmStrike;
            const isITM_CE = s.strike < spotPrice;
            const isITM_PE = s.strike > spotPrice;

            const callGex = s.ce.oi * spotSq * (s.ce.gamma ?? 0) * -1;
            const putGex  = s.pe.oi * spotSq * (s.pe.gamma ?? 0);
            const netGex  = callGex + putGex;

            const ceG = (s.ce.gamma ?? 0).toFixed(4);
            const peG = (s.pe.gamma ?? 0).toFixed(4);

            return (
              <div
                key={s.strike}
                style={{ ...gridStyle, height: `${ROW_H}px` }}
                className="group hover:bg-zinc-800/40 transition-colors border-b border-zinc-800/20"
              >
                {/* ── 1: Call GEX ── */}
                <div className="flex flex-col items-center justify-center px-2 gap-0.5 border-r border-zinc-800/30">
                  <span className={`text-[12px] font-bold font-mono leading-none ${gexCls(callGex)}`}>
                    {fmtGex(callGex)}
                  </span>
                  {showBreakdown && (
                    <div className="text-[7px] font-mono leading-tight text-center mt-0.5">
                      <div>
                        <span className="text-zinc-600">OI </span>
                        <span className="text-zinc-400">{s.ce.oi.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-zinc-600">S² </span>
                        <span className="text-zinc-400">{fmtBig(spotSq)}</span>
                      </div>
                      <div>
                        <span className="text-zinc-600">γ </span>
                        <span className="text-blue-400/80">{ceG}</span>
                        <span className="text-zinc-700"> ×−1</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── 2: Call OI ── */}
                <div className={`flex items-center justify-center relative px-2 text-[11px] font-mono ${itmBg(isITM_CE, 'ce')}`}>
                  <OIBar value={s.ce.oi} maxValue={maxOI} color="bg-blue-600/30" />
                  <span className="relative z-10 font-semibold group-hover:text-blue-200 transition-colors">
                    {fmtOI(s.ce.oi)}
                  </span>
                </div>

                {/* ── 3: Call γ ── */}
                <div className="flex items-center justify-center px-1 text-[11px] font-mono text-blue-400/70 tabular-nums">
                  {ceG}
                </div>

                {/* ── 4: Call LTP ── */}
                <div className={`flex items-center justify-center px-2 text-[11px] font-mono border-r border-zinc-800/30 ${itmBg(isITM_CE, 'ce')}`}>
                  <LTPCell value={s.ce.ltp} prevValue={s.ce.prevLtp} />
                </div>

                {/* ── 5: Strike ── */}
                <div className="flex items-center justify-center px-2">
                  <div className={`w-full text-center py-1 rounded-lg text-[13px] font-black transition-all group-hover:scale-[1.03] ${
                    isATM
                      ? 'ring-2 ring-amber-500 text-amber-400 bg-zinc-800 shadow-[0_0_12px_rgba(245,158,11,0.12)]'
                      : 'bg-zinc-800 border border-zinc-700/60 text-zinc-200'
                  }`}>
                    {s.strike}
                  </div>
                </div>

                {/* ── 6: Put LTP ── */}
                <div className={`flex items-center justify-center px-2 text-[11px] font-mono border-l border-zinc-800/30 ${itmBg(isITM_PE, 'pe')}`}>
                  <LTPCell value={s.pe.ltp} prevValue={s.pe.prevLtp} />
                </div>

                {/* ── 7: Put γ ── */}
                <div className="flex items-center justify-center px-1 text-[11px] font-mono text-red-400/70 tabular-nums">
                  {peG}
                </div>

                {/* ── 8: Put OI ── */}
                <div className={`flex items-center justify-center relative px-2 text-[11px] font-mono ${itmBg(isITM_PE, 'pe')}`}>
                  <OIBar value={s.pe.oi} maxValue={maxOI} color="bg-red-600/30" isRight />
                  <span className="relative z-10 font-semibold group-hover:text-red-200 transition-colors">
                    {fmtOI(s.pe.oi)}
                  </span>
                </div>

                {/* ── 9: Put GEX ── */}
                <div className="flex flex-col items-center justify-center px-2 gap-0.5 border-l border-zinc-800/30">
                  <span className={`text-[12px] font-bold font-mono leading-none ${gexCls(putGex)}`}>
                    {fmtGex(putGex)}
                  </span>
                  {showBreakdown && (
                    <div className="text-[7px] font-mono leading-tight text-center mt-0.5">
                      <div>
                        <span className="text-zinc-600">OI </span>
                        <span className="text-zinc-400">{s.pe.oi.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-zinc-600">S² </span>
                        <span className="text-zinc-400">{fmtBig(spotSq)}</span>
                      </div>
                      <div>
                        <span className="text-zinc-600">γ </span>
                        <span className="text-red-400/80">{peG}</span>
                        <span className="text-zinc-700"> ×+1</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── 10: Net GEX ── */}
                <div className="flex flex-col items-center justify-center px-2 gap-0.5 border-l-2 border-violet-500/20 bg-violet-950/10">
                  <span className={`text-[12px] font-bold font-mono leading-none ${gexCls(netGex)}`}>
                    {fmtGex(netGex)}
                  </span>
                  {showBreakdown && (
                    <div className="text-[7px] font-mono leading-tight text-center mt-0.5">
                      <div>
                        <span className="text-zinc-600">C </span>
                        <span className="text-emerald-400/80">{fmtGex(callGex)}</span>
                      </div>
                      <div>
                        <span className="text-zinc-600">P </span>
                        <span className="text-rose-400/80">{fmtGex(putGex)}</span>
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
