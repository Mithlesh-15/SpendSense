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
  merchantEstimated?: boolean;
  amountEstimated?: boolean;
}

interface ParsedReceiptPayload {
  merchant: string | null;
  date: string | null;
  amount: number | null;
  items: string[];
}

interface OcrPreprocessResult {
  original: string;
  normalized: string;
  normalizedLower: string;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

const devLog = (label: string, value: unknown) => {
  if (import.meta.env.DEV) {
    console.info(`[SpendSense][Receipt] ${label}`, value);
  }
};

const preprocessOcrText = (rawText: string): OcrPreprocessResult => {
  const normalized = rawText
    .replace(/[^\w\s₹.,:/\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return {
    original: rawText,
    normalized,
    normalizedLower: normalized.toLowerCase(),
  };
};

const parseCurrencyValue = (text: string): number | null => {
  const value = Number(text.replace(/[₹,\s]/g, ''));
  return Number.isFinite(value) ? value : null;
};

const detectAmountHeuristic = (processed: OcrPreprocessResult): number | null => {
  const lines = processed.original
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const amountRegex = /₹?\s?\d[\d,]*(?:\.\d{1,2})?/g;
  const keywordRegex = /(grand total|amount payable|amount due|net amount|total)\b/i;

  let keywordCandidates: number[] = [];
  const allCandidates: number[] = [];

  for (const line of lines) {
    const matches = line.match(amountRegex) ?? [];
    const values = matches
      .map(parseCurrencyValue)
      .filter((value): value is number => value !== null && value > 0);
    if (values.length === 0) continue;
    allCandidates.push(...values);
    if (keywordRegex.test(line)) {
      keywordCandidates.push(...values);
    }
  }

  if (keywordCandidates.length > 0) {
    return Math.max(...keywordCandidates);
  }
  if (allCandidates.length > 0) {
    return Math.max(...allCandidates);
  }
  return null;
};

const detectMerchantHeuristic = (processed: OcrPreprocessResult): string | null => {
  const blocked = /(total|invoice|tax|gst|qty|price|amount|subtotal|bill|receipt)/i;
  const lines = processed.original
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (blocked.test(line)) continue;
    if (/\d/.test(line)) continue;
    if (line.length < 3) continue;
    const uppercaseChars = line.replace(/[^A-Z]/g, '').length;
    if (uppercaseChars >= 2 || /^[A-Z][A-Za-z&.\-\s]{2,}$/.test(line)) {
      return line.replace(/\s+/g, ' ').trim();
    }
  }

  return lines[0]?.slice(0, 60) ?? null;
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

  try {
    const response = await TextGeneration.generate(prompt, {
      maxTokens: 10,
      temperature: 0,
    });
    const cleaned = (response.text ?? '').trim().replace(/[^\w\s]/g, '');
    const matched = EXPENSE_CATEGORIES.find(
      (category) => category.toLowerCase() === cleaned.toLowerCase(),
    );
    return matched ?? fallbackCategory(merchant, rawText);
  } catch {
    return fallbackCategory(merchant, rawText);
  }
};

const extractFirstJsonObject = (text: string): string | null => {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    if (text[i] === '}') depth -= 1;
    if (depth === 0) return text.slice(start, i + 1);
  }
  return null;
};

const cleanJsonCandidate = (raw: string): string => {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/```json/gi, '').replace(/```/g, '').trim();

  const objectText = extractFirstJsonObject(cleaned);
  if (objectText) cleaned = objectText;

  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
  return cleaned;
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^\d.]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const validateReceiptPayload = (input: unknown): ParsedReceiptPayload => {
  if (!input || typeof input !== 'object') {
    throw new Error('Receipt detected but data could not be structured properly.');
  }

  const parsed = input as {
    merchant?: unknown;
    date?: unknown;
    amount?: unknown;
    items?: unknown;
    lineItems?: unknown;
  };

  const merchant = parsed.merchant == null ? null : String(parsed.merchant).trim();
  const date = parsed.date == null ? null : String(parsed.date).trim();
  const amount = toNumber(parsed.amount);

  const rawItems = Array.isArray(parsed.items)
    ? parsed.items
    : Array.isArray(parsed.lineItems)
      ? parsed.lineItems
      : [];
  const items = rawItems.map((item) => String(item).trim()).filter(Boolean).slice(0, 8);

  if (merchant !== null && typeof merchant !== 'string') {
    throw new Error('Receipt detected but data could not be structured properly.');
  }
  if (date !== null && typeof date !== 'string') {
    throw new Error('Receipt detected but data could not be structured properly.');
  }
  if (amount !== null && typeof amount !== 'number') {
    throw new Error('Receipt detected but data could not be structured properly.');
  }
  if (!Array.isArray(items)) {
    throw new Error('Receipt detected but data could not be structured properly.');
  }

  return {
    merchant,
    date,
    amount,
    items,
  };
};

