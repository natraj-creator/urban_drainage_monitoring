import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { parseBackendDate } from '../dateUtils';

const STATUS_COLORS = {
  NORMAL: '#16a34a',
  WARNING: '#f59e0b',
  HIGH_RISK: '#ea580c',
  CRITICAL: '#dc2626',
  POSSIBLE_BLOCKAGE: '#0891b2',
  UNKNOWN: '#6b7280',
};

export default function LevelChart({ history, status = 'NORMAL' }) {
  const data = history.map((reading) => ({
    time: parseBackendDate(reading.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    level: reading.water_level_pct,
  }));
  const color = STATUS_COLORS[status] || STATUS_COLORS.UNKNOWN;

  if (!data.length) {
    return <div className="chart-empty">Waiting for readings from this sensor.</div>;
  }

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={270}>
        <AreaChart data={data} margin={{ top: 12, right: 10, bottom: 0, left: -15 }}>
          <defs>
            <linearGradient id="level-area-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0.015} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 5" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fill: 'var(--chart-label)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={32}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 20, 40, 60, 80, 100]}
            tick={{ fill: 'var(--chart-label)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={{
              border: '1px solid var(--line)',
              borderRadius: 12,
              background: 'var(--surface)',
              boxShadow: '0 8px 24px rgba(15, 23, 42, .10)',
            }}
            labelStyle={{ color: 'var(--muted)', fontSize: 12 }}
            formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Water level']}
          />
          <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="5 5" />
          <ReferenceLine y={80} stroke="#dc2626" strokeDasharray="5 5" />
          <Area
            type="monotone"
            dataKey="level"
            stroke={color}
            strokeWidth={2.5}
            fill="url(#level-area-fill)"
            activeDot={{ r: 5, fill: color, stroke: 'var(--surface)', strokeWidth: 2 }}
            isAnimationActive
            animationDuration={500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
