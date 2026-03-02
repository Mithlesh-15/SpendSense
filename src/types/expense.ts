/**
 * TypeScript types and interfaces for SpendSense expense tracking
 */

// Expense categories aligned with common spending patterns
export enum ExpenseCategory {
  FOOD = 'food',
  SHOPPING = 'shopping',
  TRAVEL = 'travel',
  BILLS = 'bills',
  ENTERTAINMENT = 'entertainment',
  HEALTHCARE = 'healthcare',
  EDUCATION = 'education',
  PERSONAL = 'personal',
  OTHER = 'other',
}

// Payment methods
export enum PaymentMethod {
  CASH = 'cash',
  UPI = 'upi',
  CARD = 'card',
  NET_BANKING = 'net_banking',
  OTHER = 'other',
}

// Core expense record
export interface Expense {
  id: string; // UUID
  amount: number;
  category: ExpenseCategory;
  note: string;
  date: Date;
  paymentMethod?: PaymentMethod;
  merchant?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  // For OCR/extracted expenses
  source?: 'manual' | 'ocr' | 'import';
  imageUrl?: string; // Optional receipt image (stored as blob URL)
}

// Monthly aggregate data
export interface MonthlyStats {
  year: number;
  month: number; // 1-12
  totalSpent: number;
  categoryBreakdown: Record<ExpenseCategory, number>;
  transactionCount: number;
  averageTransaction: number;
  topCategory: ExpenseCategory;
  topMerchant?: string;
}

// Month comparison data
export interface MonthComparison {
  currentMonth: MonthlyStats;
  previousMonth?: MonthlyStats;
  percentageChange: number;
  insights: string[];
}

// AI-generated insight
export interface AIInsight {
  id: string;
  generatedAt: Date;
  type: 'spending_pattern' | 'recommendation' | 'alert' | 'summary';
  title: string;
  message: string;
  actionable: boolean;
  priority: 'low' | 'medium' | 'high';
}

// Filter and query options
export interface ExpenseFilters {
  startDate?: Date;
  endDate?: Date;
  categories?: ExpenseCategory[];
  minAmount?: number;
  maxAmount?: number;
  searchTerm?: string;
  paymentMethod?: PaymentMethod;
}

// Chart data format
export interface ChartData {
  labels: string[];
  values: number[];
  colors?: string[];
}

// Category metadata
export interface CategoryInfo {
  category: ExpenseCategory;
  label: string;
  icon: string;
  color: string;
  description: string;
}

// Predefined category information
export const CATEGORY_INFO: Record<ExpenseCategory, Omit<CategoryInfo, 'category'>> = {
  [ExpenseCategory.FOOD]: {
    label: 'Food & Dining',
    icon: '🍔',
    color: '#F59E0B',
    description: 'Restaurants, groceries, food delivery',
  },
  [ExpenseCategory.SHOPPING]: {
    label: 'Shopping',
    icon: '🛍️',
    color: '#EC4899',
    description: 'Clothes, electronics, online shopping',
  },
  [ExpenseCategory.TRAVEL]: {
    label: 'Travel & Transport',
    icon: '🚗',
    color: '#3B82F6',
    description: 'Fuel, public transport, taxi, flights',
  },
  [ExpenseCategory.BILLS]: {
    label: 'Bills & Utilities',
    icon: '💡',
    color: '#EF4444',
    description: 'Electricity, water, internet, phone',
  },
  [ExpenseCategory.ENTERTAINMENT]: {
    label: 'Entertainment',
    icon: '🎬',
    color: '#8B5CF6',
    description: 'Movies, concerts, subscriptions, games',
  },
  [ExpenseCategory.HEALTHCARE]: {
    label: 'Healthcare',
    icon: '⚕️',
    color: '#10B981',
    description: 'Medicines, doctor visits, health insurance',
  },
  [ExpenseCategory.EDUCATION]: {
    label: 'Education',
    icon: '📚',
    color: '#6366F1',
    description: 'Books, courses, tuition fees',
  },
  [ExpenseCategory.PERSONAL]: {
    label: 'Personal Care',
    icon: '💆',
    color: '#14B8A6',
    description: 'Salon, gym, wellness',
  },
  [ExpenseCategory.OTHER]: {
    label: 'Other',
    icon: '📦',
    color: '#6B7280',
    description: 'Miscellaneous expenses',
  },
};

// Export utility to get category info
export function getCategoryInfo(category: ExpenseCategory): CategoryInfo {
  return {
    category,
    ...CATEGORY_INFO[category],
  };
}

// Format currency (INR by default)
export function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Format date for display
export function formatDate(date: Date, format: 'short' | 'long' = 'short'): string {
  if (format === 'short') {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

// Get month name
export function getMonthName(month: number): string {
  const date = new Date(2000, month - 1, 1);
  return new Intl.DateTimeFormat('en-IN', { month: 'long' }).format(date);
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
