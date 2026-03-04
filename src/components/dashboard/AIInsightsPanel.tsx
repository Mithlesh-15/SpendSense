import { formatINR } from '../../context/ExpenseContext';
import { EXPENSE_CATEGORIES } from '../../types/spendsense';
import type { CategoryComparison } from '../../services/spendingAnalysis';

interface AIInsightsPanelProps {
  insights: string[];
  comparisons: Record<string, CategoryComparison>;
  onAnalyze: () => Promise<void> | void;
  loading: boolean;
  error: string | null;
  modelReady: boolean;
  modelState: string;
  modelProgress: number;
  modelError: string | null;
  onRetryModel: () => Promise<void> | void;
}

interface ParsedSection {
  title: string;
  items: string[];
}

const parseSections = (lines: string[]): ParsedSection[] => {
  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const isHeader = line === line.toUpperCase() && line.length > 4 && !line.startsWith('•');
    if (isHeader) {
      if (current) sections.push(current);
      current = { title: line, items: [] };
      continue;
    }
    if (!current) {
      current = { title: 'GENERAL', items: [] };
    }
    current.items.push(line.replace(/^[•\-]\s*/, ''));
  }
  if (current) sections.push(current);
  return sections;
};

export function AIInsightsPanel({
  insights,
  comparisons,
  onAnalyze,
  loading,
  error,
  modelReady,
  modelState,
  modelProgress,
  modelError,
  onRetryModel,
}: AIInsightsPanelProps) {
  const isAnalyzeDisabled = loading || !modelReady;
  const orderedRows = EXPENSE_CATEGORIES.map((category) => ({
    category,
    ...comparisons[category],
  }));

  const biggestIncrease = [...orderedRows].sort((a, b) => b.difference - a.difference)[0];
  const biggestDecrease = [...orderedRows].sort((a, b) => a.difference - b.difference)[0];
  const riskRows = orderedRows.filter((row) => row.percentChange > 40 && row.difference > 0);

  const parsed = parseSections(insights);
  const savingsItems =
    parsed.find((section) => section.title.includes('SAVINGS'))?.items.filter(Boolean) ?? [];
  const suggestions =
    savingsItems.length > 0
      ? savingsItems
      : [
          `Cap ${biggestIncrease?.category ?? 'high-growth'} spending with a weekly budget limit.`,
          `${biggestDecrease?.category ?? 'Controlled'} is trending better - maintain this discipline.`,
        ];

  return (
    <section className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-emerald-50 p-4 shadow-sm transition-colors duration-300 dark:border-sky-900/70 dark:from-slate-900 dark:to-slate-800">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          📊 AI Insights (On-Device)
        </h3>
        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          RunAnywhere Ready
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Processing runs locally on your device. No expense data is sent to the cloud.
        </p>
        <button
          type="button"
          onClick={onAnalyze}
          disabled={isAnalyzeDisabled}
          className="rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {loading ? 'Analyzing...' : modelReady ? 'Analyze My Spending' : 'Model Preparing...'}
        </button>
      </div>

      {!modelReady && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          <p>
            {modelError
              ? modelError
              : `On-device model ${modelState}${modelState === 'downloading' ? ` (${Math.round(modelProgress * 100)}%)` : ''}.`}
          </p>
          <button
            type="button"
            onClick={onRetryModel}
            className="mt-2 rounded-lg bg-amber-600 px-2 py-1 font-semibold text-white transition hover:bg-amber-700"
          >
            Retry Model Setup
          </button>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </p>
      )}

      <div className="mt-4 rounded-xl border border-white/80 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-900/70">
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-sky-700 dark:text-sky-400">
          📊 Category Comparison
        </h4>
        <div className="space-y-2">
          {orderedRows.map((row) => (
            <div
              key={row.category}
              className="rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <p className="font-semibold text-slate-900 dark:text-slate-100">{row.category}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Last month: {formatINR(row.lastMonth)} | This month: {formatINR(row.thisMonth)}
              </p>
              <p
                className={[
                  'text-xs font-semibold',
                  row.difference > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400',
                ].join(' ')}
              >
                Change: {row.difference > 0 ? '+' : '-'}
                {formatINR(Math.abs(row.difference))} ({row.percentChange}%)
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-900/60 dark:bg-rose-950/40">
          <h4 className="text-xs font-bold uppercase tracking-wide text-rose-700 dark:text-rose-300">
            📈 Biggest Increase
          </h4>
          <p className="mt-1 text-sm text-rose-800 dark:text-rose-200">
            {biggestIncrease?.category ?? 'None'} increased the most by{' '}
            {formatINR(Math.max(0, biggestIncrease?.difference ?? 0))}.
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/40">
          <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            📉 Biggest Decrease
          </h4>
          <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
            {biggestDecrease?.category ?? 'None'} decreased the most by{' '}
            {formatINR(Math.abs(Math.min(0, biggestDecrease?.difference ?? 0)))}.
          </p>
        </div>
      </div>

      {riskRows.length > 0 && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/40">
          <h4 className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            ⚠ Spending Alert
          </h4>
          <ul className="mt-1 space-y-1 text-sm text-amber-800 dark:text-amber-200">
            {riskRows.map((row) => (
              <li key={row.category}>
                {row.category} increased by {row.percentChange}% compared to last month.
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3 dark:border-sky-900/60 dark:bg-sky-950/40">
        <h4 className="text-xs font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">
          💡 Smart Suggestions
        </h4>
        <ul className="mt-1 space-y-1 text-sm text-sky-900 dark:text-sky-200">
          {suggestions.slice(0, 2).map((item, index) => (
            <li key={`${item}-${index}`}>• {item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
