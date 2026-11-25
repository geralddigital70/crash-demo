const { EventEmitter } = require('events');
const {
  generateCrashPoint,
  randomSeed,
  hashSeed,
} = require('./provablyFair');

const WAITING_MS = 10_000;
const CRASHED_MS = 3_000;
const TICK_MS = 100;
const GROWTH_RATE = 0.06;

class GameEngine extends EventEmitter {
  constructor() {
    super();
    this.state = 'WAITING';
    this.roundId = null;
    this.multiplier = 1.0;
    this.crashPoint = 1.0;
    this.serverSeed = null;
    this.clientSeed = 'crash-demo-client';
    this.nonce = 0;
    this.startedAt = null;
    this.history = [];
    this.bets = new Map();
    this._tickInterval = null;
    this._stateTimeout = null;
  }

  getSnapshot() {
    return {
      state: this.state,
      roundId: this.roundId,
      multiplier: Number(this.multiplier.toFixed(2)),
      crashPoint: this.state === 'CRASHED' ? Number(this.crashPoint.toFixed(2)) : null,
      serverSeedHash: this.state !== 'CRASHED' ? hashSeed(this.serverSeed) : null,
      serverSeed: this.state === 'CRASHED' ? this.serverSeed : null,
      history: this.history.slice(-20),
      bets: Array.from(this.bets.entries()).map(([socketId, b]) => ({
        socketId,
        username: b.username,
        amount: b.amount,
        cashedOut: b.cashedOut,
        cashoutMult: b.cashoutMult,
      })),
    };
  }

  start() {
    this._beginWaiting();
  }

  _beginWaiting() {
    this.state = 'WAITING';
    this.multiplier = 1.0;
    this.roundId = `round-${Date.now()}`;
    this.serverSeed = randomSeed();
    this.nonce += 1;
    this.crashPoint = generateCrashPoint(this.serverSeed, this.clientSeed, this.nonce);
    this.bets.clear();

    this.emit('state', this.getSnapshot());
    this.emit('waiting', { roundId: this.roundId, serverSeedHash: hashSeed(this.serverSeed) });

    this._stateTimeout = setTimeout(() => this._beginRunning(), WAITING_MS);
  }

  _beginRunning() {
    this.state = 'RUNNING';
    this.startedAt = Date.now();
    this.multiplier = 1.0;

    this.emit('state', this.getSnapshot());
    this.emit('round_start', { roundId: this.roundId });

    this._tickInterval = setInterval(() => {
      const elapsedSec = (Date.now() - this.startedAt) / 1000;
      const m = Math.exp(GROWTH_RATE * elapsedSec);

      // --- NEW FIXED LOGIC ---
      // 1. Set the current multiplier
      this.multiplier = Math.min(m, this.crashPoint);

      // 2. Check Auto Cashouts FIRST
      for (const [socketId, bet] of this.bets.entries()) {
        if (!bet.cashedOut && bet.autoCashout && this.multiplier >= bet.autoCashout) {
          const result = this.cashout(socketId);
          if (result.ok) {
            this.emit('auto_cashout_triggered', {
              socketId,
              multiplier: result.multiplier,
              payout: result.payout
            });
          }
        }
      }

      // 3. Now check if we crashed
      if (m >= this.crashPoint) {
        this._crash();
        return;
      }
      // -----------------------

      this.emit('tick', { multiplier: Number(this.multiplier.toFixed(2)) });
    }, TICK_MS);
  }

  _crash() {
    clearInterval(this._tickInterval);
    this._tickInterval = null;
    this.state = 'CRASHED';

    const crashedAt = Number(this.crashPoint.toFixed(2));
    this.history.push(crashedAt);
    if (this.history.length > 50) this.history.shift();

    const results = [];
    for (const [socketId, bet] of this.bets.entries()) {
      if (bet.cashedOut) {
        results.push({
          socketId, userId: bet.userId, username: bet.username,
          won: true, amount: bet.amount,
          cashoutMult: bet.cashoutMult,
          payout: Number((bet.amount * bet.cashoutMult).toFixed(2)),
        });
      } else {
        results.push({
          socketId, userId: bet.userId, username: bet.username,
          won: false, amount: bet.amount, payout: 0,
        });
      }
    }

    this.emit('state', this.getSnapshot());
    this.emit('round_crash', {
      crashPoint: crashedAt,
      serverSeed: this.serverSeed,
      serverSeedHash: hashSeed(this.serverSeed),
      results,
    });

    this._stateTimeout = setTimeout(() => this._beginWaiting(), CRASHED_MS);
  }

  placeBet(socketId, bet) {
    if (this.state !== 'WAITING') {
      return { ok: false, error: 'Betting is closed for this round' };
    }
    if (this.bets.has(socketId)) {
      return { ok: false, error: 'You already have a bet this round' };
    }
    if (typeof bet.amount !== 'number' || bet.amount < 20) {
      return { ok: false, error: 'Minimum bet is 20 KSH' };
    }
    if (bet.amount > 5000) {
      return { ok: false, error: 'Maximum bet is 5,000 KSH' };
    }
    
    this.bets.set(socketId, {
      userId: bet.userId,
      username: bet.username,
      amount: bet.amount,
      autoCashout: bet.autoCashout || null,
      cashedOut: false,
      cashoutMult: null,
    });
    this.emit('state', this.getSnapshot());
    return { ok: true };
  }

  cashout(socketId) {
    if (this.state !== 'RUNNING') {
      return { ok: false, error: 'Not running' };
    }
    const bet = this.bets.get(socketId);
    if (!bet) return { ok: false, error: 'No bet placed' };
    if (bet.cashedOut) return { ok: false, error: 'Already cashed out' };

    const mult = Number(this.multiplier.toFixed(2));
    bet.cashedOut = true;
    bet.cashoutMult = mult;

    const payout = Number((bet.amount * mult).toFixed(2));
    this.emit('state', this.getSnapshot());
    return { ok: true, multiplier: mult, payout };
  }
}

module.exports = new GameEngine();