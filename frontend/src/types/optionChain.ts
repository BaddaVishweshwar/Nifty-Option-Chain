export interface OptionLeg {
  symbol: string;
  ltp: number;
  prevLtp: number;
  oi: number;
  oiChange: number;
  volume: number;
  iv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  bidQty: number;
  askQty: number;
  bid: number;
  ask: number;
}

export interface OptionStrike {
  strike: number;
  ce: OptionLeg;
  pe: OptionLeg;
}

export interface TickUpdate {
  symbol: string;
  ltp: number;
  oi?: number;
  oich?: number; // OI Change
  iv?: number;
  delta?: number;
  theta?: number;
  gamma?: number;
  vega?: number;
  timestamp: number;
}
