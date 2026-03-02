import { TransactionsTable } from '../components/transactions/TransactionsTable';

export function TransactionsPage() {
  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Transactions</h2>
        <p className="mt-1 text-sm text-slate-600">Browse all local expenses with quick filters.</p>
      </div>
      <TransactionsTable />
    </section>
  );
}
