/**
 * IndexedDB wrapper for SpendSense expense storage
 * Provides a simple Promise-based API for storing and querying expenses locally
 */

import type {
  Expense,
  ExpenseFilters,
  MonthlyStats,
  ExpenseCategory,
  AIInsight,
} from '../types/expense';

const DB_NAME = 'SpendSenseDB';
const DB_VERSION = 1;

// Object store names
const STORES = {
  EXPENSES: 'expenses',
  INSIGHTS: 'insights',
  SETTINGS: 'settings',
} as const;

class ExpenseDB {
  private db: IDBDatabase | null = null;

  /**
   * Initialize the database connection
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Expenses store
        if (!db.objectStoreNames.contains(STORES.EXPENSES)) {
          const expenseStore = db.createObjectStore(STORES.EXPENSES, { keyPath: 'id' });
          expenseStore.createIndex('date', 'date', { unique: false });
          expenseStore.createIndex('category', 'category', { unique: false });
          expenseStore.createIndex('amount', 'amount', { unique: false });
          expenseStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // AI Insights store
        if (!db.objectStoreNames.contains(STORES.INSIGHTS)) {
          const insightsStore = db.createObjectStore(STORES.INSIGHTS, { keyPath: 'id' });
          insightsStore.createIndex('generatedAt', 'generatedAt', { unique: false });
          insightsStore.createIndex('type', 'type', { unique: false });
        }

        // Settings store (key-value pairs)
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Add a new expense
   */
  async addExpense(expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<Expense> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date();
    const newExpense: Expense = {
      ...expense,
      id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
      date: expense.date instanceof Date ? expense.date : new Date(expense.date),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.EXPENSES], 'readwrite');
      const store = transaction.objectStore(STORES.EXPENSES);
      const request = store.add(newExpense);

