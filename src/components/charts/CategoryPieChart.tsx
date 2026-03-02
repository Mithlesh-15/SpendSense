import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatINR } from '../../context/ExpenseContext';
import { useTheme } from '../../context/ThemeContext';
import type { CategoryPoint } from '../../types/spendsense';

const colors = ['#0EA5E9', '#06B6D4', '#10B981', '#F59E0B', '#FB7185', '#94A3B8'];

interface CategoryPieChartProps {
  data: CategoryPoint[];
}

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  const { resolvedTheme } = useTheme();
  const activeData = data.filter((item) => item.value > 0);
  const isDark = resolvedTheme === 'dark';

  if (!activeData.length) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No transactions in the selected month.</p>;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Category Distribution</h3>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={activeData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={3}
            >
              {activeData.map((entry, index) => (
                <Cell key={entry.name} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatINR(value)}
              contentStyle={{
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                borderRadius: '0.75rem',
              }}
              labelStyle={{ color: isDark ? '#e2e8f0' : '#0f172a' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
