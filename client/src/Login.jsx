import { useState } from 'react';
import { login, register } from './api';

export default function Login({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fn = mode === 'login' ? login : register;
      const data = await fn(username, password);
      onAuth(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#171a21] rounded-2xl p-6 border border-[#2a2f3a]">
        <h1 className="text-2xl font-bold mb-1 text-center">Crash Demo</h1>
        <p className="text-xs text-gray-500 text-center mb-6">
          Virtual money only • Min bet 50 KSH
        </p>

        <div className="flex mb-4 rounded-lg overflow-hidden border border-[#2a2f3a]">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 text-sm font-medium transition ${
              mode === 'login' ? 'bg-[#22c55e] text-black' : 'bg-transparent text-gray-400'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 py-2 text-sm font-medium transition ${
              mode === 'register' ? 'bg-[#22c55e] text-black' : 'bg-transparent text-gray-400'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className="w-full bg-[#0f1115] border border-[#2a2f3a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#22c55e]"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            className="w-full bg-[#0f1115] border border-[#2a2f3a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#22c55e]"
            placeholder="Password (min 4 chars)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && (
            <div className="text-red-400 text-xs bg-red-950/40 border border-red-900 rounded px-3 py-2">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#22c55e] text-black font-semibold py-2 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}