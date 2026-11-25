export default function HistoryBar({ history }) {
  // If no history, show placeholders
  const items = history.length ? [...history].reverse() : [];
  
  return (
    <div className="flex gap-2 mb-6 overflow-hidden">
      {items.map((h, i) => (
        <div
          key={i}
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            h >= 2.0
              ? 'bg-[#22c55e] text-black' // Green for high
              : h >= 1.5
              ? 'bg-yellow-500 text-black' // Yellow for medium
              : 'bg-red-500 text-white'    // Red for low
          }`}
        >
          {h.toFixed(2)}x
        </div>
      ))}
      {items.length === 0 && (
        <div className="text-xs text-gray-500">No rounds played yet.</div>
      )}
    </div>
  );
}