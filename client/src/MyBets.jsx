import React from 'react';

export default function MyBets({ bets }) {
  if (!bets || bets.length === 0) {
    return (
      <div className="bg-[#171a21] border border-[#2a2f3a] rounded-2xl p-4 mt-4 text-center">
        <h2 className="text-sm font-semibold text-gray-400 mb-2">My Bets</h2>
        <p className="text-xs text-gray-500">No bets placed yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#171a21] border border-[#2a2f3a] rounded-2xl p-4 mt-4">
      <h2 className="text-sm font-semibold text-gray-400 mb-2">My Bets (Last 10)</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-[#0f1115]">
            <tr>
              <th className="px-4 py-2 rounded-tl-lg">Amount</th>
              <th className="px-4 py-2">Cashout Multiplier</th>
              <th className="px-4 py-2">Payout</th>
              <th className="px-4 py-2 rounded-tr-lg">Result</th>
            </tr>
          </thead>
          <tbody>
            {bets.map((bet, index) => (
              <tr key={index} className="border-b border-[#2a2f3a] last:border-0 hover:bg-[#1f232d] transition">
                <td className="px-4 py-3 font-medium">{bet.amount} KSH</td>
                <td className="px-4 py-3">
                  {bet.cashedOut ? `${bet.multiplier}x` : '-'}
                </td>
                <td className="px-4 py-3 font-bold">
                  {bet.payout > 0 ? `+${bet.payout} KSH` : '0 KSH'}
                </td>
                <td className={`px-4 py-3 font-bold ${bet.won ? 'text-[#22c55e]' : 'text-red-500'}`}>
                  {bet.won ? 'WIN' : 'LOSS'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}