import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatINR } from '../../context/ExpenseContext';
import { useTheme } from '../../context/ThemeContext';
import type { MonthlyPoint } from '../../types/spendsense';

interface MonthlyTrendChartProps {
  data: MonthlyPoint[];
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Monthly Trend</h3>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} />
            <XAxis dataKey="month" tick={{ fill: isDark ? '#cbd5e1' : '#475569', fontSize: 12 }} />
            <YAxis
              tick={{ fill: isDark ? '#cbd5e1' : '#475569', fontSize: 12 }}
              tickFormatter={(value: number) => formatINR(value)}
            />
            <Tooltip
              formatter={(value: number) => formatINR(value)}
              contentStyle={{
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                borderRadius: '0.75rem',
              }}
              labelStyle={{ color: isDark ? '#e2e8f0' : '#0f172a' }}
            />
            <Bar dataKey="total" fill={isDark ? '#38bdf8' : '#0EA5E9'} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
