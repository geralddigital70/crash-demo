import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    
    try {
      const res = await fetch(`${import.meta.env.DEV ? 'http://localhost:4000' : 'https://crash-demo-t9q3.onrender.com'}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      setMessage(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#171a21] rounded-2xl p-6 border border-[#2a2f3a]">
        <h1 className="text-2xl font-bold mb-2 text-center text-white">Forgot Password</h1>
        <p className="text-xs text-gray-500 text-center mb-6">Enter your email to receive a reset link.</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className="w-full bg-[#0f1115] border border-[#2a2f3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22c55e]"
            placeholder="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          
          {message && <div className="text-[#22c55e] text-xs bg-green-950/40 border border-green-900 rounded px-3 py-2">{message}</div>}
          {error && <div className="text-red-400 text-xs bg-red-950/40 border border-red-900 rounded px-3 py-2">{error}</div>}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#22c55e] text-black font-semibold py-2 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="text-center mt-4">
          <Link to="/" className="text-xs text-gray-400 hover:text-white underline">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}