import { useMemo, useState } from 'react';
import { formatINR, useExpenses } from '../../context/ExpenseContext';
import { EXPENSE_CATEGORIES, type Expense } from '../../types/spendsense';

type SortOrder = 'latest' | 'oldest' | 'amount-high' | 'amount-low';

const formatDate = (value: string): string =>
  new Date(value).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });

export function TransactionsTable() {
  const { expenses } = useExpenses();
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<SortOrder>('latest');

  const rows = useMemo(() => {
    let result = [...expenses];
    if (categoryFilter !== 'All') {
      result = result.filter((expense) => expense.category === categoryFilter);
    }

    const sorters: Record<SortOrder, (a: Expense, b: Expense) => number> = {
      latest: (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      oldest: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      'amount-high': (a, b) => b.amount - a.amount,
      'amount-low': (a, b) => a.amount - b.amount,
    };

    return result.sort(sorters[sortBy]);
  }, [categoryFilter, expenses, sortBy]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Category
          </label>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="mt-1 rounded-xl border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-900/50"
          >
            <option value="All">All</option>
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Sort</label>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortOrder)}
            className="mt-1 rounded-xl border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-900/50"
          >
            <option value="latest">Latest</option>
            <option value="oldest">Oldest</option>
            <option value="amount-high">Amount: High to Low</option>
            <option value="amount-low">Amount: Low to High</option>
          </select>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <th className="py-2 pr-4 font-semibold">Date</th>
              <th className="py-2 pr-4 font-semibold">Merchant / Note</th>
              <th className="py-2 pr-4 font-semibold">Category</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((expense) => (
              <tr key={expense.id}>
                <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{formatDate(expense.date)}</td>
                <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100">{expense.note}</td>
                <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{expense.category}</td>
                <td className="py-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                  {formatINR(expense.amount)}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  No transactions match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
