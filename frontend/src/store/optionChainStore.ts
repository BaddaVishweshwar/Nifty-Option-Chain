import { create } from 'zustand';
import { OptionStrike, TickUpdate } from '../types/optionChain';
import { calculateGreeks } from '../utils/greeks';

interface OptionChainState {
  selectedSymbol: string;
  selectedExpiry: string;
  chain: OptionStrike[];
  spotPrice: number;
  atmStrike: number;
  pcr: number;
  maxPain: number;
  connected: boolean;
  showLots: boolean;
  lastUpdate: Date | null;

  setSymbol: (symbol: string) => void;
  setExpiry: (expiry: string) => void;
  toggleLots: () => void;
  setChainSnapshot: (chain: OptionStrike[], spot: number) => void;
  applyTick: (ticks: TickUpdate[]) => void;
  setConnectionStatus: (connected: boolean) => void;
  updateStats: (pcr: number, maxPain: number) => void;
}

export const useOptionChainStore = create<OptionChainState>((set) => ({
  selectedSymbol: 'NSE:NIFTYBANK-INDEX',
  selectedExpiry: '',
  chain: [],
  spotPrice: 0,
  atmStrike: 0,
  pcr: 0,
  maxPain: 0,
  connected: false,
  showLots: false,
  lastUpdate: null,

  setSymbol: (symbol: string) => set({ selectedSymbol: symbol }),
  setExpiry: (expiry: string) => set({ selectedExpiry: expiry }),
  toggleLots: () => set((state) => ({ showLots: !state.showLots })),
  
  setChainSnapshot: (chain: OptionStrike[], spot: number) => {
    const atm = chain.length > 0 ? chain.reduce((prev, curr) =>
      Math.abs(curr.strike - spot) < Math.abs(prev.strike - spot) ? curr : prev
    ).strike : 0;
    
    // Calculate PCR
    let totalCE_OI = 0;
    let totalPE_OI = 0;
    chain.forEach(s => {
      totalCE_OI += s.ce.oi;
      totalPE_OI += s.pe.oi;
    });
    const pcr = totalCE_OI > 0 ? totalPE_OI / totalCE_OI : 0;

    // Calculate Max Pain (Simple version: Strike with minimum total value)
    let maxPain = 0;
    if (chain.length > 0) {
      let minPain = Infinity;
      chain.forEach(s => {
        let currentStrikePain = 0;
        chain.forEach(compare => {
          // CE Pain: Max(0, CompareStrike - TargetStrike) * OI
          if (compare.strike > s.strike) {
            currentStrikePain += (compare.strike - s.strike) * compare.ce.oi;
          }
          // PE Pain: Max(0, TargetStrike - CompareStrike) * OI
          if (compare.strike < s.strike) {
            currentStrikePain += (s.strike - compare.strike) * compare.pe.oi;
          }
        });
        if (currentStrikePain < minPain) {
          minPain = currentStrikePain;
          maxPain = s.strike;
        }
      });
    }
    
    set({ chain, spotPrice: spot, atmStrike: atm, pcr, maxPain, lastUpdate: new Date() });
  },

  applyTick: (ticks: TickUpdate[]) => set((state) => {
    const newChain = [...state.chain];
    let newSpot = state.spotPrice;
    let spotChanged = false;

    // Sync parameters with backend
    const riskFreeRate = 0.07;
    const q = 0;
    let t = 1 / (24 * 365); // 1 hour floor
    if (state.selectedExpiry) {
        const now = new Date();
        const expiry = new Date(state.selectedExpiry);
        // Match backend UTC 10:00 (3:30 PM IST)
        expiry.setUTCHours(10, 0, 0, 0); 
        const diffMs = expiry.getTime() - now.getTime();
        t = Math.max(1 / (24 * 365), diffMs / (1000 * 60 * 60 * 24 * 365));
    }

    ticks.forEach((tick: TickUpdate) => {
      if (tick.symbol === state.selectedSymbol) {
        newSpot = tick.ltp;
        spotChanged = true;
      }

      const strikeIndex = newChain.findIndex(s => s.ce.symbol === tick.symbol || s.pe.symbol === tick.symbol);
      if (strikeIndex !== -1) {
        const strike = { ...newChain[strikeIndex] };
        const isCE = strike.ce.symbol === tick.symbol;
        const leg = isCE ? { ...strike.ce } : { ...strike.pe };

        leg.prevLtp = leg.ltp;
        leg.ltp = tick.ltp;
        if (tick.oi !== undefined) leg.oi = tick.oi;
        if (tick.oich !== undefined) leg.oiChange = tick.oich;
        if (tick.iv !== undefined) leg.iv = tick.iv;

        // Use Synthetic Spot for Greeks if available (spotChanged will refresh all anyway)
        if (newSpot > 0 && t > 0) {
            const vol = (leg.iv > 0 ? leg.iv : 15.0) / 100;
            const greeks = calculateGreeks(isCE ? "CE" : "PE", newSpot, strike.strike, t, riskFreeRate, vol, q);
            Object.assign(leg, greeks);
        }

        if (isCE) strike.ce = leg; else strike.pe = leg;
        newChain[strikeIndex] = strike;
      }
    });

    // If spot changed, refresh all Greeks for consistency
    if (spotChanged && newChain.length > 0 && t > 0) {
      newChain.forEach((strike, idx) => {
        const updatedStrike = { ...strike };
        
        // Update CE
        const ceVol = (strike.ce.iv > 0 ? strike.ce.iv : 15.0) / 100;
        const ceGreeks = calculateGreeks("CE", newSpot, strike.strike, t, riskFreeRate, ceVol, q);
        updatedStrike.ce = { ...strike.ce, ...ceGreeks };

        // Update PE
        const peVol = (strike.pe.iv > 0 ? strike.pe.iv : 15.0) / 100;
        const peGreeks = calculateGreeks("PE", newSpot, strike.strike, t, riskFreeRate, peVol, q);
        updatedStrike.pe = { ...strike.pe, ...peGreeks };

        newChain[idx] = updatedStrike;
      });
    }

    const atm = newChain.length > 0 ? newChain.reduce((prev, curr) =>
      Math.abs(curr.strike - newSpot) < Math.abs(prev.strike - newSpot) ? curr : prev
    ).strike : 0;

    // Recalculate PCR
    let totalCE_OI = 0;
    let totalPE_OI = 0;
    newChain.forEach(s => {
      totalCE_OI += s.ce.oi;
      totalPE_OI += s.pe.oi;
    });
    const pcr = totalCE_OI > 0 ? totalPE_OI / totalCE_OI : 0;

    // Recalculate Max Pain
    let maxPain = 0;
    if (newChain.length > 0) {
      let minPain = Infinity;
      newChain.forEach(s => {
        let currentStrikePain = 0;
        newChain.forEach(compare => {
          if (compare.strike > s.strike) {
            currentStrikePain += (compare.strike - s.strike) * compare.ce.oi;
          }
          if (compare.strike < s.strike) {
            currentStrikePain += (s.strike - compare.strike) * compare.pe.oi;
          }
        });
        if (currentStrikePain < minPain) {
          minPain = currentStrikePain;
          maxPain = s.strike;
        }
      });
    }

    return { chain: newChain, spotPrice: newSpot, atmStrike: atm, pcr, maxPain, lastUpdate: new Date() };
  }),

  setConnectionStatus: (connected: boolean) => set({ connected }),
  updateStats: (pcr: number, maxPain: number) => set({ pcr, maxPain })
}));
