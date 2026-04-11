import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Navigation/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { SimplifiedViewPage } from './pages/SimplifiedViewPage';
import { useMarketSocket } from './hooks/useMarketSocket';
import { useOptionChainStore } from './store/optionChainStore';
import { useEffect, useState } from 'react';
import { API_URL } from './config';
import { Lock } from 'lucide-react';

function App() {
  const [isLocked, setIsLocked] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  const { setChainSnapshot, selectedSymbol } = useOptionChainStore();
  useMarketSocket();

  useEffect(() => {
    // Check if privacy lock is required
    fetch(`${API_URL}/auth/privacy-status`)
      .then(res => res.json())
      .then(data => {
        if (data.required) {
          const savedAuth = localStorage.getItem('nifty_auth');
          if (!savedAuth) setIsLocked(true);
        }
        setChecking(false);
      });
  }, []);

  useEffect(() => {
    if (isLocked || checking) return;

    let isFetching = false;
    
    const fetchChain = async () => {
      if (isFetching) return; // skip if previous fetch still running
      isFetching = true;
      try {
        const response = await fetch(`${API_URL}/market/chain/${selectedSymbol}?strikecount=15`);
        const data = await response.json();
        if (data.optionsChain) {
          setChainSnapshot(data.optionsChain, data.underlyingLtp);
        }
      } catch (err) {
        console.error('Failed to fetch chain:', err);
      } finally {
        isFetching = false;
      }
    };

    fetchChain(); // initial fetch immediately
    const interval = setInterval(fetchChain, 1000); // then every 1 second

    return () => clearInterval(interval);
  }, [selectedSymbol, setChainSnapshot, isLocked, checking]);


  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/auth/verify-credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.valid) {
      localStorage.setItem('nifty_auth', 'true');
      setIsLocked(false);
      setError('');
    } else {
      setError('Invalid email or password');
    }
  };

  if (checking) return null;

  if (isLocked) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950 text-zinc-100">
        <form onSubmit={handleVerify} className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800 shadow-2xl w-full max-w-md">
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-blue-500" />
            </div>
            <h1 className="text-2xl font-bold italic">NiftyDash Private</h1>
            <p className="text-zinc-500 text-sm text-center">This application is restricted. Please login to continue.</p>
          </div>
          
          <div className="space-y-4">
            <input 
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              autoFocus
            />
            <input 
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
            {error && <p className="text-red-400 text-xs text-center">{error}</p>}
            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-bold transition-all shadow-lg hover:shadow-blue-500/20"
            >
              Sign In
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/quick-view" element={<SimplifiedViewPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
