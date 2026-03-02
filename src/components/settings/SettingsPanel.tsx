import { useState } from 'react';
import { useExpenses } from '../../context/ExpenseContext';

export function SettingsPanel() {
  const { clearData, exportData } = useExpenses();
  const [message, setMessage] = useState<string>('');

  const onClear = () => {
    clearData();
    setMessage('Local data cleared.');
  };

  const onExport = () => {
    const payload = exportData();
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'spendsense-export.json';
    link.click();
    URL.revokeObjectURL(url);
    setMessage('Export generated locally.');
  };

  return (
    <section className="space-y-4">
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Privacy</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          All data is stored locally in your browser storage. Nothing is sent to a server.
        </p>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Data Controls</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onClear}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
          >
            Clear Data
          </button>
          <button
            type="button"
            onClick={onExport}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Export Data
          </button>
        </div>
        {message && <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</p>}
      </article>
    </section>
  );
}
