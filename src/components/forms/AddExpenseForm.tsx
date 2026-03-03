import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExpenses } from '../../context/ExpenseContext';
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '../../types/spendsense';

interface FormErrors {
  amount?: string;
  note?: string;
  category?: string;
}

const today = new Date().toISOString().slice(0, 10);

export function AddExpenseForm() {
  const navigate = useNavigate();
  const { addExpense, storageError } = useExpenses();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory | ''>('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(today);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    const nextErrors: FormErrors = {};
    setSubmitError(null);

    const amountValue = Number(amount);
    if (!amount || Number.isNaN(amountValue) || amountValue <= 0) {
      nextErrors.amount = 'Enter a valid amount greater than 0.';
    }
    if (!category) nextErrors.category = 'Select a category.';
    if (!note.trim()) nextErrors.note = 'Add a merchant or note.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const safeCategory = category as ExpenseCategory;
    setSubmitting(true);
    try {
      await addExpense({
        amount: amountValue,
        category: safeCategory,
        note,
        date,
      });
      navigate('/');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not save expense.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900"
    >
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add Expense</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Save new spending entries directly on this device.
      </p>
      {(submitError || storageError) && (
        <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          {submitError ?? storageError}
        </p>
      )}

      <div className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Amount</label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 dark:text-slate-400">
              ₹
            </span>
            <input
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0"
              className="w-full rounded-xl border border-slate-300 py-2 pl-7 pr-3 text-sm transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-900/50"
            />
          </div>
          {errors.amount && <p className="mt-1 text-xs text-rose-600">{errors.amount}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Category</label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-900/50"
          >
            <option value="">Select category</option>
            {EXPENSE_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          {errors.category && <p className="mt-1 text-xs text-rose-600">{errors.category}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Note / Merchant</label>
          <input
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Coffee shop, groceries, ride fare..."
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-900/50"
          />
          {errors.note && <p className="mt-1 text-xs text-rose-600">{errors.note}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Date</label>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-900/50"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {submitting ? 'Saving...' : 'Save Expense'}
        </button>
      </div>
    </form>
  );
}
