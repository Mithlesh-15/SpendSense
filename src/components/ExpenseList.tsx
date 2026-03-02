/**
 * ExpenseList - Display and manage expense transactions
 */

import { useState, useEffect } from 'react';
import type { Expense, ExpenseFilters } from '../types/expense';
import { expenseDB } from '../db/expenseDB';
import { formatCurrency, formatDate, getCategoryInfo } from '../types/expense';

export function ExpenseList() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ExpenseFilters>({});

  useEffect(() => {
    loadExpenses();
  }, [filters]);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const data = await expenseDB.getExpenses(filters);
      setExpenses(data);
    } catch (error) {
      console.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      await expenseDB.deleteExpense(id);
      await loadExpenses();
    } catch (error) {
      console.error('Failed to delete expense:', error);
      alert('Failed to delete expense');
    }
  };

  if (loading) {
    return (
      <div className="list-loading">
        <div className="spinner"></div>
        <p>Loading expenses...</p>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="list-empty">
        <p>No expenses found. Start adding your expenses to track your spending!</p>
      </div>
    );
  }

  return (
    <div className="expense-list">
      <div className="list-header">
        <h3>Recent Transactions</h3>
        <div className="list-count">{expenses.length} expenses</div>
      </div>

      <div className="expenses">
        {expenses.map((expense) => (
          <ExpenseItem key={expense.id} expense={expense} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}

function ExpenseItem({ expense, onDelete }: { expense: Expense; onDelete: (id: string) => void }) {
  const categoryInfo = getCategoryInfo(expense.category);

  return (
    <div className="expense-item">
      <div className="expense-icon" style={{ backgroundColor: `${categoryInfo.color}20` }}>
        {categoryInfo.icon}
      </div>

      <div className="expense-details">
        <div className="expense-header">
          <span className="expense-note">{expense.note}</span>
          <span className="expense-amount">{formatCurrency(expense.amount)}</span>
        </div>
        <div className="expense-meta">
          <span className="expense-category">{categoryInfo.label}</span>
          {expense.merchant && <span className="expense-merchant">• {expense.merchant}</span>}
          <span className="expense-date">• {formatDate(expense.date)}</span>
        </div>
        {expense.paymentMethod && (
          <div className="expense-payment">
            {expense.paymentMethod.replace('_', ' ').toUpperCase()}
          </div>
        )}
      </div>

      <button
        className="expense-delete"
        onClick={() => onDelete(expense.id)}
        title="Delete expense"
      >
        🗑️
      </button>
    </div>
  );
}
