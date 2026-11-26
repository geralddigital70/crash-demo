import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Login from './Login';
import GameScreen from './GameScreen';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';
import { socket } from './socket';

export default function App() {
  const [auth, setAuth] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [balance, setBalance] = useState(0);
  const navigate = useNavigate();

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
      navigate('/'); // Ensure they are on the game page
    }
  }, [auth, navigate]);

  function handleAuth(data) {
    setAuth(data);
    setBalance(data.balance);
  }

  function logout() {
    localStorage.removeItem('crash_auth');
    setAuth(null);
    navigate('/');
  }

  return (
    <div className="min-h-screen p-4 md:p-6 bg-[#0f1115]">
      <Routes>
        {/* Public Routes */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Main App Route */}
        <Route path="/" element={
          !auth ? (
            <Login onAuth={handleAuth} />
          ) : (
            <>
              {/* Top Navigation */}
              <div className="max-w-4xl mx-auto flex items-center justify-between mb-6 bg-[#171a21] border border-[#2a2f3a] rounded-xl p-4">
                <div>
                  <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#22c55e] to-[#10b981]">GeraldX</h1>
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

              {/* Footer */}
              <div className="max-w-4xl mx-auto mt-12 pb-6 text-center text-xs text-gray-500">
                <p>Built by <span className="text-[#22c55e] font-bold">Gerald</span></p>
              </div>
            </>
          )
        } />
      </Routes>
    </div>
  );
}