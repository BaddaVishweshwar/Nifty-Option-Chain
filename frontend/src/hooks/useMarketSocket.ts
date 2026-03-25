import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useOptionChainStore } from '../store/optionChainStore';
import { TickUpdate } from '../types/optionChain';

import { BACKEND_URL } from '../config';

export function useMarketSocket() {
  const socketRef = useRef<Socket>();
  const tickBuffer = useRef<Map<string, TickUpdate>>(new Map());
  const { applyTick, setConnectionStatus, updateStats, chain } = useOptionChainStore();

  useEffect(() => {
    const socket = io(BACKEND_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionStatus(true);
      const symbols = chain.flatMap(s => [s.ce.symbol, s.pe.symbol]);
      // Also subscribe to the underlying index
      const { selectedSymbol } = useOptionChainStore.getState();
      const allSymbols = [...new Set([...symbols, selectedSymbol])];
      
      if (allSymbols.length > 0) {
        socket.emit('subscribe', { symbols: allSymbols });
      }
    });

    socket.on('disconnect', () => {
      setConnectionStatus(false);
    });

    socket.on('tick_update', (ticks: TickUpdate[]) => {
      // console.log(`[Socket] Received ${ticks.length} ticks`);
      ticks.forEach(tick => {
        tickBuffer.current.set(tick.symbol, tick);
      });
    });

    // Process buffered ticks every 1 second
    const intervalId = setInterval(() => {
      if (tickBuffer.current.size > 0) {
        const batch = Array.from(tickBuffer.current.values());
        console.log(`[Socket] Applying batch of ${batch.length} ticks`);
        applyTick(batch);
        tickBuffer.current.clear();
      }
    }, 1000);

    socket.on('pcr_update', (data: { pcr: number }) => {
      updateStats(data.pcr, useOptionChainStore.getState().maxPain);
    });

    return () => {
      clearInterval(intervalId);
      socket.disconnect();
    };
  }, [chain.length]);

  return socketRef.current;
}
