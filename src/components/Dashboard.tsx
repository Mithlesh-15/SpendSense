/**
 * Dashboard - Main overview with charts and statistics
 */

import { useState, useEffect } from 'react';
import type { MonthlyStats, ExpenseCategory } from '../types/expense';
import { CATEGORY_INFO, formatCurrency, getMonthName } from '../types/expense';
import { expenseDB } from '../db/expenseDB';

export function Dashboard() {
  const [currentMonth, setCurrentMonth] = useState<MonthlyStats | null>(null);
  const [previousMonth, setPreviousMonth] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const current = await expenseDB.getMonthlyStats(now.getFullYear(), now.getMonth() + 1);
      setCurrentMonth(current);

      // Get previous month
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previous = await expenseDB.getMonthlyStats(prevDate.getFullYear(), prevDate.getMonth() + 1);
      setPreviousMonth(previous);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading statistics...</p>
      </div>
    );
  }

  if (!currentMonth) {
    return (
      <div className="dashboard-empty">
        <p>No expenses recorded yet. Start adding expenses to see your dashboard!</p>
      </div>
    );
  }

  const changePercent = previousMonth && previousMonth.totalSpent > 0
    ? ((currentMonth.totalSpent - previousMonth.totalSpent) / previousMonth.totalSpent) * 100
    : 0;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>{getMonthName(currentMonth.month)} {currentMonth.year}</h2>
        <button onClick={loadStats} className="btn-refresh">
          🔄 Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="card card-total">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <div className="card-label">Total Spent</div>
            <div className="card-value">{formatCurrency(currentMonth.totalSpent)}</div>
            {previousMonth && (
              <div className={`card-change ${changePercent >= 0 ? 'increase' : 'decrease'}`}>
                {changePercent >= 0 ? '↑' : '↓'} {Math.abs(changePercent).toFixed(1)}% from last month
              </div>
            )}
          </div>
        </div>

        <div className="card card-transactions">
          <div className="card-icon">📝</div>
          <div className="card-content">
            <div className="card-label">Transactions</div>
            <div className="card-value">{currentMonth.transactionCount}</div>
            <div className="card-subtitle">
              Avg: {formatCurrency(currentMonth.averageTransaction)}
            </div>
          </div>
        </div>

        <div className="card card-top">
          <div className="card-icon">{CATEGORY_INFO[currentMonth.topCategory].icon}</div>
          <div className="card-content">
            <div className="card-label">Top Category</div>
            <div className="card-value">{CATEGORY_INFO[currentMonth.topCategory].label}</div>
            <div className="card-subtitle">
              {formatCurrency(currentMonth.categoryBreakdown[currentMonth.topCategory])}
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown Chart */}
      <div className="chart-section">
        <h3>Spending by Category</h3>
        <CategoryBreakdownChart breakdown={currentMonth.categoryBreakdown} />
      </div>

      {/* Month Comparison */}
      {previousMonth && (
        <div className="chart-section">
          <h3>Month Comparison</h3>
          <MonthComparisonChart current={currentMonth} previous={previousMonth} />
        </div>
      )}
    </div>
  );
}

/**
 * Category Breakdown Chart - Horizontal bar chart
 */
function CategoryBreakdownChart({ breakdown }: { breakdown: Record<ExpenseCategory, number> }) {
  const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
  
  if (total === 0) {
    return <p className="chart-empty">No expenses to display</p>;
  }

  const sortedCategories = Object.entries(breakdown)
    .filter(([_, amount]) => amount > 0)
    .sort(([_, a], [__, b]) => b - a) as [ExpenseCategory, number][];

  return (
    <div className="category-chart">
      {sortedCategories.map(([category, amount]) => {
        const percentage = (amount / total) * 100;
        const info = CATEGORY_INFO[category];
        
        return (
          <div key={category} className="category-bar">
            <div className="category-info">
              <span className="category-icon">{info.icon}</span>
              <span className="category-name">{info.label}</span>
            </div>
            <div className="bar-container">
              <div 
                className="bar-fill" 
                style={{ 
                  width: `${percentage}%`, 
                  backgroundColor: info.color 
                }}
              />
            </div>
            <div className="category-amount">
              <div className="amount">{formatCurrency(amount)}</div>
              <div className="percentage">{percentage.toFixed(1)}%</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Month Comparison Chart - Side-by-side bars
 */
function MonthComparisonChart({ current, previous }: { current: MonthlyStats; previous: MonthlyStats }) {
  const maxAmount = Math.max(current.totalSpent, previous.totalSpent);

  return (
    <div className="comparison-chart">
      <div className="comparison-bar">
        <div className="bar-label">
          <div>{getMonthName(previous.month)}</div>
          <div className="bar-value">{formatCurrency(previous.totalSpent)}</div>
        </div>
        <div className="bar-container">
          <div 
            className="bar-fill bar-previous" 
            style={{ width: `${(previous.totalSpent / maxAmount) * 100}%` }}
          />
        </div>
      </div>

      <div className="comparison-bar">
        <div className="bar-label">
          <div>{getMonthName(current.month)}</div>
          <div className="bar-value">{formatCurrency(current.totalSpent)}</div>
        </div>
        <div className="bar-container">
          <div 
            className="bar-fill bar-current" 
            style={{ width: `${(current.totalSpent / maxAmount) * 100}%` }}
          />
        </div>
      </div>

      <div className="comparison-summary">
        {current.totalSpent > previous.totalSpent ? (
          <div className="summary-increase">
            ⚠️ Spent {formatCurrency(current.totalSpent - previous.totalSpent)} more this month
          </div>
        ) : current.totalSpent < previous.totalSpent ? (
          <div className="summary-decrease">
            ✅ Saved {formatCurrency(previous.totalSpent - current.totalSpent)} this month
          </div>
        ) : (
          <div className="summary-same">
            Spending remained the same
          </div>
        )}
      </div>
    </div>
  );
}
