interface AIInsightsPanelProps {
  insights: string[];
}

export function AIInsightsPanel({ insights }: AIInsightsPanelProps) {
  return (
    <section className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-emerald-50 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">AI Insights (Local Preview)</h3>
        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
          RunAnywhere Ready
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {insights.map((insight) => (
          <li key={insight} className="rounded-xl border border-white/80 bg-white/70 px-3 py-2 text-sm text-slate-700">
            {insight}
          </li>
        ))}
      </ul>
    </section>
  );
}
