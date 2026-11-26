import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.DEV ? 'http://localhost:4000' : 'https://crash-demo-t9q3.onrender.com'}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset');
      
      setMessage(data.message);
      setTimeout(() => navigate('/'), 3000); // Redirect to login after 3s
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#171a21] rounded-2xl p-6 border border-[#2a2f3a]">
        <h1 className="text-2xl font-bold mb-2 text-center text-white">Set New Password</h1>
        <p className="text-xs text-gray-500 text-center mb-6">Enter your new password below.</p>

        {!token ? (
          <div className="text-red-400 text-xs text-center">Invalid or missing reset token.</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              className="w-full bg-[#0f1115] border border-[#2a2f3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22c55e]"
              placeholder="New Password (min 4 chars)"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            
            {message && <div className="text-[#22c55e] text-xs bg-green-950/40 border border-green-900 rounded px-3 py-2">{message}</div>}
            {error && <div className="text-red-400 text-xs bg-red-950/40 border border-red-900 rounded px-3 py-2">{error}</div>}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#22c55e] text-black font-semibold py-2 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        <div className="text-center mt-4">
          <Link to="/" className="text-xs text-gray-400 hover:text-white underline">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}