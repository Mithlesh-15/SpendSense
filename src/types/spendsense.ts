export const EXPENSE_CATEGORIES = [
  'Food',
  'Shopping',
  'Travel',
  'Bills',
  'Entertainment',
  'Others',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  note: string;
  date: string;
}

export interface MonthlyPoint {
  month: string;
  total: number;
}

export interface CategoryPoint {
  name: ExpenseCategory;
  value: number;
}

export interface AddExpenseInput {
  amount: number;
  category: ExpenseCategory;
  note: string;
  date: string;
}
