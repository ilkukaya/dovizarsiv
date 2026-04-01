import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface PriceChartProps {
  data: Record<string, { buy: number; sell: number }>;
  title: string;
}

type Range = '30' | '90' | 'all';

export default function PriceChart({ data, title }: PriceChartProps) {
  const [range, setRange] = useState<Range>('30');

  const chartData = useMemo(() => {
    const sorted = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
    let filtered = sorted;
    if (range === '30') filtered = sorted.slice(-30);
    else if (range === '90') filtered = sorted.slice(-90);
    return filtered.map(([date, values]) => ({
      date,
      buy: values.buy,
      sell: values.sell,
    }));
  }, [data, range]);

  const ranges: { key: Range; label: string }[] = [
    { key: '30', label: '1A' },
    { key: '90', label: '3A' },
    { key: 'all', label: 'Tümü' },
  ];

  return (
    <div className="card p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h3 className="text-white font-semibold text-lg">{title}</h3>
        <div className="flex gap-2">
          {ranges.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-mono transition ${
                range === key
                  ? 'bg-accent text-black font-bold'
                  : 'bg-bg-hover text-gray-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={chartData}>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            tickFormatter={(v: string) => v.slice(5)}
            stroke="#1e293b"
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 11 }}
            stroke="#1e293b"
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f1629',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: 'white',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '12px',
            }}
            labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
            formatter={(value: unknown) => [`₺${Number(value).toFixed(4)}`, '']}
          />
          <Line
            type="monotone"
            dataKey="buy"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="Alış"
          />
          <Line
            type="monotone"
            dataKey="sell"
            stroke="#d4a017"
            strokeWidth={2}
            dot={false}
            name="Satış"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
