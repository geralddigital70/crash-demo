import { useState, useEffect } from 'react';
import HistoryBar from './HistoryBar';
import { socket } from './socket';
import MyBets from './MyBets';
import { playWinSound, playCrashSound } from './sounds';
import CrashChart from './CrashChart';

export default function GameScreen({ auth, gameState, balance, setBalance }) {
  const [betAmount, setBetAmount] = useState(100);
  const [autoCashout, setAutoCashout] = useState('');
  const [hasBet, setHasBet] = useState(false);
  const [error, setError] = useState('');
  const [winMessage, setWinMessage] = useState('');
  const [countdown, setCountdown] = useState(10);
  const [isAutoBet, setIsAutoBet] = useState(false);
  const [showFairness, setShowFairness] = useState(false);
  
  // NEW: Bet history state
  const [betHistory, setBetHistory] = useState([]);

   // Load saved bets from localStorage on mount (unique per user)
  useEffect(() => {
    if (auth?.username) {
      const savedBets = localStorage.getItem(`crash_bet_history_${auth.username}`);
      if (savedBets) {
        try { setBetHistory(JSON.parse(savedBets)); } catch {}
      } else {
        setBetHistory([]); // Clear if no history for this user
      }
    }
  }, [auth]);

  // Listen for bet/cashout responses
  useEffect(() => {
    function onBetAccepted(data) {
      setHasBet(true);
      setBalance(data.balance);
      setError('');
    }
    function onBetError(data) {
      setError(data.error);
      setHasBet(false);
    }
    function onCashoutSuccess(data) {
      setHasBet(false);
      setBalance(data.balance);
       playWinSound();
      
      if (data.auto) {
        setWinMessage(`AUTO CASHED OUT at ${data.multiplier}x! +${data.payout} KSH`);
      } else {
        setWinMessage(`Cashed out at ${data.multiplier}x! +${data.payout} KSH`);
      }
      setTimeout(() => setWinMessage(''), 4000);

      // NEW: Save winning bet
      const newBet = {
        amount: betAmount,
        cashedOut: true,
        multiplier: data.multiplier,
        payout: data.payout,
        won: true
      };
      setBetHistory(prev => {
        const updated = [newBet, ...prev].slice(0, 10);
                localStorage.setItem(`crash_bet_history_${auth.username}`, JSON.stringify(updated));
        return updated;
      });
    }
    function onCashoutError(data) {
      setError(data.error);
    }
    function onRoundCrash() {
      playCrashSound();
      // NEW: Save losing bet before resetting
      setHasBet(prevHasBet => {
        if (prevHasBet) {
          const newBet = {
            amount: betAmount,
            cashedOut: false,
            multiplier: 0,
            payout: 0,
            won: false
          };
          setBetHistory(prev => {
            const updated = [newBet, ...prev].slice(0, 10);
                       localStorage.setItem(`crash_bet_history_${auth.username}`, JSON.stringify(updated));
            return updated;
          });
        }
        return false;
      });
    }
    function onRoundStart() {
      setCountdown(0);
    }

    socket.on('bet_accepted', onBetAccepted);
    socket.on('bet_error', onBetError);
    socket.on('cashout_success', onCashoutSuccess);
    socket.on('cashout_error', onCashoutError);
    socket.on('round_crash', onRoundCrash);
    socket.on('round_start', onRoundStart);

    return () => {
      socket.off('bet_accepted', onBetAccepted);
      socket.off('bet_error', onBetError);
      socket.off('cashout_success', onCashoutSuccess);
      socket.off('cashout_error', onCashoutError);
      socket.off('round_crash', onRoundCrash);
      socket.off('round_start', onRoundStart);
    };
  }, [setBalance, betAmount]);

  // Handle countdown for WAITING state
  useEffect(() => {
    if (gameState?.state === 'WAITING') {
      setCountdown(10);
      const timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState?.state, gameState?.roundId]);

  // Reset local bet state when a new round starts
  useEffect(() => {
    if (gameState?.state === 'WAITING') {
      setHasBet(false);
      setError('');
      setWinMessage('');
    }
  }, [gameState?.state]);

  const handleBet = () => {
    if (betAmount < 20) return setError('Minimum bet is 20 KSH');
    if (betAmount > 5000) return setError('Maximum bet is 5,000 KSH');
    if (betAmount > balance) return setError('Insufficient balance');
    
    const autoVal = parseFloat(autoCashout);
    if (autoCashout !== '' && (isNaN(autoVal) || autoVal < 1.01)) {
      return setError('Auto cashout must be at least 1.01x');
    }

    setError('');
    socket.emit('place_bet', { 
      amount: betAmount, 
      token: auth.token,
      autoCashout: autoCashout === '' ? null : autoVal 
    });
  };

  const handleCashout = () => {
    socket.emit('cashout');
  };

  const handleToggleAutoBet = () => {
    const newState = !isAutoBet;
    setIsAutoBet(newState);
    
    if (newState) {
      socket.emit('toggle_auto_bet', {
        active: true,
        amount: betAmount,
        autoCashout: autoCashout
      });
    } else {
      socket.emit('toggle_auto_bet', { active: false });
    }
  };

  if (!gameState) return <div className="text-center mt-20">Connecting...</div>;

  const isWaiting = gameState.state === 'WAITING';
  const isRunning = gameState.state === 'RUNNING';
  const isCrashed = gameState.state === 'CRASHED';
  
  const liveCashoutAmount = (betAmount * gameState.multiplier).toFixed(2);
  const flightProgress = gameState.multiplier - 1;
  // const rocketLeft = Math.min(flightProgress * 10, 85); 
  // const rocketBottom = Math.min(flightProgress * 6, 75) - Math.pow(flightProgress, 2) * 0.5;

  return (
    <div className="max-w-4xl mx-auto">
      <HistoryBar history={gameState.history} />

      {/* Main Game Area */}
      <div className="relative bg-[#171a21] border border-[#2a2f3a] rounded-2xl h-96 flex flex-col items-center justify-center overflow-hidden mb-4 shadow-2xl">
        
         <CrashChart 
          multiplier={gameState.multiplier} 
          isRunning={isRunning} 
          isCrashed={isCrashed} 
        />

        <div className="absolute top-4 text-xs font-bold tracking-widest uppercase text-gray-400 z-10">
          {isWaiting && (
            <span className="text-white animate-pulse">
              Starting in {countdown}s... Place your bets!
            </span>
          )}
          {isRunning && <span className="text-[#22c55e]">Flying...</span>}
          {isCrashed && <span className="text-red-500 text-lg">FLEW AWAY at {gameState.crashPoint}x</span>}
        </div>

        

        <div
          className={`text-7xl font-black transition-all duration-100 z-10 ${
            isCrashed ? 'text-red-500' : isRunning ? 'text-[#22c55e]' : 'text-white'
          }`}
        >
          {isWaiting ? '1.00x' : gameState.multiplier.toFixed(2)}x
        </div>

        {hasBet && isRunning && (
          <div className="mt-4 bg-black/50 px-6 py-2 rounded-full border border-[#22c55e] z-20 flex flex-col items-center">
            <span className="text-sm text-gray-300">Live Value: <strong className="text-white">{liveCashoutAmount} KSH</strong></span>
            {autoCashout && <span className="text-xs text-[#22c55e]">Auto @ {autoCashout}x</span>}
          </div>
        )}

        {isCrashed && (
          <div className="absolute inset-0 bg-red-900/20 flex items-center justify-center pointer-events-none z-0" />
        )}
      </div>

      {/* Bet Panel */}
      <div className="bg-[#171a21] border border-[#2a2f3a] rounded-2xl p-4 flex flex-col md:flex-row items-end gap-4">
        
        {/* Bet Amount */}
        <div className="flex-1 w-full">
          <label className="text-xs text-gray-500 block mb-1 flex justify-between">
            <span>Bet Amount (KSH)</span>
            <span className="text-gray-600">Min 20 / Max 5000</span>
          </label>
          <input
            type="number"
            min="20"
            max="5000"
            step="10"
            value={betAmount}
            onChange={(e) => setBetAmount(Number(e.target.value))}
            disabled={(!isWaiting && !isAutoBet) || (hasBet && !isAutoBet)}
            className="w-full bg-[#0f1115] border border-[#2a2f3a] rounded-lg px-3 py-3 text-lg font-bold focus:outline-none focus:border-[#22c55e] disabled:opacity-50"
          />
          <div className="text-xs text-gray-500 mt-1">Balance: {balance.toFixed(2)}</div>
        </div>

        {/* Auto Cashout Target */}
        <div className="w-full md:w-32">
          <label className="text-xs text-gray-500 block mb-1">Auto Cashout</label>
          <div className="relative">
            <input
              type="number"
              min="1.01"
              step="0.1"
              placeholder="None"
              value={autoCashout}
              onChange={(e) => setAutoCashout(e.target.value)}
              disabled={(!isWaiting && !isAutoBet) || (hasBet && !isAutoBet)}
              className="w-full bg-[#0f1115] border border-[#2a2f3a] rounded-lg px-3 py-3 text-lg font-bold focus:outline-none focus:border-[#22c55e] disabled:opacity-50 placeholder-gray-600"
            />
            <span className="absolute right-3 top-3 text-gray-500 font-bold">x</span>
          </div>
        </div>

        {/* Auto Bet Toggle */}
        <div className="w-full md:w-auto flex flex-col items-center justify-end h-full pb-2">
          <label className="text-xs text-gray-500 block mb-1">Auto Bet</label>
          <button
            onClick={handleToggleAutoBet}
            className={`w-16 h-8 rounded-full flex items-center transition-colors duration-300 px-1 ${
              isAutoBet ? 'bg-[#22c55e]' : 'bg-gray-600'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full bg-white transition-transform duration-300 ${
                isAutoBet ? 'transform translate-x-8' : ''
              }`}
            />
          </button>
        </div>

        {/* Action Button */}
        <div className="flex-1 w-full">
          {(!hasBet && !isAutoBet) ? (
            <button
              onClick={handleBet}
              disabled={!isWaiting || betAmount < 20 || betAmount > 5000}
              className="w-full h-[52px] rounded-xl font-bold text-lg bg-[#22c55e] text-black hover:bg-[#1ea850] disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isWaiting ? 'Place Bet' : 'Waiting...'}
            </button>
          ) : isAutoBet ? (
            <div className="w-full h-[52px] rounded-xl flex items-center justify-center font-bold text-lg bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]">
              {hasBet ? 'Auto-Betting...' : 'Waiting for next round...'}
            </div>
          ) : (
            <button
              onClick={handleCashout}
              disabled={!isRunning}
              className="w-full h-[52px] rounded-xl font-bold text-lg bg-[#f59e0b] text-black hover:bg-[#d97706] disabled:opacity-50 transition animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.5)]"
            >
              Cashout {isRunning ? `@ ${gameState.multiplier.toFixed(2)}x` : ''}
            </button>
          )}
        </div>
      </div>

      {/* Error / Success Messages */}
      <div className="h-8 mt-2 text-center">
        {error && <span className="text-red-400 text-sm font-bold">{error}</span>}
        {winMessage && <span className="text-[#22c55e] text-sm font-bold">{winMessage}</span>}
      </div>

            {/* Provably Fair Button */}
      <div className="text-center mt-4 mb-2">
        <button 
          onClick={() => setShowFairness(true)}
          className="text-xs text-gray-500 hover:text-white underline transition"
        >
          Verify Fairness (Provably Fair)
        </button>
      </div>

      {/* Fairness Modal */}
      {showFairness && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#171a21] border border-[#2a2f3a] rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <h2 className="text-xl font-bold text-white mb-4">Provably Fair</h2>
            <p className="text-xs text-gray-400 mb-4">
              GeraldX uses a cryptographic hash to generate crash points. We show you the hash before the round, and the seed after the round, so you can verify we didn't change the outcome.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Server Seed Hash (Before)</label>
                <div className="bg-[#0f1115] p-2 rounded text-xs break-all text-[#22c55e] font-mono mt-1">
                  {gameState.serverSeedHash || 'Waiting for next round...'}
                </div>
              </div>
              
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Server Seed (After)</label>
                <div className="bg-[#0f1115] p-2 rounded text-xs break-all text-yellow-500 font-mono mt-1">
                  {gameState.serverSeed || 'Will be revealed when the round crashes'}
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowFairness(false)}
              className="mt-6 w-full bg-[#22c55e] text-black font-bold py-2 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* NEW: My Bets History */}
      <MyBets bets={betHistory} />
    </div>
  );
}