const parseReceiptResponse = (rawResponse: string): ParsedReceiptPayload => {
  const attempts = [rawResponse, cleanJsonCandidate(rawResponse)];

  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt);
      return validateReceiptPayload(parsed);
    } catch {
      // continue
    }
  }

  throw new Error('Receipt detected but data could not be structured properly.');
};

const fallbackExtractFromOcr = (processed: OcrPreprocessResult): ParsedReceiptPayload => {
  const merchant = detectMerchantHeuristic(processed);
  const amount = detectAmountHeuristic(processed);
  const dateMatch = processed.original.match(
    /\b(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/,
  );
  const date = dateMatch ? dateMatch[1].replace(/\//g, '-') : null;

  return { merchant, date, amount, items: [] };
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
  const processed = preprocessOcrText(rawText);
  devLog('Raw OCR text', rawText);

  const heuristicMerchant = detectMerchantHeuristic(processed);
  const heuristicAmount = detectAmountHeuristic(processed);
  devLog('Heuristic merchant', heuristicMerchant);
  devLog('Heuristic amount', heuristicAmount);

  await ensureLanguageModelReady();

  const extractionPrompt = [
    'Extract receipt fields from OCR text.',
    'Return ONLY valid JSON.',
    'Do NOT include explanations.',
    'Do NOT include markdown formatting.',
    'Do NOT wrap JSON in backticks.',
    'Do NOT add trailing commas.',
    'Output must be a single JSON object.',
    'If data is missing, return null instead of guessing.',
    'JSON schema:',
    '{"merchant": string|null, "date": string|null, "amount": number|null, "items": string[]}',
    `OCR_TEXT:\n${processed.normalized.slice(0, 3500)}`,
  ].join('\n');

  let parsed: ParsedReceiptPayload;
  try {
    const extractionResponse = await TextGeneration.generate(extractionPrompt, {
      maxTokens: 220,
      temperature: 0,
      topP: 0.9,
    });

    const rawLLM = extractionResponse.text ?? '';
    devLog('Raw LLM response', rawLLM);
    const cleaned = cleanJsonCandidate(rawLLM);
    devLog('Cleaned LLM response', cleaned);
    parsed = parseReceiptResponse(rawLLM);
  } catch (error) {
    devLog('LLM parse failed, applying OCR fallback', error);
    parsed = fallbackExtractFromOcr(processed);
  }

  let merchant = (parsed.merchant ?? '').trim();
  let amount = parsed.amount ?? 0;
  let merchantEstimated = false;
  let amountEstimated = false;

  if (!merchant) {
    merchant = heuristicMerchant ?? 'Unknown Merchant';
    merchantEstimated = true;
  }

  if (!amount || amount <= 0) {
    amount = heuristicAmount ?? 0;
    amountEstimated = true;
  }

  if (!merchant || merchant === 'Unknown Merchant') merchantEstimated = true;
  if (!amount || amount <= 0) amountEstimated = true;

  const date = parsed.date && !Number.isNaN(new Date(parsed.date).getTime())
    ? new Date(parsed.date).toISOString().slice(0, 10)
    : todayISO();
  const lineItems = parsed.items ?? [];
  const category = await assignCategoryWithLLM(merchant, rawText);

  return {
    merchant,
    date,
    amount,
    category,
    lineItems,
    rawText,
    merchantEstimated,
    amountEstimated,
  };
}
