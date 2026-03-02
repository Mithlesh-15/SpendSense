import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { formatINR } from '../../context/ExpenseContext';
import { analyzeFileLocally } from '../../services/localAi';
import type { ExtractedTransaction } from '../../types/spendsense';

export function UploadAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ExtractedTransaction[]>([]);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onFileChange = (next: File | null) => {
    setFile(next);
    setResults([]);
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const dropped = event.dataTransfer.files?.[0] ?? null;
    onFileChange(dropped);
  };

  const onAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    const extracted = await analyzeFileLocally(file.name.replace(/\.[^/.]+$/, ''));
    setResults(extracted);
    setLoading(false);
  };

  return (
    <section className="space-y-4">
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Upload &amp; Analyze</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Drop receipt screenshots to simulate local extraction. No cloud upload.
        </p>

        <label
          onDrop={onDrop}
          onDragOver={(event) => event.preventDefault()}
          className="mt-4 block cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center transition hover:border-sky-400 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-sky-500 dark:hover:bg-slate-900"
        >
          <input
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Drag and drop a file here</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">or tap to choose a file</p>
        </label>

        {previewUrl && (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
            <img src={previewUrl} alt="Uploaded preview" className="h-52 w-full object-cover" />
          </div>
        )}

        <button
          type="button"
          disabled={!file || loading}
          onClick={onAnalyze}
          className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {loading ? 'Analyzing Locally...' : 'Analyze Locally'}
        </button>
      </article>

      {results.length > 0 && (
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Extracted Transactions (Mock)</h3>
          <ul className="mt-3 space-y-2">
            {results.map((row, index) => (
              <li
                key={`${row.merchant}-${index}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">{row.merchant}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {row.date} • {row.category}
                  </p>
                </div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{formatINR(row.amount)}</p>
              </li>
            ))}
          </ul>
        </article>
      )}
    </section>
  );
}
