import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  EXPENSE_CATEGORIES,
  type AddExpenseInput,
  type CategoryPoint,
  type Expense,
  type MonthlyPoint,
} from '../types/spendsense';
import { storageService } from '../services/storageService';

interface ExpenseContextValue {
  expenses: Expense[];
  thisMonthTotal: number;
  lastMonthTotal: number;
  difference: number;
  categoryData: CategoryPoint[];
  monthlyTrend: MonthlyPoint[];
  insights: string[];
  isLoading: boolean;
  storageError: string | null;
  addExpense: (input: AddExpenseInput) => Promise<void>;
  clearData: () => Promise<void>;
  exportData: () => string;
}

const ExpenseContext = createContext<ExpenseContextValue | null>(null);

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const monthId = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const monthLabel = (date: Date): string =>
  date.toLocaleDateString('en-IN', { month: 'short' });

const toMonthTotal = (items: Expense[], targetMonth: string): number =>
  items
    .filter((expense) => monthId(new Date(expense.date)) === targetMonth)
    .reduce((sum, expense) => sum + expense.amount, 0);

export function ExpenseProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);

  const loadExpenses = useCallback(async () => {
    setIsLoading(true);
    setStorageError(null);
    try {
      const loaded = await storageService.getExpenses();
      setExpenses(loaded);
    } catch (error) {
      setStorageError(
        error instanceof Error ? error.message : 'Failed to load local expense data.',
      );
      setExpenses([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses]);

  const addExpense = useCallback(async (input: AddExpenseInput) => {
    setStorageError(null);
    try {
      const saved = await storageService.addExpense(input);
      setExpenses((prev) =>
        [saved, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save expense locally.';
      setStorageError(message);
      throw new Error(message);
    }
  }, []);

  const clearData = useCallback(async () => {
    setStorageError(null);
    try {
      await storageService.clearExpenses();
      setExpenses([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to clear local data.';
      setStorageError(message);
      throw new Error(message);
    }
  }, []);

  const exportData = useCallback(() => JSON.stringify(expenses, null, 2), [expenses]);

  const analytics = useMemo(() => {
    const now = new Date();
    const currentMonthKey = monthId(now);
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthKey = monthId(previousMonth);

    const thisMonthTotal = toMonthTotal(expenses, currentMonthKey);
    const lastMonthTotal = toMonthTotal(expenses, previousMonthKey);
    const difference = thisMonthTotal - lastMonthTotal;

    const currentMonthExpenses = expenses.filter(
      (expense) => monthId(new Date(expense.date)) === currentMonthKey,
    );

    const categoryData: CategoryPoint[] = EXPENSE_CATEGORIES.map((category) => ({
      name: category,
      value: currentMonthExpenses
        .filter((expense) => expense.category === category)
        .reduce((sum, expense) => sum + expense.amount, 0),
    }));

    const monthlyTrend: MonthlyPoint[] = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const key = monthId(date);
      return {
        month: monthLabel(date),
        total: toMonthTotal(expenses, key),
      };
    });

    const topCategory = [...categoryData].sort((a, b) => b.value - a.value)[0];
    const changePct = lastMonthTotal
      ? Math.round((Math.abs(difference) / lastMonthTotal) * 100)
      : 0;

    const insights = [
      expenses.length === 0
        ? 'Add your first expense to unlock personalized spending insights.'
        : `${topCategory?.name ?? 'Others'} is your largest expense category this month.`,
      difference >= 0
        ? `Spending increased by ${changePct}% compared to last month.`
        : `Spending decreased by ${changePct}% compared to last month.`,
      thisMonthTotal === 0
        ? 'No expenses recorded this month yet.'
        : `Total spend this month is ${formatINR(thisMonthTotal)}.`,
    ];

    return {
      thisMonthTotal,
      lastMonthTotal,
      difference,
      categoryData,
      monthlyTrend,
      insights,
    };
  }, [expenses]);

  const value: ExpenseContextValue = {
    expenses,
    thisMonthTotal: analytics.thisMonthTotal,
    lastMonthTotal: analytics.lastMonthTotal,
    difference: analytics.difference,
    categoryData: analytics.categoryData,
    monthlyTrend: analytics.monthlyTrend,
    insights: analytics.insights,
    isLoading,
    storageError,
    addExpense,
    clearData,
    exportData,
  };

  return <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>;
}

export function useExpenses() {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error('useExpenses must be used within ExpenseProvider');
  }
  return context;
}

export const formatINR = (amount: number): string => currency.format(amount);