      request.onsuccess = () => resolve(newExpense);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update an existing expense
   */
  async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense> {
    if (!this.db) throw new Error('Database not initialized');

    const existing = await this.getExpense(id);
    if (!existing) throw new Error('Expense not found');

    const updated: Expense = {
      ...existing,
      ...updates,
      id, // Prevent ID change
      updatedAt: new Date(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.EXPENSES], 'readwrite');
      const store = transaction.objectStore(STORES.EXPENSES);
      const request = store.put(updated);

      request.onsuccess = () => resolve(updated);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete an expense
   */
  async deleteExpense(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.EXPENSES], 'readwrite');
      const store = transaction.objectStore(STORES.EXPENSES);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get a single expense by ID
   */
  async getExpense(id: string): Promise<Expense | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.EXPENSES], 'readonly');
      const store = transaction.objectStore(STORES.EXPENSES);
      const request = store.get(id);

      request.onsuccess = () => {
        const expense = request.result;
        if (expense) {
          // Convert date strings back to Date objects
          expense.date = new Date(expense.date);
          expense.createdAt = new Date(expense.createdAt);
          expense.updatedAt = new Date(expense.updatedAt);
        }
        resolve(expense || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all expenses with optional filters
   */
  async getExpenses(filters?: ExpenseFilters): Promise<Expense[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.EXPENSES], 'readonly');
      const store = transaction.objectStore(STORES.EXPENSES);
      const request = store.getAll();

      request.onsuccess = () => {
        let expenses: Expense[] = request.result;

        // Convert date strings to Date objects
        expenses = expenses.map((exp) => ({
          ...exp,
          date: new Date(exp.date),
          createdAt: new Date(exp.createdAt),
          updatedAt: new Date(exp.updatedAt),
        }));

        // Apply filters
        if (filters) {
          expenses = this.applyFilters(expenses, filters);
        }

        // Sort by date (newest first)
        expenses.sort((a, b) => b.date.getTime() - a.date.getTime());

        resolve(expenses);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Apply filters to expense list
   */
  private applyFilters(expenses: Expense[], filters: ExpenseFilters): Expense[] {
    return expenses.filter((exp) => {
      if (filters.startDate && exp.date < filters.startDate) return false;
      if (filters.endDate && exp.date > filters.endDate) return false;
      if (filters.categories && !filters.categories.includes(exp.category)) return false;
      if (filters.minAmount !== undefined && exp.amount < filters.minAmount) return false;
      if (filters.maxAmount !== undefined && exp.amount > filters.maxAmount) return false;
      if (filters.paymentMethod && exp.paymentMethod !== filters.paymentMethod) return false;
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        const matchesNote = exp.note.toLowerCase().includes(term);
        const matchesMerchant = exp.merchant?.toLowerCase().includes(term);
        const matchesTags = exp.tags?.some((tag) => tag.toLowerCase().includes(term));
        if (!matchesNote && !matchesMerchant && !matchesTags) return false;
      }
      return true;
    });
  }

  /**
   * Get expenses for a specific month
   */
  async getExpensesByMonth(year: number, month: number): Promise<Expense[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    return this.getExpenses({ startDate, endDate });
  }

  /**
   * Calculate monthly statistics
   */
  async getMonthlyStats(year: number, month: number): Promise<MonthlyStats> {
    const expenses = await this.getExpensesByMonth(year, month);

    const categoryBreakdown: Record<ExpenseCategory, number> = {
      food: 0,
      shopping: 0,
      travel: 0,
      bills: 0,
      entertainment: 0,
      healthcare: 0,
      education: 0,
      personal: 0,
      other: 0,
    };

    let totalSpent = 0;
    const merchantTotals: Record<string, number> = {};

    expenses.forEach((exp) => {
      totalSpent += exp.amount;
      categoryBreakdown[exp.category] += exp.amount;

      if (exp.merchant) {
        merchantTotals[exp.merchant] = (merchantTotals[exp.merchant] || 0) + exp.amount;
      }
    });

    // Find top category
    const topCategory = Object.entries(categoryBreakdown).reduce((a, b) =>
      b[1] > a[1] ? b : a
    )[0] as ExpenseCategory;

    // Find top merchant
    const topMerchant = Object.entries(merchantTotals).reduce(
      (a, b) => (b[1] > a[1] ? b : a),
      ['', 0]
    )[0];

    return {
      year,
      month,
      totalSpent,
      categoryBreakdown,
      transactionCount: expenses.length,
      averageTransaction: expenses.length > 0 ? totalSpent / expenses.length : 0,
      topCategory,
      topMerchant: topMerchant || undefined,
    };
  }

  /**
   * Save AI-generated insight
   */
  async saveInsight(insight: Omit<AIInsight, 'id' | 'generatedAt'>): Promise<AIInsight> {
    if (!this.db) throw new Error('Database not initialized');

    const newInsight: AIInsight = {
      ...insight,
      id: `ins_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      generatedAt: new Date(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.INSIGHTS], 'readwrite');
      const store = transaction.objectStore(STORES.INSIGHTS);
      const request = store.add(newInsight);

      request.onsuccess = () => resolve(newInsight);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get recent AI insights
   */
  async getRecentInsights(limit: number = 5): Promise<AIInsight[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.INSIGHTS], 'readonly');
      const store = transaction.objectStore(STORES.INSIGHTS);
      const index = store.index('generatedAt');
      const request = index.openCursor(null, 'prev');

      const insights: AIInsight[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && insights.length < limit) {
          const insight = cursor.value;
          insight.generatedAt = new Date(insight.generatedAt);
          insights.push(insight);
          cursor.continue();
        } else {
          resolve(insights);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all expenses (for testing)
   */
  async clearAllExpenses(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.EXPENSES], 'readwrite');
      const store = transaction.objectStore(STORES.EXPENSES);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    totalExpenses: number;
    totalAmount: number;
    oldestExpense: Date | null;
    newestExpense: Date | null;
  }> {
    const expenses = await this.getExpenses();

    return {
      totalExpenses: expenses.length,
      totalAmount: expenses.reduce((sum, exp) => sum + exp.amount, 0),
      oldestExpense: expenses.length > 0 ? new Date(Math.min(...expenses.map((e) => e.date.getTime()))) : null,
      newestExpense: expenses.length > 0 ? new Date(Math.max(...expenses.map((e) => e.date.getTime()))) : null,
    };
  }
}

// Export singleton instance
export const expenseDB = new ExpenseDB();
