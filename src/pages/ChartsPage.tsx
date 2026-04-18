import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import type { SodaEntry } from '../types/soda';
import { useNavigate } from 'react-router-dom';
import { BarChart2 } from 'lucide-react';
import { ScoreBadge } from '../components/ScoreBadge';

interface Props {
  sodas: SodaEntry[];
}

function getBarColor(score: number) {
  if (score >= 4.25) return '#10b981';
  if (score >= 3.5) return '#4ade80';
  if (score >= 2.75) return '#facc15';
  if (score >= 2) return '#fb923c';
  return '#ef4444';
}

export function ChartsPage({ sodas }: Props) {
  const navigate = useNavigate();

  if (sodas.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="text-center py-20">
        <BarChart2 size={64} className="text-sky-300/50 mb-4 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No data yet</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Rate some sodas to see your stats here.
        </p>
        <button
          type="button"
          onClick={() => navigate('/add')}
          className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-xl transition-colors"
        >
          Rate a Soda
        </button>
        </div>
      </div>
    );
  }

  const sortedByScore = [...sodas].sort((a, b) => b.overallScore - a.overallScore);
  const top5 = sortedByScore.slice(0, 5);
  const bottom5 = sortedByScore.slice(-5).reverse();

  const avgRatings = {
    Taste: sodas.reduce((s, x) => s + x.ratings.taste, 0) / sodas.length,
    Sweetness: sodas.reduce((s, x) => s + x.ratings.sweetness, 0) / sodas.length,
    Carbonation: sodas.reduce((s, x) => s + x.ratings.carbonation, 0) / sodas.length,
    Aftertaste: sodas.reduce((s, x) => s + x.ratings.aftertaste, 0) / sodas.length,
    Packaging: sodas.reduce((s, x) => s + x.ratings.packaging, 0) / sodas.length,
  };

  const avgData = Object.entries(avgRatings).map(([name, value]) => ({
    name,
    value: Math.round(value * 10) / 10,
  }));

  // Distribution: bucket scores 1, 2, 3, 4, 5
  const distribution = [
    { range: '1★', count: 0 },
    { range: '2★', count: 0 },
    { range: '3★', count: 0 },
    { range: '4★', count: 0 },
    { range: '5★', count: 0 },
  ];
  sodas.forEach((s) => {
    const sc = s.overallScore;
    if (sc <= 1.5) distribution[0].count++;
    else if (sc <= 2.5) distribution[1].count++;
    else if (sc <= 3.5) distribution[2].count++;
    else if (sc <= 4.5) distribution[3].count++;
    else distribution[4].count++;
  });

  const chartStyle = {
    contentStyle: {
      background: '#1e293b',
      border: 'none',
      borderRadius: 8,
      color: '#f1f5f9',
      fontSize: 13,
    },
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Charts & Stats</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Rated" value={sodas.length.toString()} />
        <StatCard
          label="Avg Score"
          value={(sodas.reduce((s, x) => s + x.overallScore, 0) / sodas.length).toFixed(1)}
        />
        <StatCard
          label="Best Soda"
          value={top5[0]?.name ?? '—'}
          sub={top5[0] ? `${top5[0].overallScore.toFixed(1)}/5` : undefined}
        />
        <StatCard label="Favorites" value={sodas.filter((s) => s.isFavorite).length.toString()} />
      </div>

      {/* Score distribution */}
      <ChartCard title="Score Distribution">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={distribution}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis dataKey="range" tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fill: '#9ca3af', fontSize: 12 }} width={24} />
            <Tooltip {...chartStyle} formatter={(v) => [v, 'Sodas']} />
            <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Average category ratings */}
      <ChartCard title="Average Category Ratings">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={avgData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
            <XAxis type="number" domain={[0, 5]} tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <YAxis dataKey="name" type="category" tick={{ fill: '#9ca3af', fontSize: 12 }} width={80} />
            <Tooltip {...chartStyle} formatter={(v) => [`${v}/5`, '']} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {avgData.map((_entry, i) => (
                <Cell key={i} fill={['#38bdf8', '#818cf8', '#34d399', '#fb923c', '#f472b6'][i % 5]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Top 5 */}
      {top5.length > 0 && (
        <ChartCard title="Top 5 Sodas">
          <div className="space-y-2">
            {top5.map((soda, i) => (
              <div
                key={soda.id}
                onClick={() => navigate(`/soda/${soda.id}`)}
                className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl px-2 py-1.5 transition-colors"
              >
                <span className="text-lg font-bold text-gray-300 dark:text-gray-600 w-6 text-center">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{soda.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{soda.brand}</p>
                </div>
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${(soda.overallScore / 5) * 80}px`,
                    background: getBarColor(soda.overallScore),
                  }}
                />
                <ScoreBadge score={soda.overallScore} size="sm" />
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      {/* Bottom 5 (only shown if more than 5 sodas) */}
      {sodas.length > 5 && bottom5.length > 0 && (
        <ChartCard title="Lowest Rated">
          <div className="space-y-2">
            {bottom5.map((soda) => (
              <div
                key={soda.id}
                onClick={() => navigate(`/soda/${soda.id}`)}
                className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl px-2 py-1.5 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{soda.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{soda.brand}</p>
                </div>
                <ScoreBadge score={soda.overallScore} size="sm" />
              </div>
            ))}
          </div>
        </ChartCard>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-white truncate">{value}</p>
      {sub && <p className="text-xs text-sky-500 font-medium">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{title}</h2>
      {children}
    </div>
  );
}
