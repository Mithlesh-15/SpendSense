interface AIInsightsPanelProps {
  insights: string[];
  onAnalyze: () => Promise<void> | void;
  loading: boolean;
  error: string | null;
  modelReady: boolean;
  modelState: string;
  modelProgress: number;
  modelError: string | null;
  onRetryModel: () => Promise<void> | void;
}

const parseInsights = (insights: string[]) => {
  const sections: Array<{ title: string; items: string[] }> = [];
  let currentSection: { title: string; items: string[] } | null = null;

  for (const line of insights) {
    // Check if this is a section header (all caps or ends with specific patterns)
    const isSectionHeader = 
      line === line.toUpperCase() && 
      line.length > 3 && 
      !line.startsWith('•') && 
      !line.startsWith('-') &&
      !line.startsWith('⚠');

    if (isSectionHeader) {
      // Start a new section
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = { title: line, items: [] };
    } else if (currentSection && line.trim()) {
      // Add to current section
      currentSection.items.push(line);
    } else if (!currentSection && line.trim()) {
      // Standalone item before any section
      sections.push({ title: '', items: [line] });
    }
  }

  // Add the last section
  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
};

export function AIInsightsPanel({
  insights,
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
  const sections = parseInsights(insights);

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
              : `On-device model ${modelState}${modelState === 'downloading' ? ` (${Math.round(
                  modelProgress * 100,
                )}%)` : ''}.`}
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
      <div className="mt-3 space-y-3">
        {sections.map((section, sectionIndex) => (
          <div
            key={`${section.title}-${sectionIndex}`}
            className="rounded-xl border border-white/80 bg-white/70 px-3 py-3 dark:border-slate-700 dark:bg-slate-900/70"
          >
            {section.title && (
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-sky-700 dark:text-sky-400">
                {section.title}
              </h4>
            )}
            <div className="space-y-1">
              {section.items.map((item, itemIndex) => (
                <p
                  key={`${item}-${itemIndex}`}
                  className="text-sm text-slate-700 dark:text-slate-200"
                >
                  {item}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
