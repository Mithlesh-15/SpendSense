import { CategoryPieChart } from '../components/charts/CategoryPieChart';
import { MonthlyTrendChart } from '../components/charts/MonthlyTrendChart';
import { AIInsightsPanel } from '../components/dashboard/AIInsightsPanel';
import { SummaryCards } from '../components/dashboard/SummaryCards';
import { FloatingAddButton } from '../components/FloatingAddButton';
import { useExpenses } from '../context/ExpenseContext';

export function DashboardPage() {
  const {
    thisMonthTotal,
    lastMonthTotal,
    difference,
    categoryData,
    monthlyTrend,
    insights,
  } = useExpenses();

  return (
    <section className="space-y-4">
      <SummaryCards
        thisMonthTotal={thisMonthTotal}
        lastMonthTotal={lastMonthTotal}
        difference={difference}
      />
      <CategoryPieChart data={categoryData} />
      <MonthlyTrendChart data={monthlyTrend} />
      <AIInsightsPanel insights={insights} />
      <FloatingAddButton />
    </section>
  );
}
