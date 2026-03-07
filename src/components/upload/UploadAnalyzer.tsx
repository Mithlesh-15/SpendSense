import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { formatINR, useExpenses } from '../../context/ExpenseContext';
import { useModelReadiness } from '../../context/ModelReadinessContext';
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '../../types/spendsense';
import {
  analyzeReceiptLocally,
  type ExtractedReceiptTransaction,
} from '../../services/receiptScanner';

type ProcessingState = 'idle' | 'ocr' | 'llm' | 'saving' | 'success' | 'error';

export function UploadAnalyzer() {
  const { addExpense } = useExpenses();
  const model = useModelReadiness();
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [transactions, setTransactions] = useState<ExtractedReceiptTransaction[]>([]);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [needsReview, setNeedsReview] = useState(false);
  const [llmSlow, setLlmSlow] = useState(false);
  const [modelNotice, setModelNotice] = useState<string | null>(null);
  const runIdRef = useRef(0);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const isProcessing = processingState === 'ocr' || processingState === 'llm' || processingState === 'saving';

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (processingState !== 'success') return;
    const timer = window.setTimeout(() => {
      setSuccess(null);
      setProcessingState('idle');
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [processingState]);

  useEffect(() => {
    if (processingState !== 'llm') {
      setLlmSlow(false);
      return;
    }
    const timer = window.setTimeout(() => setLlmSlow(true), 15_000);
    return () => window.clearTimeout(timer);
  }, [processingState]);

  const onFileChange = (next: File | null) => {
    setFile(next);
    setTransactions([]);
    setNeedsReview(false);
    setError(null);
    setSuccess(null);
    setModelNotice(null);
    setOcrProgress(0);
    setOcrStatus('');
    setProcessingState('idle');
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const dropped = event.dataTransfer.files?.[0] ?? null;
    onFileChange(dropped);
  };

  const saveTransactions = async (rows: ExtractedReceiptTransaction[]) => {
    if (rows.length === 0) {
      setError('Could not extract transactions. Please review manually.');
      setProcessingState('error');
      return;
    }

    setProcessingState('saving');
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
      setSuccess('✅ Transactions successfully saved');
      setTransactions([]);
      setNeedsReview(false);
      setFile(null);
      setProcessingState('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save extracted transactions.';
      setError(message);
      setProcessingState('error');
    }
  };

  const cancelProcessing = () => {
    runIdRef.current += 1;
    setProcessingState('idle');
    setLlmSlow(false);
    setError('Processing cancelled. You can try again.');
  };

  const onAnalyze = async () => {
    if (!file || isProcessing) return;
    runIdRef.current += 1;
    const runId = runIdRef.current;
    setError(null);
    setSuccess(null);
    setModelNotice(null);
    setTransactions([]);
    setNeedsReview(false);
    setOcrProgress(0);
    setOcrStatus('');
    setProcessingState('ocr');

    if (model.state !== 'ready') {
      setModelNotice('AI model not ready. Please wait.');
    }

    try {
      const result = await analyzeReceiptLocally(
        file,
        (progress, status) => {
          if (runIdRef.current !== runId) return;
          setOcrProgress(progress);
          setOcrStatus(status);
          setProcessingState('ocr');
        },
        (stage) => {
          if (runIdRef.current !== runId) return;
          setProcessingState(stage);
        },
        {
          llmReady: model.state === 'ready',
          modelStatus: model.state,
        },
      );

      if (runIdRef.current !== runId) return;
      setTransactions(result.transactions);

      if (result.lowConfidence) {
        setNeedsReview(true);
        setSuccess(
          `Detected ${result.transactions.length} transaction${result.transactions.length > 1 ? 's' : ''}. Please review before saving.`,
        );
        setProcessingState('idle');
      } else {
        await saveTransactions(result.transactions);
      }
    } catch (err) {
      if (runIdRef.current !== runId) return;
      const message = err instanceof Error ? err.message : 'Receipt processing failed.';
      setError(`❌ Could not extract transactions. Please review manually. (${message})`);
      setProcessingState('error');
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
            disabled={isProcessing}
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
          disabled={!file || isProcessing}
          onClick={onAnalyze}
          className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {processingState === 'ocr'
            ? 'Scanning receipt...'
            : processingState === 'llm'
              ? 'Analyzing transactions with AI...'
              : processingState === 'saving'
                ? 'Saving transactions locally...'
                : 'Analyze Receipt Locally'}
        </button>

        {processingState === 'ocr' && (
          <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-3 text-xs text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300">
            <p className="font-medium">Scanning receipt...</p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-sky-100 dark:bg-slate-800">
              <div
                className="h-2 rounded-full bg-sky-500 transition-all duration-200"
                style={{ width: `${Math.max(2, Math.min(100, Math.round(ocrProgress * 100)))}%` }}
              />
            </div>
            <p className="mt-1">
              {Math.round(ocrProgress * 100)}% {ocrStatus ? `(${ocrStatus})` : ''}
            </p>
          </div>
        )}

        {processingState === 'llm' && (
          <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-3 text-xs text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300">
            <p className="font-medium">Analyzing transactions with AI...</p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-indigo-100 dark:bg-slate-800">
              <div className="h-2 w-1/3 animate-[pulse_1.1s_ease-in-out_infinite] rounded-full bg-indigo-500" />
            </div>
            {llmSlow && (
              <div className="mt-2 flex items-center justify-between gap-2">
                <p>AI is taking longer than expected...</p>
                <button
                  type="button"
                  onClick={cancelProcessing}
                  className="rounded-lg bg-indigo-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {processingState === 'saving' && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <p className="font-medium">Saving transactions locally...</p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-emerald-100 dark:bg-slate-800">
              <div className="h-2 w-1/2 animate-[pulse_1.1s_ease-in-out_infinite] rounded-full bg-emerald-500" />
            </div>
          </div>
        )}

        {processingState === 'error' && error && (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </p>
        )}
        {modelNotice && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
            {modelNotice}
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
            disabled={isProcessing}
            className="mt-4 w-full rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {processingState === 'saving'
              ? 'Saving transactions locally...'
              : `Save ${transactions.length} Transaction${transactions.length > 1 ? 's' : ''}`}
          </button>
        </article>
      )}
    </section>
  );
}
