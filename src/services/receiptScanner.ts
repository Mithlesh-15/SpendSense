import Tesseract from 'tesseract.js';
import { TextGeneration } from '@runanywhere/web-llamacpp';
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '../types/spendsense';
import { ensureLanguageModelReady } from './spendingAnalysis';

export interface ReceiptDraft {
  merchant: string;
  date: string;
  amount: number;
  category: ExpenseCategory;
  lineItems?: string[];
  rawText: string;
}

const jsonBlock = (text: string): string | null => {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
};

const parseReceiptJson = (text: string): { merchant: string; date: string; amount: number; lineItems?: string[] } => {
  const block = jsonBlock(text);
  if (!block) {
    throw new Error('Could not parse receipt details from OCR text.');
  }

  const parsed = JSON.parse(block) as {
    merchant?: string;
    date?: string;
    amount?: number | string;
    lineItems?: string[];
  };

  const merchant = (parsed.merchant ?? 'Unknown Merchant').trim();
  const date = parsed.date && !Number.isNaN(new Date(parsed.date).getTime())
    ? new Date(parsed.date).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const numericAmount = typeof parsed.amount === 'string'
    ? Number(parsed.amount.replace(/[^\d.]/g, ''))
    : Number(parsed.amount);
  const amount = Number.isFinite(numericAmount) && numericAmount > 0 ? numericAmount : 0;

  return {
    merchant,
    date,
    amount,
    lineItems: parsed.lineItems?.slice(0, 8) ?? [],
  };
};

const fallbackCategory = (merchant: string, rawText: string): ExpenseCategory => {
  const source = `${merchant} ${rawText}`.toLowerCase();
  if (/cafe|restaurant|swiggy|zomato|food|dine|kitchen/.test(source)) return 'Food';
  if (/uber|ola|metro|fuel|petrol|flight|travel|taxi/.test(source)) return 'Travel';
  if (/electric|water|internet|recharge|bill|utility|rent/.test(source)) return 'Bills';
  if (/movie|netflix|spotify|game|entertainment|cinema/.test(source)) return 'Entertainment';
  if (/amazon|flipkart|mart|store|shopping|mall/.test(source)) return 'Shopping';
  return 'Others';
};

const assignCategoryWithLLM = async (
  merchant: string,
  rawText: string,
): Promise<ExpenseCategory> => {
  const prompt = [
    'Classify this receipt into exactly one category.',
    `Allowed categories: ${EXPENSE_CATEGORIES.join(', ')}`,
    'Return only the category text.',
    `Merchant: ${merchant}`,
    `OCR Text: ${rawText.slice(0, 1500)}`,
  ].join('\n');

  const response = await TextGeneration.generate(prompt, {
    maxTokens: 10,
    temperature: 0,
  });

  const cleaned = (response.text ?? '').trim().replace(/[^\w\s]/g, '');
  const matched = EXPENSE_CATEGORIES.find(
    (category) => category.toLowerCase() === cleaned.toLowerCase(),
  );
  return matched ?? fallbackCategory(merchant, rawText);
};

export async function extractTextFromReceipt(
  imageFile: File,
  onProgress?: (value: number, status: string) => void,
): Promise<string> {
  const worker = await Tesseract.createWorker('eng', 1, {
    logger: (message) => {
      if (onProgress) {
        onProgress(message.progress ?? 0, message.status ?? 'processing');
      }
    },
    cacheMethod: 'write',
  });

  try {
    const { data } = await worker.recognize(imageFile);
    const text = (data.text ?? '').trim();
    if (!text) throw new Error('No readable text found in receipt image.');
    return text;
  } finally {
    await worker.terminate();
  }
}

export async function analyzeReceiptLocally(
  imageFile: File,
  onOcrProgress?: (value: number, status: string) => void,
): Promise<ReceiptDraft> {
  const rawText = await extractTextFromReceipt(imageFile, onOcrProgress);
  await ensureLanguageModelReady();

  const extractionPrompt = [
    'Extract structured receipt fields from OCR text.',
    'Return only valid JSON with keys:',
    'merchant (string), date (YYYY-MM-DD if available), amount (number), lineItems (string[] optional).',
    'Use best effort if fields are missing. Do not add extra keys.',
    `OCR_TEXT:\n${rawText.slice(0, 3500)}`,
  ].join('\n');

  const extractionResponse = await TextGeneration.generate(extractionPrompt, {
    maxTokens: 220,
    temperature: 0.1,
    topP: 0.9,
  });

  const parsed = parseReceiptJson(extractionResponse.text ?? '');
  const category = await assignCategoryWithLLM(parsed.merchant, rawText);

  return {
    merchant: parsed.merchant,
    date: parsed.date,
    amount: parsed.amount,
    category,
    lineItems: parsed.lineItems,
    rawText,
  };
}
