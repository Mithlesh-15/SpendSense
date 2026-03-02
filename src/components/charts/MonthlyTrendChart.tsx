import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatINR } from '../../context/ExpenseContext';
import type { MonthlyPoint } from '../../types/spendsense';

interface MonthlyTrendChartProps {
  data: MonthlyPoint[];
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Monthly Trend</h3>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 12 }} />
            <YAxis tick={{ fill: '#475569', fontSize: 12 }} tickFormatter={(value: number) => formatINR(value)} />
            <Tooltip formatter={(value: number) => formatINR(value)} />
            <Bar dataKey="total" fill="#0EA5E9" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
