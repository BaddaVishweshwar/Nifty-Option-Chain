import * as React from 'react';
import { useMemo, useState } from 'react';
import { useOptionChainStore } from '../../store/optionChainStore';
import { LTPCell } from '../OptionChainTable/LTPCell';
import { OIBar } from '../OptionChainTable/OIBar';
import { Eye, EyeOff } from 'lucide-react';

// ─── Column widths (single source of truth) ───────────────────────────────────
// Columns L→R:
// [CallGEX] [CallOI] [CallGamma] [CallLTP] | [Strike] | [PutLTP] [PutGamma] [PutOI] [PutGEX] [NetGEX]
const CW = {
  callGex:   130,
  callOI:    115,
  callGamma:  92,
  callLTP:   118,
  strike:    150,
  putLTP:    118,
  putGamma:   92,
  putOI:     115,
  putGex:    130,
  netGex:    130,
  signal:    90,
} as const;

// Helpers ─────────────────────────────────────────────────────────────────────
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

// Component ───────────────────────────────────────────────────────────────────
export const SimplifiedOptionTable: React.FC = () => {
  const { chain, atmStrike, spotPrice, showLots, lotSize, selectedSymbol } = useOptionChainStore();
  const [showBreakdown, setShowBreakdown] = useState(true);

  const fmtOI = (v: number) =>
    showLots ? Math.round(v / lotSize).toLocaleString() : v.toLocaleString();

  const spotSq = spotPrice * spotPrice;

  const maxOI = useMemo(() => {
    let m = 0;
    chain.forEach(s => { m = Math.max(m, s.ce.oi, s.pe.oi); });
    return m;
  }, [chain]);

  const ROW_H = showBreakdown ? 80 : 44;

  const itmBg = (itm: boolean, side: 'ce' | 'pe') =>
    itm ? (side === 'ce' ? 'bg-blue-600/5' : 'bg-red-600/5') : '';

  const EyeToggle = (
    <button
      onClick={() => setShowBreakdown(v => !v)}
      title={showBreakdown ? 'Hide numbers' : 'Show formula numbers'}
      className={`inline-flex p-0.5 rounded transition-all ml-1 ${
        showBreakdown ? 'text-amber-400' : 'text-zinc-600 hover:text-zinc-300'
      }`}
    >
      {showBreakdown ? <Eye size={11} /> : <EyeOff size={11} />}
    </button>
  );

  // Shared th / td styles
  const thBase = 'text-center align-middle whitespace-nowrap px-2';
  const tdBase = 'text-center align-middle whitespace-nowrap px-2 border-b border-zinc-800/20';

  return (
    <div className="h-full overflow-auto custom-scrollbar bg-zinc-950">
      {/*
        HTML <table> with table-layout:fixed + <colgroup> is the ONLY guaranteed
        way to align header cells with data cells. The browser enforces it.
      */}
      <table
        className="border-collapse"
        style={{ tableLayout: 'fixed', width: Object.values(CW).reduce((a, b) => a + b, 0) }}
      >
        {/* ─── COLGROUP: column widths enforced here, used by thead & tbody ─── */}
        <colgroup>
          <col style={{ width: CW.callGex }} />
          <col style={{ width: CW.callOI }} />
          <col style={{ width: CW.callGamma }} />
          <col style={{ width: CW.callLTP }} />
          <col style={{ width: CW.strike }} />
          <col style={{ width: CW.putLTP }} />
          <col style={{ width: CW.putGamma }} />
          <col style={{ width: CW.putOI }} />
          <col style={{ width: CW.putGex }} />
          <col style={{ width: CW.netGex }} />
          <col style={{ width: CW.signal }} />
        </colgroup>

        {/* ─── THEAD (sticky) ─── */}
        <thead className="sticky top-0 z-20 bg-zinc-900 shadow-lg">

          {/* Row 1: Section labels */}
          <tr className="border-b border-zinc-800/60">
            <th
              colSpan={4}
              className={`${thBase} py-1.5 text-[10px] font-black tracking-[0.25em] text-blue-400/60 uppercase border-r border-zinc-800/50`}
            >
              Call Side
            </th>
            <th
              colSpan={1}
              className={`${thBase} py-1.5 text-[10px] font-black tracking-[0.25em] text-zinc-500 uppercase`}
            >
              Strikes
            </th>
            <th
              colSpan={6}
              className={`${thBase} py-1.5 text-[10px] font-black tracking-[0.25em] text-red-400/60 uppercase border-l border-zinc-800/50`}
            >
              Put Side
            </th>
          </tr>

          {/* Row 2: Column labels */}
          <tr className="border-b border-zinc-800">
            {/* Call GEX */}
            <th className={`${thBase} py-2 border-r border-zinc-800/50`}>
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center">
                  <span className="text-[9px] font-black uppercase text-emerald-400/80">Call GEX</span>
                  {EyeToggle}
                </div>
                <span className="text-[7px] text-zinc-600 leading-none font-normal">OI × S² × γ × −1</span>
              </div>
            </th>
            {/* Call OI */}
            <th className={`${thBase} py-2.5 text-[9px] font-black uppercase text-zinc-400`}>
              Call OI
            </th>
            {/* Call γ */}
            <th className={`${thBase} py-2.5 text-[9px] font-black uppercase text-blue-400/70`}>
              GAMMA
            </th>
            {/* Call LTP */}
            <th className={`${thBase} py-2.5 text-[9px] font-black uppercase text-zinc-300 border-r border-zinc-800/50`}>
              LTP
            </th>
            {/* Strike */}
            <th className={`${thBase} py-2.5 text-[10px] font-black uppercase text-amber-500 bg-zinc-900/80`}>
              Strike
            </th>
            {/* Put LTP */}
            <th className={`${thBase} py-2.5 text-[9px] font-black uppercase text-zinc-300 border-l border-zinc-800/50`}>
              LTP
            </th>
            {/* Put γ */}
            <th className={`${thBase} py-2.5 text-[9px] font-black uppercase text-red-400/70`}>
              GAMMA
            </th>
            {/* Put OI */}
            <th className={`${thBase} py-2.5 text-[9px] font-black uppercase text-zinc-400`}>
              Put OI
            </th>
            {/* Put GEX */}
            <th className={`${thBase} py-2 border-l border-zinc-800/50`}>
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center">
                  {EyeToggle}
                  <span className="text-[9px] font-black uppercase text-rose-400/80">Put GEX</span>
                </div>
                <span className="text-[7px] text-zinc-600 leading-none font-normal">OI × S² × γ × +1</span>
              </div>
            </th>
            {/* Net GEX */}
            <th className={`${thBase} py-2 border-l border-violet-500/30 bg-violet-950/10`}>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[9px] font-black uppercase text-violet-400/90">Net GEX</span>
                <span className="text-[7px] text-zinc-600 leading-none font-normal">C + P</span>
              </div>
            </th>
            {/* Signal */}
            <th className={`${thBase} py-2 border-l border-zinc-800/50`}>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[9px] font-black uppercase text-zinc-400/90">Signal</span>
              </div>
            </th>
          </tr>
        </thead>

        {/* ─── TBODY ─── */}
        <tbody>
          {chain.map(s => {
            const isATM    = s.strike === atmStrike;
            const isITM_CE = s.strike < spotPrice;
            const isITM_PE = s.strike > spotPrice;

            const callGex = s.ce.oi * spotSq * (s.ce.gamma ?? 0) * -1;
            const putGex  = s.pe.oi * spotSq * (s.pe.gamma ?? 0);
            const netGex  = callGex + putGex;
            const ceG = (s.ce.gamma ?? 0).toFixed(4);
            const peG = (s.pe.gamma ?? 0).toFixed(4);

            const trCls = `group hover:bg-zinc-800/40 transition-colors`;

            return (
              <tr key={s.strike} className={trCls} style={{ height: ROW_H }}>

                {/* ── Call GEX ── */}
                <td className={`${tdBase} border-r border-zinc-800/30`}>
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <span className={`text-[12px] font-bold font-mono ${gexCls(callGex)}`}>
                      {fmtGex(callGex)}
                    </span>
                    {showBreakdown && (
                      <div className="text-[7px] font-mono text-center leading-tight mt-0.5 space-y-[1px]">
                        <div><span className="text-zinc-600">OI </span><span className="text-zinc-400">{s.ce.oi.toLocaleString()}</span></div>
                        <div><span className="text-zinc-600">S² </span><span className="text-zinc-400">{fmtBig(spotSq)}</span></div>
                        <div><span className="text-zinc-600">γ </span><span className="text-blue-400/80">{ceG}</span><span className="text-zinc-700"> ×−1</span></div>
                      </div>
                    )}
                  </div>
                </td>

                {/* ── Call OI ── */}
                <td className={`${tdBase} ${itmBg(isITM_CE, 'ce')} relative`}>
                  <OIBar value={s.ce.oi} maxValue={maxOI} color="bg-blue-600/30" />
                  <span className="relative z-10 text-[11px] font-semibold font-mono group-hover:text-blue-200 transition-colors">
                    {fmtOI(s.ce.oi)}
                  </span>
                </td>

                {/* ── Call γ ── */}
                <td className={`${tdBase} text-[11px] font-mono text-blue-400/70`}>
                  {ceG}
                </td>

                {/* ── Call LTP ── */}
                <td className={`${tdBase} ${itmBg(isITM_CE, 'ce')} border-r border-zinc-800/30`}>
                  <LTPCell value={s.ce.ltp} prevValue={s.ce.prevLtp} />
                </td>

                {/* ── Strike ── */}
                <td className={`${tdBase}`}>
                  <div className={`mx-1 py-1 rounded-lg text-[13px] font-black transition-all group-hover:scale-[1.03] ${
                    isATM
                      ? 'ring-2 ring-amber-500 text-amber-400 bg-zinc-800 shadow-[0_0_12px_rgba(245,158,11,0.12)]'
                      : 'bg-zinc-800 border border-zinc-700/60 text-zinc-200'
                  }`}>
                    {s.strike}
                  </div>
                </td>

                {/* ── Put LTP ── */}
                <td className={`${tdBase} ${itmBg(isITM_PE, 'pe')} border-l border-zinc-800/30`}>
                  <LTPCell value={s.pe.ltp} prevValue={s.pe.prevLtp} />
                </td>

                {/* ── Put γ ── */}
                <td className={`${tdBase} text-[11px] font-mono text-red-400/70`}>
                  {peG}
                </td>

                {/* ── Put OI ── */}
                <td className={`${tdBase} ${itmBg(isITM_PE, 'pe')} relative`}>
                  <OIBar value={s.pe.oi} maxValue={maxOI} color="bg-red-600/30" isRight />
                  <span className="relative z-10 text-[11px] font-semibold font-mono group-hover:text-red-200 transition-colors">
                    {fmtOI(s.pe.oi)}
                  </span>
                </td>

                {/* ── Put GEX ── */}
                <td className={`${tdBase} border-l border-zinc-800/30`}>
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <span className={`text-[12px] font-bold font-mono ${gexCls(putGex)}`}>
                      {fmtGex(putGex)}
                    </span>
                    {showBreakdown && (
                      <div className="text-[7px] font-mono text-center leading-tight mt-0.5 space-y-[1px]">
                        <div><span className="text-zinc-600">OI </span><span className="text-zinc-400">{s.pe.oi.toLocaleString()}</span></div>
                        <div><span className="text-zinc-600">S² </span><span className="text-zinc-400">{fmtBig(spotSq)}</span></div>
                        <div><span className="text-zinc-600">γ </span><span className="text-red-400/80">{peG}</span><span className="text-zinc-700"> ×+1</span></div>
                      </div>
                    )}
                  </div>
                </td>

                {/* ── Net GEX ── */}
                <td className={`${tdBase} border-l border-violet-500/30 bg-violet-950/10`}>
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <span className={`text-[12px] font-bold font-mono ${gexCls(netGex)}`}>
                      {fmtGex(netGex)}
                    </span>
                    {showBreakdown && (
                      <div className="text-[7px] font-mono text-center leading-tight mt-0.5 space-y-[1px]">
                        <div><span className="text-zinc-600">C </span><span className="text-emerald-400/80">{fmtGex(callGex)}</span></div>
                        <div><span className="text-zinc-600">P </span><span className="text-rose-400/80">{fmtGex(putGex)}</span></div>
                      </div>
                    )}
                  </div>
                </td>

                {/* ── Signal ── */}
                <td className={`${tdBase} border-l border-zinc-800/30 bg-zinc-900/40`}>
                  <div className="flex flex-col items-center justify-center">
                    {netGex > 0 && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400/90 bg-emerald-400/10 px-2 py-0.5 rounded shadow-sm">Positive</span>
                    )}
                    {netGex < 0 && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-400/90 bg-rose-400/10 px-2 py-0.5 rounded shadow-sm">Negative</span>
                    )}
                  </div>
                </td>

              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
