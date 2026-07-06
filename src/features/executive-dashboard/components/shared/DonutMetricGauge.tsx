import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface DonutMetricGaugeProps {
  label: string;
  value: number | null; // 0-1 fraction, or null for "sin datos"
  goodThreshold: number; // >= this fraction → green
  okThreshold: number; // >= this (but < good) → yellow; below → red
}

const TRACK_COLOR = '#e5e7eb'; // neutral gray track for the remainder of the ring

function colorFor(value: number, good: number, ok: number): string {
  if (value >= good) return '#10b981'; // verde
  if (value >= ok) return '#f59e0b'; // amarillo
  return '#e5182b'; // rojo
}

export function DonutMetricGauge({ label, value, goodThreshold, okThreshold }: DonutMetricGaugeProps) {
  const pct = value != null ? Math.round(value * 100) : null;
  const color = value != null ? colorFor(value, goodThreshold, okThreshold) : '#9ca3af';
  const data = value != null
    ? [{ name: 'value', value: value * 100 }, { name: 'rest', value: 100 - value * 100 }]
    : [{ name: 'value', value: 0 }, { name: 'rest', value: 100 }];

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={38} outerRadius={50} startAngle={90} endAngle={-270} stroke="none" isAnimationActive={false}>
              <Cell fill={color} />
              <Cell fill={TRACK_COLOR} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold" style={{ color }}>{pct != null ? `${pct}%` : '—'}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-1 text-center">{label}</p>
    </div>
  );
}
