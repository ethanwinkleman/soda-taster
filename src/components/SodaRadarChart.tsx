import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { CategoryRatings } from '../types/soda';

interface Props {
  ratings: CategoryRatings;
}

export function SodaRadarChart({ ratings }: Props) {
  const data = [
    { subject: 'Taste', value: ratings.taste },
    { subject: 'Sweetness', value: ratings.sweetness },
    { subject: 'Carbonation', value: ratings.carbonation },
    { subject: 'Aftertaste', value: ratings.aftertaste },
    { subject: 'Packaging', value: ratings.packaging },
  ];

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: '#6b7280', fontSize: 12 }}
        />
        <Radar
          dataKey="value"
          stroke="#38bdf8"
          fill="#38bdf8"
          fillOpacity={0.35}
          strokeWidth={2}
        />
        <Tooltip
          formatter={(val) => [`${val}/10`, '']}
          contentStyle={{
            background: '#1e293b',
            border: 'none',
            borderRadius: 8,
            color: '#f1f5f9',
            fontSize: 13,
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
