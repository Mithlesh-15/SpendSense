import { useEffect, useMemo, useState } from 'react';
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
    isLoading,
    storageError,
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

  useEffect(() => {
    setAiInsights(insights);
  }, [insights]);

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
      {storageError && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          {storageError}
        </p>
      )}
      {isLoading && (
        <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          Loading local expenses...
        </p>
      )}
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
