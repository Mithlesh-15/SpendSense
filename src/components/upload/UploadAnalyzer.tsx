import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { formatINR, useExpenses } from '../../context/ExpenseContext';
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '../../types/spendsense';
import {
  analyzeReceiptLocally,
  type ExtractedReceiptTransaction,
} from '../../services/receiptScanner';

export function UploadAnalyzer() {
  const { addExpense } = useExpenses();
  const [file, setFile] = useState<File | null>(null);
  const [transactions, setTransactions] = useState<ExtractedReceiptTransaction[]>([]);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState('');
  const [loadingOCR, setLoadingOCR] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [needsReview, setNeedsReview] = useState(false);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onFileChange = (next: File | null) => {
    setFile(next);
    setTransactions([]);
    setNeedsReview(false);
    setError(null);
    setSuccess(null);
    setOcrProgress(0);
    setOcrStatus('');
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const dropped = event.dataTransfer.files?.[0] ?? null;
    onFileChange(dropped);
  };

  const saveTransactions = async (rows: ExtractedReceiptTransaction[]) => {
    if (rows.length === 0) {
      setError('No valid transactions found to save.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await Promise.all(
        rows.map((row) =>
          addExpense({
            amount: row.amount,
            category: row.category,
            note: row.merchant,
            date: row.date,
          }),
        ),
      );
      setSuccess(`${rows.length} transaction${rows.length > 1 ? 's' : ''} saved locally.`);
      setTransactions([]);
      setNeedsReview(false);
      setFile(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save extracted transactions.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const onAnalyze = async () => {
    if (!file) return;
    setError(null);
    setSuccess(null);
    setTransactions([]);
    setNeedsReview(false);
    setLoadingOCR(true);
    setLoadingAI(false);

    try {
      const result = await analyzeReceiptLocally(file, (progress, status) => {
        setOcrProgress(progress);
        setOcrStatus(status);
      });
      setLoadingOCR(false);
      setLoadingAI(true);
      setTransactions(result.transactions);

      if (result.lowConfidence) {
        setNeedsReview(true);
        setSuccess(
          `Detected ${result.transactions.length} transaction${result.transactions.length > 1 ? 's' : ''}. Please review before saving.`,
        );
      } else {
        await saveTransactions(result.transactions);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Receipt processing failed.';
      setError(`Could not process receipt: ${message}`);
    } finally {
      setLoadingOCR(false);
      setLoadingAI(false);
    }
  };

  const updateTransaction = (
    index: number,
    patch: Partial<ExtractedReceiptTransaction>,
  ) => {
    setTransactions((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  return (
    <section className="space-y-4">
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Upload Receipt</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Upload JPG or PNG receipts. OCR and AI parsing run locally on your device.
        </p>

        <label
          onDrop={onDrop}
          onDragOver={(event) => event.preventDefault()}
          className="mt-4 block cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center transition hover:border-sky-400 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-sky-500 dark:hover:bg-slate-900"
        >
          <input
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Drag and drop receipt image
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            or tap to select JPG / PNG
          </p>
        </label>

        {previewUrl && (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
            <img src={previewUrl} alt="Receipt preview" className="h-52 w-full object-cover" />
          </div>
        )}

        <button
          type="button"
          disabled={!file || loadingOCR || loadingAI || saving}
          onClick={onAnalyze}
          className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {loadingOCR
            ? 'Running OCR...'
            : loadingAI
              ? 'Extracting Transactions...'
              : saving
                ? 'Saving Transactions...'
                : 'Analyze Receipt Locally'}
        </button>

        {(loadingOCR || loadingAI) && (
          <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300">
            {loadingOCR
              ? `OCR in progress: ${Math.round(ocrProgress * 100)}% (${ocrStatus || 'processing'})`
              : 'Analyzing OCR text with on-device AI...'}
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </p>
        )}
        {success && (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            {success}
          </p>
        )}
      </article>

      {needsReview && transactions.length > 0 && (
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Review Extracted Transactions
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Confidence is low. Review and save all transactions.
          </p>

          <div className="mt-3 space-y-3">
            {transactions.map((row, index) => (
              <div
                key={`${row.merchant}-${index}`}
                className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="date"
                    value={row.date}
                    onChange={(event) => updateTransaction(index, { date: event.target.value })}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.amount}
                    onChange={(event) =>
                      updateTransaction(index, { amount: Number(event.target.value || 0) })
                    }
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
                <input
                  type="text"
                  value={row.merchant}
                  onChange={(event) => updateTransaction(index, { merchant: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <div className="mt-2 flex items-center justify-between">
                  <select
                    value={row.category}
                    onChange={(event) =>
                      updateTransaction(index, { category: event.target.value as ExpenseCategory })
                    }
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  >
                    {EXPENSE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    {formatINR(row.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void saveTransactions(transactions)}
            disabled={saving}
            className="mt-4 w-full rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {saving ? 'Saving...' : `Save ${transactions.length} Transaction${transactions.length > 1 ? 's' : ''}`}
          </button>
        </article>
      )}
    </section>
  );
}
