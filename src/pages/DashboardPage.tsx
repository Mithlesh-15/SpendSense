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
  const [analyzeTriggered, setAnalyzeTriggered] = useState(false);
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
    if (!analyzeTriggered) {
      setAiInsights([]);
      setAnalysisError(null);
    }
  }, [analyzeTriggered]);

  const handleAnalyzeSpending = async () => {
    if (!analyzeTriggered) setAnalyzeTriggered(true);
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

      {!analyzeTriggered && (
        <section className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-emerald-50 p-4 shadow-sm transition-colors duration-300 dark:border-sky-900/70 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                AI Insights (On-Device)
              </h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                Generate category-wise analysis only when you request it.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAnalyzeSpending}
              disabled={!llm.ready}
              className="rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {llm.ready ? 'Analyze My Spending' : 'Model Preparing...'}
            </button>
          </div>
          {!llm.ready && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              <p>
                {llm.error ??
                  `AI model is initializing${llm.state === 'downloading' ? ` (${Math.round(llm.progress * 100)}%)` : ''}. Please wait a moment.`}
              </p>
              <button
                type="button"
                onClick={llm.retry}
                className="mt-2 rounded-lg bg-amber-600 px-2 py-1 font-semibold text-white transition hover:bg-amber-700"
              >
                Retry Model Setup
              </button>
            </div>
          )}
        </section>
      )}

      {analyzeTriggered && loadingAnalysis && (
        <section className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-emerald-50 p-4 shadow-sm transition-colors duration-300 dark:border-sky-900/70 dark:from-slate-900 dark:to-slate-800">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Analyzing your spending...
          </p>
        </section>
      )}

      {analyzeTriggered && !loadingAnalysis && (
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
      )}
      <FloatingAddButton />
    </section>
  );
}
