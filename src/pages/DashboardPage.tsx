import { useMemo, useState } from 'react';
import { CategoryPieChart } from '../components/charts/CategoryPieChart';
import { MonthlyTrendChart } from '../components/charts/MonthlyTrendChart';
import { AIInsightsPanel } from '../components/dashboard/AIInsightsPanel';
import { SummaryCards } from '../components/dashboard/SummaryCards';
import { FloatingAddButton } from '../components/FloatingAddButton';
import { useExpenses } from '../context/ExpenseContext';
import { analyzeSpendingWithLocalLLM } from '../services/spendingAnalysis';

export function DashboardPage() {
  const {
    thisMonthTotal,
    lastMonthTotal,
    difference,
    categoryData,
    monthlyTrend,
    insights,
  } = useExpenses();
  const [aiInsights, setAiInsights] = useState<string[]>(insights);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const categoryBreakdown = useMemo(
    () =>
      categoryData.reduce<Record<string, number>>((acc, item) => {
        acc[item.name] = item.value;
        return acc;
      }, {}),
    [categoryData],
  );

  const topCategory = useMemo(() => {
    const ranked = [...categoryData].sort((a, b) => b.value - a.value);
    return ranked[0]?.name ?? 'Others';
  }, [categoryData]);

  const handleAnalyzeSpending = async () => {
    setLoadingAnalysis(true);
    setAnalysisError(null);
    try {
      const generated = await analyzeSpendingWithLocalLLM({
        totalThisMonth: thisMonthTotal,
        totalLastMonth: lastMonthTotal,
        topCategory,
        categoryBreakdown,
      });
      setAiInsights(generated);
    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? error.message
          : 'Local analysis failed. Please retry after model initialization.',
      );
    } finally {
      setLoadingAnalysis(false);
    }
  };

  return (
    <section className="space-y-4">
      <SummaryCards
        thisMonthTotal={thisMonthTotal}
        lastMonthTotal={lastMonthTotal}
        difference={difference}
      />
      <CategoryPieChart data={categoryData} />
      <MonthlyTrendChart data={monthlyTrend} />
      <AIInsightsPanel
        insights={aiInsights}
        loading={loadingAnalysis}
        error={analysisError}
        onAnalyze={handleAnalyzeSpending}
      />
      <FloatingAddButton />
    </section>
  );
}
