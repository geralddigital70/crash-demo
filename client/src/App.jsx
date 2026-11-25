import { useEffect, useState } from 'react';
import Login from './Login';
import GameScreen from './GameScreen'; // <-- Import the new component
import { socket } from './socket';

export default function App() {
  const [auth, setAuth] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [balance, setBalance] = useState(0);

  // Restore session from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('crash_auth');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAuth(parsed);
        setBalance(parsed.balance);
      } catch { /* ignore */ }
    }
  }, []);

   // Wire socket events
  useEffect(() => {
    function onState(s) { setGameState(s); }
    function onTick(data) {
      // Update ONLY the multiplier live
      setGameState(prev => prev ? { ...prev, multiplier: data.multiplier, state: 'RUNNING' } : prev);
    }
    function onIdentified(d) { setBalance(d.balance); }
    
    socket.on('state', onState);
    socket.on('tick', onTick);
    socket.on('identified', onIdentified);
    
    return () => {
      socket.off('state', onState);
      socket.off('tick', onTick);
      socket.off('identified', onIdentified);
    };
  }, []);

  // Identify whenever auth changes
  useEffect(() => {
    if (auth?.token) {
      localStorage.setItem('crash_auth', JSON.stringify(auth));
      socket.emit('identify', { token: auth.token });
    }
  }, [auth]);

  function handleAuth(data) {
    setAuth(data);
    setBalance(data.balance);
  }

  function logout() {
    localStorage.removeItem('crash_auth');
    setAuth(null);
  }

  if (!auth) return <Login onAuth={handleAuth} />;

  return (
    <div className="min-h-screen p-4 md:p-6 bg-[#0f1115]">
      {/* Top Navigation */}
      <div className="max-w-4xl mx-auto flex items-center justify-between mb-6 bg-[#171a21] border border-[#2a2f3a] rounded-xl p-4">
        <div>
          <h1 className="text-xl font-bold">Crash Demo</h1>
          <p className="text-xs text-gray-500">
            Logged in as <span className="text-[#22c55e]">{auth.username}</span>
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs text-gray-500">Balance</div>
            <div className="text-lg font-bold text-[#22c55e]">
              {Number(balance).toFixed(2)} KSH
            </div>
          </div>
          <button
            onClick={logout}
            className="text-xs text-gray-400 hover:text-white border border-[#2a2f3a] rounded px-3 py-2 transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Game Area */}
      <GameScreen 
        auth={auth} 
        gameState={gameState} 
        balance={balance} 
        setBalance={setBalance} 
      />
    </div>
  );
}