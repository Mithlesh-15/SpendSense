interface AIInsightsPanelProps {
  insights: string[];
  onAnalyze: () => Promise<void> | void;
  loading: boolean;
  error: string | null;
}

export function AIInsightsPanel({ insights, onAnalyze, loading, error }: AIInsightsPanelProps) {
  return (
    <section className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-emerald-50 p-4 shadow-sm transition-colors duration-300 dark:border-sky-900/70 dark:from-slate-900 dark:to-slate-800">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">AI Insights (On-Device)</h3>
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
          disabled={loading}
          className="rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {loading ? 'Analyzing...' : 'Analyze My Spending'}
        </button>
      </div>
      {error && (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </p>
      )}
      <ul className="mt-3 space-y-2">
        {insights.map((insight) => (
          <li key={insight} className="rounded-xl border border-white/80 bg-white/70 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
            • {insight}
          </li>
        ))}
      </ul>
    </section>
  );
}
