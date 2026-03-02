/**
 * ExpenseForm - Manual expense entry component
 */

import { useState, type FormEvent } from 'react';
import type { ExpenseCategory, PaymentMethod } from '../types/expense';
import { CATEGORY_INFO, getCategoryInfo } from '../types/expense';
import { expenseDB } from '../db/expenseDB';

interface ExpenseFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ExpenseForm({ onSuccess, onCancel }: ExpenseFormProps) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('food' as ExpenseCategory);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [merchant, setMerchant] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi' as PaymentMethod);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!note.trim()) {
      setError('Please add a note or description');
      return;
    }

    setSubmitting(true);

    try {
      await expenseDB.addExpense({
        amount: amountNum,
        category,
        note: note.trim(),
        date: new Date(date),
        merchant: merchant.trim() || undefined,
        paymentMethod,
        source: 'manual',
      });

      // Reset form
      setAmount('');
      setNote('');
      setMerchant('');
      setDate(new Date().toISOString().split('T')[0]);
      
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="expense-form">
      <h3>Add New Expense</h3>

      {error && <div className="error-message">{error}</div>}

      {/* Amount Input */}
      <div className="form-group">
        <label htmlFor="amount">
          Amount <span className="required">*</span>
        </label>
        <div className="input-with-prefix">
          <span className="currency-prefix">₹</span>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            required
            disabled={submitting}
          />
        </div>
      </div>

      {/* Category Selection */}
      <div className="form-group">
        <label htmlFor="category">
          Category <span className="required">*</span>
        </label>
        <div className="category-grid">
          {Object.entries(CATEGORY_INFO).map(([key, info]) => {
            const catKey = key as ExpenseCategory;
            const isSelected = category === catKey;
            return (
              <button
                key={key}
                type="button"
                className={`category-button ${isSelected ? 'selected' : ''}`}
                onClick={() => setCategory(catKey)}
                disabled={submitting}
                style={{
                  borderColor: isSelected ? info.color : undefined,
                  backgroundColor: isSelected ? `${info.color}20` : undefined,
                }}
              >
                <span className="category-icon">{info.icon}</span>
                <span className="category-label">{info.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Note/Description */}
      <div className="form-group">
        <label htmlFor="note">
          Description <span className="required">*</span>
        </label>
        <input
          type="text"
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g., Lunch at restaurant"
          required
          disabled={submitting}
        />
      </div>

      {/* Date */}
      <div className="form-group">
        <label htmlFor="date">
          Date <span className="required">*</span>
        </label>
        <input
          type="date"
          id="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={new Date().toISOString().split('T')[0]}
          required
          disabled={submitting}
        />
      </div>

      {/* Merchant (Optional) */}
      <div className="form-group">
        <label htmlFor="merchant">Merchant (Optional)</label>
        <input
          type="text"
          id="merchant"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          placeholder="e.g., Swiggy, Amazon"
          disabled={submitting}
        />
      </div>

      {/* Payment Method */}
      <div className="form-group">
        <label htmlFor="paymentMethod">Payment Method</label>
        <select
          id="paymentMethod"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
          disabled={submitting}
        >
          <option value="upi">UPI</option>
          <option value="card">Card</option>
          <option value="cash">Cash</option>
          <option value="net_banking">Net Banking</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Form Actions */}
      <div className="form-actions">
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={submitting} className="btn-secondary">
            Cancel
          </button>
        )}
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Adding...' : 'Add Expense'}
        </button>
      </div>
    </form>
  );
}
