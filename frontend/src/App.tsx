import { TopBar } from './components/TopBar/TopBar';
import { StatsRow } from './components/StatsRow/StatsRow';
import { OptionChainTable } from './components/OptionChainTable/OptionChainTable';
import { OIBarChart } from './components/Charts/OIBarChart';
import { PCRGauge } from './components/Charts/PCRGauge';
import { useMarketSocket } from './hooks/useMarketSocket';
import { useOptionChainStore } from './store/optionChainStore';
import { useEffect } from 'react';

function App() {
  useMarketSocket();
  const { setChainSnapshot, selectedSymbol } = useOptionChainStore();

  useEffect(() => {
    const fetchChain = async () => {
      try {
        const response = await fetch(`/api/market/chain/${selectedSymbol}?strikecount=15`);
        const data = await response.json();
        if (data.optionsChain) {
          setChainSnapshot(data.optionsChain, data.underlyingLtp);
        }
      } catch (err) {
        console.error('Failed to fetch chain:', err);
      }
    };

    fetchChain();
  }, [selectedSymbol, setChainSnapshot]);

  return (
    <div className="flex flex-col h-screen bg-zinc-950 overflow-hidden">
      <TopBar />
      <div className="flex-1 overflow-auto">
        <StatsRow />
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 p-6">
          <div className="xl:col-span-3">
             <OptionChainTable />
          </div>
          <div className="flex flex-col gap-6">
            <PCRGauge />
            <OIBarChart />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
