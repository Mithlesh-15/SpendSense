import type { ExtractedTransaction, ExpenseCategory } from '../types/spendsense';

const categories: ExpenseCategory[] = [
  'Food',
  'Shopping',
  'Travel',
  'Bills',
  'Entertainment',
  'Others',
];

export async function analyzeFileLocally(fileName: string): Promise<ExtractedTransaction[]> {
  await new Promise((resolve) => setTimeout(resolve, 1200));

  return [
    {
      date: new Date().toISOString().slice(0, 10),
      merchant: `${fileName} Market`,
      category: categories[Math.floor(Math.random() * categories.length)],
      amount: 18.75,
    },
    {
      date: new Date().toISOString().slice(0, 10),
      merchant: 'Metro Station',
      category: 'Travel',
      amount: 9.4,
    },
  ];
}
