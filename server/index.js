require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { router: authRouter, JWT_SECRET } = require('./auth');
const db = require('./db');
const game = require('./gameEngine');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use('/auth', authRouter);
app.get('/health', (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Broadcast engine events to all connected clients
function broadcast(event) {
  game.on(event, (payload) => io.emit(event, payload));
}
['state', 'waiting', 'round_start', 'tick', 'round_crash'].forEach(broadcast);

// Per-socket auth + bet state
const socketUsers = new Map();
const socketBets = new Map();
const autoBetUsers = new Map(); // socketId -> { amount, autoCashout }

function balanceOf(userId) {
  const row = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId);
  return row ? row.balance : 0;
}
function setBalance(userId, newBalance) {
  db.prepare('UPDATE users SET balance = ? WHERE id = ?').run(newBalance, userId);
}

// 1. Listen for the game engine's auto-cashout trigger globally
game.on('auto_cashout_triggered', (data) => {
  const socket = io.sockets.sockets.get(data.socketId);
  if (socket) {
    const user = socketUsers.get(data.socketId);
    if (user) {
      const newBal = Number((balanceOf(user.userId) + data.payout).toFixed(2));
      setBalance(user.userId, newBal);
      socket.emit('cashout_success', {
        multiplier: data.multiplier,
        payout: data.payout,
        balance: newBal,
        auto: true
      });
    }
    socketBets.delete(data.socketId);
  }
});

// 2. Auto-bet logic for every new round
game.on('waiting', () => {
  for (const [socketId, config] of autoBetUsers.entries()) {
    const socket = io.sockets.sockets.get(socketId);
    if (!socket) continue;
    
    const user = socketUsers.get(socketId);
    if (!user) continue;

    const balance = balanceOf(user.userId);
    if (balance >= config.amount) {
      const result = game.placeBet(socketId, {
        userId: user.userId,
        username: user.username,
        amount: config.amount,
        autoCashout: config.autoCashout ? Number(config.autoCashout) : null,
      });
      
      if (result.ok) {
        setBalance(user.userId, Number((balance - config.amount).toFixed(2)));
        socketBets.set(socketId, config.amount);
        socket.emit('bet_accepted', {
          amount: config.amount,
          balance: balanceOf(user.userId),
          auto: true
        });
      }
    } else {
      socket.emit('bet_error', { error: 'Auto-bet failed: Insufficient balance' });
      autoBetUsers.delete(socketId); 
      socket.emit('auto_bet_status', { active: false });
    }
  }
});

io.on('connection', (socket) => {
  console.log('socket connected:', socket.id);

  socket.emit('state', game.getSnapshot());

  socket.on('identify', ({ token }) => {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const user = db.prepare('SELECT id, username, balance FROM users WHERE id = ?')
        .get(payload.id);
      if (user) {
        socketUsers.set(socket.id, { userId: user.id, username: user.username });
        socket.emit('identified', { userId: user.id, username: user.username, balance: user.balance });
      }
    } catch {
      socket.emit('auth_error', { error: 'Invalid token' });
    }
  });

  socket.on('toggle_auto_bet', ({ active, amount, autoCashout }) => {
    if (active) {
      autoBetUsers.set(socket.id, { amount: Number(amount), autoCashout });
    } else {
      autoBetUsers.delete(socket.id);
    }
  });

  socket.on('place_bet', ({ amount, token, autoCashout }) => {
    let user = socketUsers.get(socket.id);
    if (!user && token) {
      try {
        const payload = jwt.verify(token, JWT_SECRET);
        const row = db.prepare('SELECT id, username FROM users WHERE id = ?').get(payload.id);
        if (row) {
          user = { userId: row.id, username: row.username };
          socketUsers.set(socket.id, user);
        }
      } catch { /* ignore */ }
    }
    if (!user) return socket.emit('bet_error', { error: 'Not logged in' });

    const amountNum = Number(amount);
    const balance = balanceOf(user.userId);
    if (balance < amountNum) {
      return socket.emit('bet_error', { error: 'Insufficient balance' });
    }

    const result = game.placeBet(socket.id, {
      userId: user.userId,
      username: user.username,
      amount: amountNum,
      autoCashout: autoCashout ? Number(autoCashout) : null,
    });
    if (!result.ok) return socket.emit('bet_error', result);

    setBalance(user.userId, Number((balance - amountNum).toFixed(2)));
    socketBets.set(socket.id, amountNum);
    socket.emit('bet_accepted', {
      amount: amountNum,
      balance: balanceOf(user.userId),
    });
  });

  socket.on('cashout', () => {
    const result = game.cashout(socket.id);
    if (!result.ok) return socket.emit('cashout_error', result);

    const user = socketUsers.get(socket.id);
    if (user) {
      const newBal = Number((balanceOf(user.userId) + result.payout).toFixed(2));
      setBalance(user.userId, newBal);
      socket.emit('cashout_success', {
        multiplier: result.multiplier,
        payout: result.payout,
        balance: newBal,
        auto: false
      });
    }
    socketBets.delete(socket.id);
  });

  socket.on('disconnect', () => {
    console.log('socket disconnected:', socket.id);
    socketUsers.delete(socket.id);
    socketBets.delete(socket.id);
    autoBetUsers.delete(socket.id);
  });
});

game.start();

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});