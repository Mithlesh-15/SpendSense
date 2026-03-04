import { useEffect, useMemo, useState } from 'react';
import { CategoryPieChart } from '../components/charts/CategoryPieChart';
import { MonthlyTrendChart } from '../components/charts/MonthlyTrendChart';
import { AIInsightsPanel } from '../components/dashboard/AIInsightsPanel';
import { SummaryCards } from '../components/dashboard/SummaryCards';
import { FloatingAddButton } from '../components/FloatingAddButton';
import { useExpenses } from '../context/ExpenseContext';
import { useModelReadiness } from '../context/ModelReadinessContext';
import { analyzeSpendingWithLocalLLM, type CategoryComparison } from '../services/spendingAnalysis';
import { EXPENSE_CATEGORIES } from '../types/spendsense';

export function DashboardPage() {
  const {
    thisMonthTotal,
    lastMonthTotal,
    difference,
    categoryData,
    monthlyTrend,
    insights,
    expenses,
    isLoading,
    storageError,
  } = useExpenses();
  const [aiInsights, setAiInsights] = useState<string[]>(insights);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const llm = useModelReadiness();

  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const previousMonthKey = useMemo(() => {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const toMonthKey = (isoDate: string) => {
    const dt = new Date(isoDate);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
  };

  const categoryBreakdownThisMonth = useMemo(
    () =>
      EXPENSE_CATEGORIES.reduce<Record<string, number>>((acc, category) => {
        acc[category] = expenses
          .filter((expense) => expense.category === category && toMonthKey(expense.date) === currentMonthKey)
          .reduce((sum, expense) => sum + expense.amount, 0);
        return acc;
      }, {}),
    [expenses, currentMonthKey],
  );

  const categoryBreakdownLastMonth = useMemo(
    () =>
      EXPENSE_CATEGORIES.reduce<Record<string, number>>((acc, category) => {
        acc[category] = expenses
          .filter((expense) => expense.category === category && toMonthKey(expense.date) === previousMonthKey)
          .reduce((sum, expense) => sum + expense.amount, 0);
        return acc;
      }, {}),
    [expenses, previousMonthKey],
  );

  const categoryComparisons = useMemo(() => {
    const categories: Record<string, CategoryComparison> = {};
    for (const category of EXPENSE_CATEGORIES) {
      const lastMonth = categoryBreakdownLastMonth[category] ?? 0;
      const thisMonth = categoryBreakdownThisMonth[category] ?? 0;
      const difference = thisMonth - lastMonth;
      const percentChange = lastMonth === 0
        ? (thisMonth > 0 ? 100 : 0)
        : Math.round((difference / lastMonth) * 100);

      categories[category] = {
        lastMonth,
        thisMonth,
        difference,
        percentChange,
      };
    }
    return categories;
  }, [categoryBreakdownLastMonth, categoryBreakdownThisMonth]);

  useEffect(() => {
    setAiInsights(insights);
  }, [insights]);

  const handleAnalyzeSpending = async () => {
    if (!llm.ready) {
      setAnalysisError(
        llm.error ??
          'On-device language model is not ready yet. Wait for initialization or retry model setup.',
      );
      return;
    }
    setLoadingAnalysis(true);
    setAnalysisError(null);
    try {
      const generated = await analyzeSpendingWithLocalLLM({
        totalThisMonth: thisMonthTotal,
        totalLastMonth: lastMonthTotal,
        categories: categoryComparisons,
      }, { skipModelEnsure: true });
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
        comparisons={categoryComparisons}
        loading={loadingAnalysis}
        error={analysisError}
        onAnalyze={handleAnalyzeSpending}
        modelReady={llm.ready}
        modelState={llm.state}
        modelProgress={llm.progress}
        modelError={llm.error}
        onRetryModel={llm.retry}
      />
      <FloatingAddButton />
    </section>
  );
}
