import * as React from 'react';
import { useEffect, useState } from 'react';
import { useOptionChainStore } from '../../store/optionChainStore';
import { ShieldCheck, ShieldAlert, ChevronDown, LogIn, LogOut } from 'lucide-react';
import { API_URL } from '../../config';

export const TopBar: React.FC = () => {
  const { selectedSymbol, lastUpdate, connected, spotPrice, setSymbol, setProvider } = useOptionChainStore();
  const [symbols, setSymbols] = useState<{ label: string, value: string }[]>([]);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/market/symbols`)
      .then(res => res.json())
      .then(setSymbols)
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/auth/status`)
      .then(res => res.json())
      .then(data => {
        setAuthenticated(data.authenticated);
        if (data.provider) setProvider(data.provider);
      })
      .catch(console.error);
  }, [connected]);

  const handleLogin = async () => {
    const res = await fetch(`${API_URL}/auth/login`);
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  const handleUpstoxLogin = async () => {
    const res = await fetch(`${API_URL}/auth/upstox/login`);
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  const handleLogout = async () => {
    await fetch(`${API_URL}/auth/logout`, { method: 'POST' });
    window.location.reload();
  };

  const provider = useOptionChainStore(state => state.provider);

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-zinc-900 border-b border-zinc-800 text-zinc-100">
      <div className="flex items-center gap-6">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent italic">
          NiftyDash
        </h1>
        
        <div className="flex items-center gap-4 ml-4">
          <div className="relative group">
            <select 
              value={selectedSymbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="appearance-none bg-zinc-800 px-4 py-1.5 pr-8 rounded-lg border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer text-sm"
            >
              {symbols.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Spot Price</span>
            <span className="text-lg font-mono font-bold text-blue-400">
              {spotPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 border-l border-zinc-800 pl-6 mr-4">
          {authenticated ? (
            <div className="flex items-center gap-3 bg-zinc-800/50 px-3 py-1.5 rounded-full border border-zinc-700/50">
                <span className={`text-[10px] font-black uppercase tracking-widest ${provider === 'upstox' ? 'text-orange-400' : 'text-blue-400'}`}>
                    {provider} Active
                </span>
                <button 
                    onClick={handleLogout}
                    title="Logout / Switch Account"
                    className="p-1 hover:bg-zinc-700 rounded-full text-zinc-500 hover:text-red-400 transition-all"
                >
                    <LogOut className="w-3.5 h-3.5" />
                </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button 
                onClick={handleLogin}
                className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-500/30 rounded-lg transition-all flex items-center gap-2"
              >
                <LogIn className="w-3 h-3" /> Fyers
              </button>
              <button 
                onClick={handleUpstoxLogin}
                className="px-3 py-1.5 bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 text-[10px] font-bold uppercase tracking-wider border border-orange-500/30 rounded-lg transition-all flex items-center gap-2"
              >
                <LogIn className="w-3 h-3" /> Upstox
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Last Update</span>
          <span className="text-xs font-mono text-zinc-400">
            {lastUpdate ? lastUpdate.toLocaleTimeString() : '--:--:--'}
          </span>
        </div>

        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${connected ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
          {connected ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
          <span className="text-xs font-semibold">{connected ? 'Live' : 'Disconnected'}</span>
        </div>
      </div>
    </header>
  );
};
