import { create } from 'zustand';
import { OptionStrike, TickUpdate } from '../types/optionChain';
interface OptionChainState {
  availableSymbols: { label: string, value: string, lotSize: number }[];
  selectedSymbol: string;
  selectedExpiry: string;
  chain: OptionStrike[];
  spotPrice: number;
  atmStrike: number;
  pcr: number;
  maxPain: number;
  connected: boolean;
  showLots: boolean;
  lotSize: number;
  lastUpdate: Date | null;

  setAvailableSymbols: (symbols: { label: string, value: string, lotSize: number }[]) => void;
  setSymbol: (symbol: string) => void;
  setExpiry: (expiry: string) => void;
  toggleLots: () => void;
  setChainSnapshot: (chain: OptionStrike[], spot: number) => void;
  applyTick: (ticks: TickUpdate[]) => void;
  setConnectionStatus: (connected: boolean) => void;
  updateStats: (pcr: number, maxPain: number) => void;
}

export const useOptionChainStore = create<OptionChainState>((set) => ({
  availableSymbols: [],
  selectedSymbol: 'NSE:NIFTYBANK-INDEX',
  selectedExpiry: '',
  chain: [],
  spotPrice: 0,
  atmStrike: 0,
  pcr: 0,
  maxPain: 0,
  connected: false,
  showLots: false,
  lotSize: 15,
  lastUpdate: null,

  setAvailableSymbols: (symbols) => set((state) => {
    const matched = symbols.find(s => s.value === state.selectedSymbol);
    return { availableSymbols: symbols, lotSize: matched?.lotSize || state.lotSize };
  }),
  setSymbol: (symbol: string) => set((state) => {
    const matched = state.availableSymbols.find(s => s.value === symbol);
    return { selectedSymbol: symbol, lotSize: matched?.lotSize || 1 };
  }),
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
    ticks.forEach((tick: TickUpdate) => {
      if (tick.symbol === state.selectedSymbol) {
        newSpot = tick.ltp;
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

        if (isCE) strike.ce = leg; else strike.pe = leg;
        newChain[strikeIndex] = strike;
      }
    });

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
