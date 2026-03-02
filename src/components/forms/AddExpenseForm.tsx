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
  const { addExpense } = useExpenses();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory | ''>('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(today);
  const [errors, setErrors] = useState<FormErrors>({});

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: FormErrors = {};

    const amountValue = Number(amount);
    if (!amount || Number.isNaN(amountValue) || amountValue <= 0) {
      nextErrors.amount = 'Enter a valid amount greater than 0.';
    }
    if (!category) nextErrors.category = 'Select a category.';
    if (!note.trim()) nextErrors.note = 'Add a merchant or note.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const safeCategory = category as ExpenseCategory;
    addExpense({
      amount: amountValue,
      category: safeCategory,
      note,
      date,
    });

    navigate('/');
  };

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Add Expense</h2>
      <p className="mt-1 text-sm text-slate-500">Save new spending entries directly on this device.</p>

      <div className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Amount</label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
              ₹
            </span>
            <input
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0"
              className="w-full rounded-xl border border-slate-300 py-2 pl-7 pr-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>
          {errors.amount && <p className="mt-1 text-xs text-rose-600">{errors.amount}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Category</label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
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
          <label className="block text-sm font-medium text-slate-700">Note / Merchant</label>
          <input
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Coffee shop, groceries, ride fare..."
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
          {errors.note && <p className="mt-1 text-xs text-rose-600">{errors.note}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Date</label>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
        >
          Save Expense
        </button>
      </div>
    </form>
  );
}
