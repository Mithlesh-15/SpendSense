import type { Expense } from '../types/spendsense';

const now = new Date();

const isoDate = (offsetDays: number): string => {
  const day = new Date(now);
  day.setDate(now.getDate() - offsetDays);
  return day.toISOString().slice(0, 10);
};

export const mockExpenses: Expense[] = [
  { id: 'exp-1', amount: 42.5, category: 'Food', note: 'Lunch Bowl Co.', date: isoDate(1) },
  { id: 'exp-2', amount: 18.2, category: 'Travel', note: 'Metro Card Top-up', date: isoDate(2) },
  { id: 'exp-3', amount: 86.99, category: 'Shopping', note: 'Home supplies', date: isoDate(3) },
  { id: 'exp-4', amount: 120, category: 'Bills', note: 'Internet bill', date: isoDate(4) },
  { id: 'exp-5', amount: 24.99, category: 'Entertainment', note: 'Movie tickets', date: isoDate(6) },
  { id: 'exp-6', amount: 9.45, category: 'Food', note: 'Coffee stop', date: isoDate(7) },
  { id: 'exp-7', amount: 14.5, category: 'Travel', note: 'Ride share', date: isoDate(8) },
  { id: 'exp-8', amount: 33.4, category: 'Food', note: 'Grocery run', date: isoDate(10) },
  { id: 'exp-9', amount: 250, category: 'Bills', note: 'Rent contribution', date: isoDate(15) },
  { id: 'exp-10', amount: 55.8, category: 'Shopping', note: 'Weekly essentials', date: isoDate(21) },
  { id: 'exp-11', amount: 47.25, category: 'Food', note: 'Dinner at Green Plate', date: isoDate(33) },
  { id: 'exp-12', amount: 31.9, category: 'Entertainment', note: 'Streaming renewal', date: isoDate(36) },
  { id: 'exp-13', amount: 19.4, category: 'Travel', note: 'Gas refill', date: isoDate(40) },
  { id: 'exp-14', amount: 94.15, category: 'Shopping', note: 'Shoes', date: isoDate(45) },
  { id: 'exp-15', amount: 115, category: 'Bills', note: 'Electricity', date: isoDate(52) },
  { id: 'exp-16', amount: 27.8, category: 'Others', note: 'Gift wrap', date: isoDate(66) },
  { id: 'exp-17', amount: 61.2, category: 'Food', note: 'Weekend brunch', date: isoDate(72) },
  { id: 'exp-18', amount: 44, category: 'Travel', note: 'Train tickets', date: isoDate(79) },
];
