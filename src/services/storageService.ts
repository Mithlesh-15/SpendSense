import type { AddExpenseInput, Expense } from '../types/spendsense';

const DB_NAME = 'SpendSenseLocalDB';
const DB_VERSION = 1;
const STORE_EXPENSES = 'expenses';

class StorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB.'));
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_EXPENSES)) {
          const store = db.createObjectStore(STORE_EXPENSES, { keyPath: 'id' });
          store.createIndex('date', 'date', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
    });

    return this.dbPromise;
  }

  private createId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `exp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  async getExpenses(): Promise<Expense[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_EXPENSES, 'readonly');
      const store = tx.objectStore(STORE_EXPENSES);
      const request = store.getAll();

      request.onerror = () => reject(request.error ?? new Error('Failed to load expenses.'));
      request.onsuccess = () => {
        const expenses = (request.result as Expense[]).sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        resolve(expenses);
      };
    });
  }

  async addExpense(input: AddExpenseInput): Promise<Expense> {
    const db = await this.getDB();
    const expense: Expense = {
      id: this.createId(),
      amount: input.amount,
      category: input.category,
      note: input.note.trim(),
      date: input.date,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_EXPENSES, 'readwrite');
      const store = tx.objectStore(STORE_EXPENSES);
      const request = store.add(expense);

      request.onerror = () => reject(request.error ?? new Error('Failed to save expense.'));
      tx.oncomplete = () => resolve(expense);
      tx.onerror = () => reject(tx.error ?? new Error('Failed to save expense.'));
    });
  }

  async clearExpenses(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_EXPENSES, 'readwrite');
      const store = tx.objectStore(STORE_EXPENSES);
      const request = store.clear();

      request.onerror = () => reject(request.error ?? new Error('Failed to clear expenses.'));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to clear expenses.'));
    });
  }
}

export const storageService = new StorageService();
