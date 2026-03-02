import { formatINR } from '../../context/ExpenseContext';

interface SummaryCardsProps {
  thisMonthTotal: number;
  lastMonthTotal: number;
  difference: number;
}

export function SummaryCards({
  thisMonthTotal,
  lastMonthTotal,
  difference,
}: SummaryCardsProps) {
  const isUp = difference >= 0;

  return (
    <section className="grid gap-3 sm:grid-cols-3">
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Total Spent This Month
        </p>
        <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{formatINR(thisMonthTotal)}</p>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Last Month Spend
        </p>
        <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{formatINR(lastMonthTotal)}</p>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Difference</p>
        <p
          className={[
            'mt-2 text-2xl font-bold',
            isUp ? 'text-rose-600' : 'text-emerald-600',
          ].join(' ')}
        >
          {isUp ? '+' : '-'}
          {formatINR(Math.abs(difference))}
        </p>
        <p className={['mt-1 text-xs font-medium', isUp ? 'text-rose-600' : 'text-emerald-600'].join(' ')}>
          {isUp ? 'Increase vs last month' : 'Decrease vs last month'}
        </p>
      </article>
    </section>
  );
}
