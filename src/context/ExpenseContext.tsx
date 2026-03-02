import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { mockExpenses } from '../data/mockData';
import {
  EXPENSE_CATEGORIES,
  type AddExpenseInput,
  type CategoryPoint,
  type Expense,
  type MonthlyPoint,
} from '../types/spendsense';

interface ExpenseContextValue {
  expenses: Expense[];
  thisMonthTotal: number;
  lastMonthTotal: number;
  difference: number;
  categoryData: CategoryPoint[];
  monthlyTrend: MonthlyPoint[];
  insights: string[];
  addExpense: (input: AddExpenseInput) => void;
  clearData: () => void;
  exportData: () => string;
}

const STORAGE_KEY = 'spendsense-local-expenses';
const ExpenseContext = createContext<ExpenseContextValue | null>(null);

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const monthId = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const monthLabel = (date: Date): string =>
  date.toLocaleDateString('en-US', { month: 'short' });

const toMonthTotal = (items: Expense[], targetMonth: string): number =>
  items
    .filter((expense) => monthId(new Date(expense.date)) === targetMonth)
    .reduce((sum, expense) => sum + expense.amount, 0);

const loadInitial = (): Expense[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return mockExpenses;

  try {
    const parsed = JSON.parse(stored) as Expense[];
    return parsed.length ? parsed : mockExpenses;
  } catch {
    return mockExpenses;
  }
};

export function ExpenseProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>(loadInitial);

  const persist = useCallback((next: Expense[]) => {
    setExpenses(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const addExpense = useCallback(
    (input: AddExpenseInput) => {
      const next: Expense = {
        id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        amount: input.amount,
        category: input.category,
        note: input.note.trim(),
        date: input.date,
      };
      persist([next, ...expenses]);
    },
    [expenses, persist],
  );

  const clearData = useCallback(() => {
    persist([]);
  }, [persist]);

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
    const foodTotal = categoryData.find((point) => point.name === 'Food')?.value ?? 0;
    const foodShare = thisMonthTotal ? Math.round((foodTotal / thisMonthTotal) * 100) : 0;
    const changePct = lastMonthTotal
      ? Math.round((Math.abs(difference) / lastMonthTotal) * 100)
      : 0;

    const insights = [
      `Food spending is ${foodShare}% of this month spend.`,
      `${topCategory?.name ?? 'Food'} is your largest expense category this month.`,
      difference >= 0
        ? `Spending increased by ${changePct}% compared to last month.`
        : `Spending decreased by ${changePct}% compared to last month.`,
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

export const formatMoney = (amount: number): string => currency.format(amount);
